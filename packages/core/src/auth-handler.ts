import { extractSiweDomain } from "@talak-web3/auth";
import { TalakWeb3Error, CONFIG_ERROR_CODES } from "@talak-web3/errors";
import {
  InMemoryRateLimiter,
  RedisRateLimiter,
  normalizeIpForRateLimit,
  type RateLimiter,
} from "@talak-web3/rate-limit";
import type { TalakWeb3Auth } from "@talak-web3/types";
import type { TalakWeb3Context, TalakWeb3Instance } from "@talak-web3/types";
import type Redis from "ioredis";

import {
  appendAuthCookies,
  appendClearAuthCookies,
  getAccessTokenFromRequest,
  getJwtExp,
  getRefreshTokenFromRequest,
} from "./auth-cookies.js";
import { runPluginAfterHooks, runPluginBeforeHooks } from "./plugin-pipeline.js";
import { runWithRequestStateAsync } from "./request-state.js";
import {
  getShouldSkipSessionRefresh,
  resetShouldSkipSessionRefresh,
} from "./should-session-refresh.js";

function getEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

export interface AuthHandlerOptions {
  /**
   * Base path for auth routes.
   * @default "/api/auth"
   */
  basePath?: string;
  /**
   * When true (default when `TRUST_PROXY=true` or `TRUSTED_PROXIES` is set),
   * honor `X-Forwarded-For` / `X-Real-IP`. Otherwise client IP is `"unknown"`.
   */
  trustProxy?: boolean;
  /**
   * Optional rate limiters for auth endpoints. Defaults to process-local
   * in-memory limiters (not multi-instance safe). Prefer Redis-backed
   * limiters from `@talak-web3/rate-limit` in production.
   */
  rateLimiters?: Partial<{
    nonce: RateLimiter;
    login: RateLimiter;
    refresh: RateLimiter;
    logout: RateLimiter;
  }>;
  /**
   * Optional Redis (ioredis) client for distributed auth rate limiting.
   * When set, defaults to Redis sliding-window limiters for all auth routes.
   */
  redis?: Redis;
  /**
   * When true (or REQUIRE_REDIS_RATE_LIMIT=true) and NODE_ENV=production,
   * refuse to start without Redis-backed rate limiters.
   */
  requireRedisRateLimit?: boolean;
}

type AuthRouteHandler = (
  request: Request,
  auth: TalakWeb3Auth,
  ctx: TalakWeb3Context,
  options: ResolvedAuthHandlerOptions,
) => Promise<Response>;

type ResolvedAuthHandlerOptions = {
  trustProxy: boolean;
  rateLimiters: {
    nonce: RateLimiter;
    login: RateLimiter;
    refresh: RateLimiter;
    logout: RateLimiter;
  };
};

const SESSION_REFRESH_THRESHOLD_SECONDS = 5 * 60;
const MAX_AUTH_BODY_SIZE = 1024;

function memoryRateLimiters(): ResolvedAuthHandlerOptions["rateLimiters"] {
  return {
    nonce: new InMemoryRateLimiter({ capacity: 20, refillPerSecond: 0.33 }),
    login: new InMemoryRateLimiter({ capacity: 10, refillPerSecond: 0.17 }),
    refresh: new InMemoryRateLimiter({ capacity: 15, refillPerSecond: 0.25 }),
    logout: new InMemoryRateLimiter({ capacity: 30, refillPerSecond: 0.5 }),
  };
}

function redisRateLimiters(redis: Redis): ResolvedAuthHandlerOptions["rateLimiters"] {
  // Sliding window: capacity roughly matches prior token-bucket burst sizes.
  const windowMs = 60_000;
  return {
    nonce: new RedisRateLimiter(redis, { capacity: 20, windowMs }),
    login: new RedisRateLimiter(redis, { capacity: 10, windowMs }),
    refresh: new RedisRateLimiter(redis, { capacity: 15, windowMs }),
    logout: new RedisRateLimiter(redis, { capacity: 30, windowMs }),
  };
}

function resolveDefaultRateLimiters(
  options: AuthHandlerOptions,
): ResolvedAuthHandlerOptions["rateLimiters"] {
  const isProduction = getEnv("NODE_ENV") === "production";
  const requireRedis =
    options.requireRedisRateLimit === true ||
    getEnv("REQUIRE_REDIS_RATE_LIMIT") === "true" ||
    getEnv("REQUIRE_REDIS_RATE_LIMIT") === "1";

  if (options.redis) {
    return redisRateLimiters(options.redis);
  }

  if (isProduction && !options.redis) {
    if (requireRedis) {
      throw new TalakWeb3Error(
        "Production requires Redis-backed auth rate limiters. Pass AuthHandlerOptions.redis or set REQUIRE_REDIS_RATE_LIMIT=false only if you accept process-local limits.",
        { code: CONFIG_ERROR_CODES.INVALID, status: 500 },
      );
    }
    console.warn(
      "[talak-web3] createAuthHandler using InMemoryRateLimiter in production — not multi-instance safe. Pass redis or set REDIS-backed rateLimiters.",
    );
  }

  return memoryRateLimiters();
}

function resolveTrustProxy(options: AuthHandlerOptions): boolean {
  if (options.trustProxy !== undefined) return options.trustProxy;
  if (getEnv("TRUST_PROXY") === "true" || getEnv("TRUST_PROXY") === "1") return true;
  if (getEnv("TRUSTED_PROXIES") && getEnv("TRUSTED_PROXIES")!.trim().length > 0) {
    return true;
  }
  return false;
}

async function checkRateLimit(
  request: Request,
  endpoint: keyof ResolvedAuthHandlerOptions["rateLimiters"],
  options: ResolvedAuthHandlerOptions,
): Promise<Response | null> {
  const context = getRequestContext(request, options.trustProxy);
  const key = `${endpoint}:${normalizeIpForRateLimit(context.ip)}`;
  const result = await options.rateLimiters[endpoint].check(key);
  if (!result.allowed) {
    const retryAfter = Math.ceil(((result.resetAt ?? Date.now()) - Date.now()) / 1000);
    return jsonResponse({ error: "Too Many Requests", code: "RATE_LIMIT_EXCEEDED" }, 429, {
      "Retry-After": String(Math.max(1, retryAfter)),
      "X-RateLimit-Reset": String(Math.ceil((result.resetAt ?? Date.now()) / 1000)),
    });
  }
  return null;
}

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("content-type")) {
    responseHeaders.set("content-type", "application/json");
  }
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function errorResponse(err: unknown): Response {
  if (err instanceof TalakWeb3Error) {
    return jsonResponse(
      {
        error: err.message,
        code: err.code,
        ...(err.data !== undefined ? { data: err.data } : {}),
      },
      err.status,
    );
  }

  return jsonResponse({ error: "Internal Server Error" }, 500);
}

/**
 * Resolve client IP. Forwarded headers are only used when `trustProxy` is true
 * (via options or TRUST_PROXY / TRUSTED_PROXIES env). Prevents XFF spoofing.
 */
export function getRequestContext(
  request: Request,
  trustProxy = false,
): { ip: string; userAgent: string } {
  let ip = "unknown";
  if (trustProxy) {
    ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
  }
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return { ip, userAgent };
}

function getAuthTtls(ctx: TalakWeb3Context): {
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
} {
  const authConfig = ctx.config.auth ?? {};
  if ("generateNonce" in authConfig) {
    return {
      accessTtlSeconds: 15 * 60,
      refreshTtlSeconds: 7 * 24 * 60 * 60,
    };
  }
  return {
    accessTtlSeconds: authConfig.accessTtlSeconds ?? 15 * 60,
    refreshTtlSeconds: authConfig.refreshTtlSeconds ?? 7 * 24 * 60 * 60,
  };
}

function withAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
  ctx: TalakWeb3Context,
): Response {
  const headers = new Headers(response.headers);
  const ttls = getAuthTtls(ctx);
  appendAuthCookies(headers, tokens, ttls);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readJsonBody<T extends Record<string, unknown>>(
  request: Request,
): Promise<T | null> {
  try {
    const body = await request.text();
    if (body.length > MAX_AUTH_BODY_SIZE) {
      return null;
    }
    const parsed = JSON.parse(body) as T;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const handleNonce: AuthRouteHandler = async (request, auth, _ctx, options) => {
  const rateLimitResponse = await checkRateLimit(request, "nonce", options);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await readJsonBody<{ address?: string }>(request);
  const address = body?.address;

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return jsonResponse({ error: "Invalid address" }, 400);
  }

  const context = getRequestContext(request, options.trustProxy);
  const nonce = await auth.createNonce(address, {
    ip: context.ip,
    ...(context.userAgent ? { ua: context.userAgent } : {}),
  });

  return jsonResponse({ nonce });
};

const handleLogin: AuthRouteHandler = async (request, auth, ctx, options) => {
  const rateLimitResponse = await checkRateLimit(request, "login", options);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await readJsonBody<{ message?: string; signature?: string }>(request);
  const message = body?.message;
  const signature = body?.signature;

  if (!message || !signature || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
  const requireBrowserOrigin =
    getEnv("NODE_ENV") === "production" || getEnv("REQUIRE_SIWE_ORIGIN") === "true";

  if (!requestOrigin && requireBrowserOrigin && request.headers.get("sec-fetch-mode")) {
    return jsonResponse(
      {
        error: "Origin header required for browser login",
        code: "AUTH_ORIGIN_REQUIRED",
      },
      403,
    );
  }

  if (requestOrigin) {
    try {
      const originUrl = new URL(requestOrigin);
      const siweDomain = extractSiweDomain(message);

      if (!siweDomain) {
        return jsonResponse(
          { error: "Invalid SIWE message format", code: "AUTH_SIWE_PARSE_ERROR" },
          400,
        );
      }

      if (originUrl.hostname !== siweDomain.split(":")[0]) {
        return jsonResponse(
          {
            error: "Domain-origin mismatch",
            code: "AUTH_DOMAIN_MISMATCH",
            message: "The SIWE message domain does not match the request origin",
          },
          403,
        );
      }
    } catch {
      ctx.logger.debug(
        "[talak-web3] Failed to parse Origin header for domain-origin validation",
        requestOrigin,
      );
    }
  }

  const context = getRequestContext(request, options.trustProxy);
  const result = await auth.loginWithSiwe(message, signature, context);
  return withAuthCookies(jsonResponse(result), result, ctx);
};

const handleRefresh: AuthRouteHandler = async (request, auth, ctx, options) => {
  const rateLimitResponse = await checkRateLimit(request, "refresh", options);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await readJsonBody<{ refreshToken?: string }>(request);
  const refreshToken = body?.refreshToken ?? getRefreshTokenFromRequest(request);

  if (!refreshToken || refreshToken.length < 20) {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const context = getRequestContext(request, options.trustProxy);
  const result = await auth.refresh(refreshToken, context);
  return withAuthCookies(jsonResponse(result), result, ctx);
};

const handleLogout: AuthRouteHandler = async (request, auth, _ctx, options) => {
  const rateLimitResponse = await checkRateLimit(request, "logout", options);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await readJsonBody<{ refreshToken?: string }>(request);
  const refreshToken = body?.refreshToken ?? getRefreshTokenFromRequest(request) ?? undefined;
  const accessToken = getAccessTokenFromRequest(request) ?? "";

  await auth.revokeSession(accessToken, refreshToken);

  const headers = new Headers({ "content-type": "application/json" });
  appendClearAuthCookies(headers);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

const handleVerify: AuthRouteHandler = async (request, auth, _ctx, options) => {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return jsonResponse({ ok: false }, 401);
  }

  try {
    const context = getRequestContext(request, options.trustProxy);
    const payload = await auth.verifySession(token, context);
    return jsonResponse({ ok: true, payload });
  } catch {
    return jsonResponse({ ok: false }, 401);
  }
};

const handleSession: AuthRouteHandler = async (request, auth, ctx, options) => {
  const accessToken = getAccessTokenFromRequest(request);
  const refreshToken = getRefreshTokenFromRequest(request);
  const context = getRequestContext(request, options.trustProxy);

  if (!accessToken && !refreshToken) {
    return jsonResponse({ address: null, chainId: null, isAuthenticated: false });
  }

  if (accessToken) {
    try {
      const payload = await auth.verifySession(accessToken, context);
      const exp = getJwtExp(accessToken);
      const now = Math.floor(Date.now() / 1000);
      const needsRefresh =
        exp !== null && exp - now <= SESSION_REFRESH_THRESHOLD_SECONDS && !!refreshToken;

      if (needsRefresh && !getShouldSkipSessionRefresh() && refreshToken) {
        const refreshed = await auth.refresh(refreshToken, context);
        const response = jsonResponse({
          address: payload.address,
          chainId: payload.chainId,
          isAuthenticated: true,
          needsRefresh: false,
        });
        return withAuthCookies(response, refreshed, ctx);
      }

      return jsonResponse({
        address: payload.address,
        chainId: payload.chainId,
        isAuthenticated: true,
        needsRefresh: needsRefresh && getShouldSkipSessionRefresh(),
      });
    } catch {
      if (!refreshToken || getShouldSkipSessionRefresh()) {
        return jsonResponse({ address: null, chainId: null, isAuthenticated: false });
      }
    }
  }

  if (refreshToken && !getShouldSkipSessionRefresh()) {
    try {
      const refreshed = await auth.refresh(refreshToken, context);
      const payload = await auth.verifySession(refreshed.accessToken, context);
      const response = jsonResponse({
        address: payload.address,
        chainId: payload.chainId,
        isAuthenticated: true,
        needsRefresh: false,
      });
      return withAuthCookies(response, refreshed, ctx);
    } catch {
      return jsonResponse({ address: null, chainId: null, isAuthenticated: false });
    }
  }

  return jsonResponse({ address: null, chainId: null, isAuthenticated: false });
};

const handleJwks: AuthRouteHandler = async (_request, auth) => {
  const jwks = await auth.getJwks();
  return jsonResponse(jwks);
};

const routes: Record<string, Partial<Record<string, AuthRouteHandler>>> = {
  "/nonce": { POST: handleNonce },
  "/login": { POST: handleLogin },
  "/logout": { POST: handleLogout },
  "/refresh": { POST: handleRefresh },
  "/verify": { GET: handleVerify, POST: handleVerify },
  "/session": { GET: handleSession },
  "/jwks": { GET: handleJwks },
};

function normalizeRoute(pathname: string, basePath: string): string | null {
  if (!pathname.startsWith(basePath)) return null;
  const route = pathname.slice(basePath.length) || "/";
  return route.endsWith("/") && route.length > 1 ? route.slice(0, -1) : route;
}

async function dispatchRoute(
  route: string,
  method: string,
  request: Request,
  auth: TalakWeb3Auth,
  ctx: TalakWeb3Context,
  options: ResolvedAuthHandlerOptions,
): Promise<Response> {
  const routeHandlers = routes[route];
  if (!routeHandlers) {
    return new Response("Not Found", { status: 404 });
  }

  const handler = routeHandlers[method];
  if (!handler) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    return await handler(request, auth, ctx, options);
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Creates a framework-agnostic auth HTTP handler for talak-web3.
 *
 * Routes (relative to basePath, default `/api/auth`):
 * - POST /nonce
 * - POST /login
 * - POST /logout
 * - POST /refresh
 * - GET|POST /verify
 * - GET /session
 * - GET /jwks
 */
export function createAuthHandler(
  instance: TalakWeb3Instance,
  options: AuthHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const basePath = options.basePath ?? "/api/auth";
  const { context } = instance;
  const { auth } = context;
  const defaults = resolveDefaultRateLimiters(options);
  const resolved: ResolvedAuthHandlerOptions = {
    trustProxy: resolveTrustProxy(options),
    rateLimiters: {
      nonce: options.rateLimiters?.nonce ?? defaults.nonce,
      login: options.rateLimiters?.login ?? defaults.login,
      refresh: options.rateLimiters?.refresh ?? defaults.refresh,
      logout: options.rateLimiters?.logout ?? defaults.logout,
    },
  };

  return async (request: Request): Promise<Response> => {
    return runWithRequestStateAsync(async () => {
      resetShouldSkipSessionRefresh();
      await runPluginBeforeHooks(context.plugins.values(), request, context);

      const route = normalizeRoute(new URL(request.url).pathname, basePath);
      let response: Response;

      if (!route) {
        response = new Response("Not Found", { status: 404 });
      } else {
        response = await dispatchRoute(route, request.method, request, auth, context, resolved);
      }

      await runPluginAfterHooks(context.plugins.values(), response, context);
      return response;
    });
  };
}
