import crypto from "node:crypto";

import { serve } from "@hono/node-server";
import { TalakWeb3Auth } from "@talak-web3/auth";
import type { KeyProviderType } from "@talak-web3/auth";
import { talakWeb3 } from "@talak-web3/core";
import { TalakWeb3Error } from "@talak-web3/errors";
import type { TalakWeb3Instance, TalakWeb3Context } from "@talak-web3/types";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { createClient, type RedisClientType } from "redis";
import { z } from "zod";

import { logger, requestLogger, getLogger } from "./logger.js";
import { AdaptiveRateLimiter, DEFAULT_ADAPTIVE_CONFIG } from "./security/adaptive-rate-limit.js";
import { ImmutableAuditLogger } from "./security/audit-logger.js";
import { authMiddleware } from "./security/authMiddleware.js";
import { strictCors } from "./security/cors.js";
import { csrfProtection } from "./security/csrf.js";
import { validateEnv } from "./security/env.js";
import { IncidentResponseManager } from "./security/incident-response.js";
import { createJwksEndpoint } from "./security/jwks-endpoint.js";
import { PolicyEngine } from "./security/policy-engine.js";
import { PriorityRequestQueue, RequestPriority } from "./security/priority-queue.js";
import { PrometheusMetrics, createMetricsMiddleware } from "./security/prometheus-metrics.js";
import { createHardenedRedisClient, RedisSecurityAuditor } from "./security/redis-hardening.js";
import { RedisRevocationStore } from "./security/redis-revocation.js";
import "./metrics.js";
import {
  ElasticsearchSink,
  SplunkSink,
  type SecurityEventSink,
  type SecurityEventType,
  type SecuritySeverity,
} from "./security/security-events.js";
import { RedisAuthStorage } from "./security/storage.js";

try {
  validateEnv();
} catch (err) {
  console.error("[CRITICAL] Startup failed: Environment validation error");
  console.error(err);
  process.exit(1);
}

const app = new Hono();

const redisUrl = process.env["REDIS_URL"]!;
const redisHardeningConfig: Parameters<typeof createHardenedRedisClient>[1] = {
  auth: {
    enabled: process.env["REDIS_AUTH_ENABLED"] !== "false",
    ...(process.env["REDIS_PASSWORD"] !== undefined && {
      password: process.env["REDIS_PASSWORD"]!,
    }),
  },
  tls: {
    enabled: process.env["REDIS_TLS_ENABLED"] !== "false",
    ...(process.env["REDIS_TLS_CERT_PATH"] !== undefined && {
      certPath: process.env["REDIS_TLS_CERT_PATH"]!,
    }),
    ...(process.env["REDIS_TLS_KEY_PATH"] !== undefined && {
      keyPath: process.env["REDIS_TLS_KEY_PATH"]!,
    }),
    ...(process.env["REDIS_TLS_CA_PATH"] !== undefined && {
      caPath: process.env["REDIS_TLS_CA_PATH"]!,
    }),
  },
  connectionLimits: {
    maxConnections: parseInt(process.env["REDIS_MAX_CONNECTIONS"] ?? "100"),
    maxRetriesPerRequest: parseInt(process.env["REDIS_MAX_RETRIES"] ?? "3"),
    retryDelayOnFailover: parseInt(process.env["REDIS_RETRY_DELAY"] ?? "100"),
    enableOfflineQueue: false,
  },
  databases: {
    nonceDb: parseInt(process.env["REDIS_DB_NONCE"] ?? "0"),
    sessionDb: parseInt(process.env["REDIS_DB_SESSION"] ?? "1"),
    rateLimitDb: parseInt(process.env["REDIS_DB_RATELIMIT"] ?? "2"),
    auditDb: parseInt(process.env["REDIS_DB_AUDIT"] ?? "3"),
  },
};

const redis = createClient(createHardenedRedisClient(redisUrl, redisHardeningConfig));

const redisAuthUrl = process.env["REDIS_AUTH_URL"] ?? redisUrl;
const redisRateLimitUrl = process.env["REDIS_RATELIMIT_URL"] ?? redisUrl;
const redisAuditUrl = process.env["REDIS_AUDIT_URL"] ?? redisUrl;

const redisAuth = createClient(createHardenedRedisClient(redisAuthUrl, redisHardeningConfig));
const redisRateLimit = createClient(
  createHardenedRedisClient(redisRateLimitUrl, redisHardeningConfig),
);
const redisAudit = createClient(createHardenedRedisClient(redisAuditUrl, redisHardeningConfig));

[redis, redisAuth, redisRateLimit, redisAudit].forEach((client, idx) => {
  client.on("error", (err) => {
    logger.error({ err, clientIdx: idx }, "redis cluster error");
    process.exit(1);
  });
});

try {
  await Promise.all([
    redis.connect(),
    redisAuth.connect(),
    redisRateLimit.connect(),
    redisAudit.connect(),
  ]);
  console.log("[BOOTSTRAP] All Redis clusters connected: OK");

  const auditor = new RedisSecurityAuditor(redis as RedisClientType);
  const audit = await auditor.auditSecurity();

  if (audit.status === "critical") {
    console.error("[CRITICAL] Redis security issues detected:", audit.issues);
    console.error("[CRITICAL] Recommendations:", audit.recommendations);
    process.exit(1);
  } else if (audit.status === "warning") {
    console.warn("[WARNING] Redis security warnings:", audit.issues);
    console.warn("[WARNING] Recommendations:", audit.recommendations);
  }

  if (process.env["NODE_ENV"] === "production") {
    await Promise.all([
      auditor.applySecurityHardening(),
      new RedisSecurityAuditor(redisAuth as RedisClientType).applySecurityHardening(),
      new RedisSecurityAuditor(redisRateLimit as RedisClientType).applySecurityHardening(),
      new RedisSecurityAuditor(redisAudit as RedisClientType).applySecurityHardening(),
    ]);
  }
} catch {
  console.error("[CRITICAL] Could not connect to Redis clusters at startup. Exiting.");
  process.exit(1);
}

const metrics = new PrometheusMetrics();
const incidentResponse = new IncidentResponseManager();
const rateLimiter = new AdaptiveRateLimiter(
  redisRateLimit as RedisClientType,
  DEFAULT_ADAPTIVE_CONFIG,
);

interface SecurityEventInput {
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  details?: Record<string, unknown>;
  ip?: string;
  wallet?: string;
  sessionId?: string;
}

async function broadcastSecurityEvent(event: SecurityEventInput) {
  const fullEvent = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type: event.type,
    severity: event.severity,
    source: event.source,
    details: event.details ?? {},
    metadata: {
      ...(event.ip !== undefined && { ip: event.ip }),
      ...(event.wallet !== undefined && { wallet: event.wallet }),
      ...(event.sessionId !== undefined && { sessionId: event.sessionId }),
      environment: process.env["NODE_ENV"] ?? "development",
    },
  };

  logger.info({ securityEvent: fullEvent }, "Security event generated");

  metrics.recordSecurityEvent(fullEvent.type, fullEvent.severity);

  Promise.allSettled(securityEventSinks.map((sink) => sink.send(fullEvent))).catch((err) => {
    logger.error({ err }, "Failed to forward security events to some sinks");
  });

  if (fullEvent.severity === "critical") {
    await incidentResponse.createIncident({
      type: "security_misconfiguration",
      severity: "critical",
      description: `Automated security event trigger: ${fullEvent.type}`,
      affectedSystems: ["hono-backend"],
      containmentActions: [],
      recoveryActions: [],
      postMortemRequired: true,
      metadata: fullEvent.metadata,
    });
  }
}

const securityEventSinks: SecurityEventSink[] = [];
if (process.env["ELASTICSEARCH_URL"]) {
  securityEventSinks.push(
    new ElasticsearchSink({
      url: process.env["ELASTICSEARCH_URL"]!,
      index: process.env["ELASTICSEARCH_INDEX"] ?? "security-events",
      ...(process.env["ELASTICSEARCH_API_KEY"] !== undefined && {
        apiKey: process.env["ELASTICSEARCH_API_KEY"]!,
      }),
    }),
  );
}
if (process.env["SPLUNK_URL"]) {
  securityEventSinks.push(
    new SplunkSink({
      url: process.env["SPLUNK_URL"]!,
      token: process.env["SPLUNK_TOKEN"]!,
    }),
  );
}

const storage = new RedisAuthStorage(redisAuth as RedisClientType, true);
const revocationStore = new RedisRevocationStore(redisAuth as RedisClientType, {
  keyPrefix: "talak:jti:",
});

const keyProviderType = process.env["KEY_PROVIDER_TYPE"] ?? ("environment" as KeyProviderType);
const keyProviderOptions = {
  keyId: process.env["AWS_KMS_KEY_ID"] ?? undefined,
  region: process.env["AWS_REGION"] ?? undefined,
  vaultUrl: process.env["VAULT_URL"] ?? undefined,
  secretPath: process.env["VAULT_SECRET_PATH"] ?? undefined,
  token: process.env["VAULT_TOKEN"] ?? undefined,
};

const auth = new TalakWeb3Auth({
  expectedDomain: process.env["SIWE_DOMAIN"]!,
  nonceStore: storage.nonceStore,
  refreshStore: storage.refreshStore,
  revocationStore,
  keyProviderType: keyProviderType as KeyProviderType,
  keyProviderOptions,
  keyRotationConfig: {
    maxKeys: parseInt(process.env["JWT_MAX_KEYS"] ?? "5"),
    gracePeriodMs: parseInt(process.env["JWT_GRACE_PERIOD_MS"] ?? "604800000"),
    rotationIntervalMs: parseInt(process.env["JWT_ROTATION_INTERVAL_MS"] ?? "2592000000"),
  },
});

const configuredChains = (process.env["SUPPORTED_CHAINS"] ?? "1")
  .split(",")
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !isNaN(id));

const talak = talakWeb3({
  auth,
  chains: configuredChains.map((id) => ({
    id,
    rpcUrls: (process.env[`RPC_URL_${id}`] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  })),
});

const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  logger.warn("ALLOWED_ORIGINS is not set — all cross-origin requests will be rejected");
}

app.use("*", async (c, next) => {
  const ip = getIp(c);
  const log = getLogger(c);
  const path = c.req.path;

  let type: "auth" | "nonce" | "global" | "rpc" = "global";
  if (path.includes("/auth")) type = "auth";
  if (path.includes("/rpc")) type = "rpc";
  if (path.includes("/nonce")) type = "nonce";

  const ua = c.req.header("User-Agent");
  const result = await rateLimiter.checkRateLimit({
    type,
    ip,
    ...(ua !== undefined && { userAgent: ua }),
  });

  if (!result.allowed) {
    log.warn({ ip, path, penalties: result.penalties }, "adaptive rate limit hit");
    metrics.recordRateLimitHit(type, result.penalties?.[0] ?? "unknown");

    if (result.riskScore && result.riskScore > 0.5) {
      await broadcastSecurityEvent({
        type: "rate_limit_hit",
        severity: result.riskScore > 0.8 ? "high" : "medium",
        source: "middleware/ratelimit",
        details: { path, penalties: result.penalties, riskScore: result.riskScore },
        ip,
      });
    }

    return c.json(
      {
        error: "Too many requests",
        retryAfter: result.resetTime,
        riskScore: result.riskScore,
      },
      429,
    );
  }

  await next();
});

app.use("*", async (c, next) => {
  c.set("talak", talak);
  await next();
});

app.use("*", requestLogger());

app.use(
  "*",
  secureHeaders({
    strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",

    xContentTypeOptions: "nosniff",

    xFrameOptions: "DENY",

    xXssProtection: "0",

    contentSecurityPolicy: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }),
);

app.use("*", createMetricsMiddleware(metrics));

app.use("*", csrfProtection());

app.use("*", strictCors({ allowedOrigins }));

const priorityQueue = new PriorityRequestQueue({
  concurrency: {
    [RequestPriority.CRITICAL]: 200,
    [RequestPriority.HIGH]: 100,
    [RequestPriority.NORMAL]: 50,
    [RequestPriority.LOW]: 20,
    [RequestPriority.BACKGROUND]: 10,
  },
  maxQueueSize: 500,
  timeout: 30000,
});

app.use("*", priorityQueue.createMiddleware());

const policyEngine = new PolicyEngine();
app.use("*", policyEngine.createMiddleware());

const auditLogger = new ImmutableAuditLogger({
  storage: {
    type: "redis",
    redis: redisAudit as RedisClientType,
  },
});
app.use("*", auditLogger.createMiddleware());

app.use("*", async (c, next) => {
  const len = c.req.header("content-length");
  if (len && Number(len) > 1_000_000) {
    return c.json({ error: "Request body too large" }, 413);
  }
  await next();
});

app.onError((err, c) => {
  const log = getLogger(c);
  if (err instanceof TalakWeb3Error) {
    return c.json({ error: err.message, code: err.code }, err.status as ContentfulStatusCode);
  }
  log.error({ err }, "unhandled error");
  return c.json({ error: "Internal Server Error" }, 500);
});

import type { Context } from "hono";

const TRUSTED_PROXY_RANGES = process.env["TRUSTED_PROXY_RANGES"]
  ? process.env["TRUSTED_PROXY_RANGES"].split(",")
  : [
      "173.245.48.0/20",
      "103.21.244.0/22",
      "103.22.200.0/22",
      "104.16.0.0/13",
      "104.24.0.0/14",
      "131.0.72.0/22",
      "141.101.64.0/18",
      "162.158.0.0/15",
      "172.64.0.0/13",
      "173.245.48.0/20",
      "188.114.96.0/20",
      "190.93.240.0/20",
      "197.234.240.0/22",
      "198.41.128.0/17",

      "127.0.0.1",
      "::1",
    ];

function isIpInRange(ip: string, range: string): boolean {
  if (ip === range) return true;

  if (!range.includes("/")) {
    return ip === range;
  }

  const parts = range.split("/");
  if (parts.length !== 2) return false;
  const baseIp = parts[0]!;
  const maskBits = parts[1]!;
  const mask = parseInt(maskBits, 10);

  if (ip.includes(".") && baseIp.includes(".")) {
    const ipNum = ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const baseNum =
      baseIp.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const maskNum = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;

    return (ipNum & maskNum) === (baseNum & maskNum);
  }

  return false;
}

function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXY_RANGES.some((range) => isIpInRange(ip, range));
}

function normalizeIp(ip: string): string {
  return ip.replace(/^::ffff:/, "");
}

function getIp(c: Context): string {
  const cfIp = c.req.header("cf-connecting-ip");
  if (cfIp && /^[0-9a-f.:]+$/.test(cfIp)) {
    return normalizeIp(cfIp);
  }

  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const socketAddr = (c.req.raw as unknown as { socket?: { remoteAddress?: string } }).socket
      ?.remoteAddress;

    if (socketAddr && isTrustedProxy(normalizeIp(socketAddr))) {
      const clientIp = forwarded.split(",")[0]?.trim() ?? "unknown";
      return normalizeIp(clientIp);
    }

    if (socketAddr) {
      logger.warn(
        { socketAddr, forwarded },
        "x-forwarded-for received from untrusted source - ignoring",
      );
    }
  }

  const socketAddr = (c.req.raw as unknown as { socket?: { remoteAddress?: string } }).socket
    ?.remoteAddress;
  return socketAddr ? normalizeIp(socketAddr) : "unknown";
}

app.get("/health", (c) => c.json({ ok: true, now: Date.now() }));

app.get("/.well-known/jwks.json", createJwksEndpoint(auth));

app.get("/security/status", (c) => {
  const anchoring = auditLogger.getAnchoringStatus();
  const mode = auditLogger.getMode();
  return c.json({
    auth: {
      storage: redisUrl ? "redis" : "memory",
    },
    audit: {
      mode,
      anchoring,
    },
    rateLimit: {
      backend: redisUrl ? "redis" : "memory",
    },
  });
});

app.get("/metrics", async (c) => {
  const data = await metrics.getMetrics();
  return c.text(data, 200, { "Content-Type": "text/plain; version=0.0.4" });
});

const NonceBody = z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) });

app.post("/auth/nonce", async (c) => {
  const log = getLogger(c);
  const ip = getIp(c);

  const bodyResult = NonceBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: "Invalid address" }, 400);

  const address = bodyResult.data.address;

  try {
    const ua = c.req.header("user-agent");
    const nonce = await auth.createNonce(address, {
      ip,
      ...(ua ? { ua } : {}),
    });
    log.info({ address, ip }, "nonce created");

    metrics.recordSecurityEvent("nonce_created", "low");

    return c.json({ nonce });
  } catch (err) {
    log.error({ err, address, ip }, "failed to create nonce");

    await broadcastSecurityEvent({
      type: "system_error",
      severity: "medium",
      source: "auth/nonce",
      details: { address, error: err instanceof Error ? err.message : String(err) },
      ip,
    });

    return c.json({ error: "Service Unavailable" }, 503);
  }
});

const RpcBody = z.object({
  jsonrpc: z.literal("2.0").optional(),
  id: z.number().optional(),
  method: z.string().min(1),
  params: z.array(z.unknown()).optional(),
});

app.post("/rpc/:chainId", authMiddleware(auth), async (c) => {
  const start = Date.now();
  const log = getLogger(c);
  const { chainId: chainIdStr } = c.req.param();
  const chainId = parseInt(chainIdStr, 10);

  if (!configuredChains.includes(chainId)) {
    return c.json({ error: `Chain ID ${chainId} is not supported` }, 400);
  }

  const authHeader = c.req.header("Authorization") ?? "";

  const ip = getIp(c);
  const session = c.get("session");
  const wallet = session?.address;

  try {
    const result = await rateLimiter.checkRateLimit({
      type: "rpc",
      ip,
      ...(wallet !== undefined && { wallet }),
    });

    if (!result.allowed) {
      log.warn({ chainId, wallet, ip }, "RPC rate limit hit");
      metrics.recordRateLimitHit("rpc", result.penalties?.[0] ?? "quota_exceeded");
      return c.json({ error: "RPC quota exceeded", riskScore: result.riskScore }, 429);
    }
  } catch (err) {
    log.error({ err }, "RPC rate limit storage failure");
  }

  const bodyResult = RpcBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: "Invalid JSON-RPC request" }, 400);

  try {
    const instance = c.get("talak") as TalakWeb3Instance;
    const ctx: TalakWeb3Context = instance.context;

    const result = await ctx.rpc.request(bodyResult.data.method, bodyResult.data.params ?? [], {});

    metrics.recordRpcRequest(
      String(chainId),
      bodyResult.data.method,
      "success",
      Date.now() - start,
    );
    return c.json({ jsonrpc: "2.0", id: bodyResult.data.id ?? 1, result });
  } catch (err) {
    log.error({ err, method: bodyResult.data.method, chainId }, "RPC request failed");
    const errorCode = err instanceof TalakWeb3Error ? err.code : "unknown";
    metrics.recordRpcError(String(chainId), bodyResult.data.method, errorCode);

    if (err instanceof TalakWeb3Error) {
      return c.json({ error: err.message, code: err.code }, err.status as ContentfulStatusCode);
    }

    return c.json({ error: "Upstream RPC error or timeout", code: "RPC_ERROR" }, 502);
  }
});

const LoginBody = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

app.post("/auth/login", async (c) => {
  const start = Date.now();
  const log = getLogger(c);
  const ip = getIp(c);

  const bodyResult = LoginBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const body = bodyResult.data;

  const addrMatch = body.message.match(/\n(0x[a-fA-F0-9]{40})\n/);
  const address = addrMatch?.[1]?.toLowerCase();

  const requestOrigin = c.req.header("origin") ?? c.req.header("referer");
  if (requestOrigin) {
    try {
      const originUrl = new URL(requestOrigin);

      const firstLine = body.message.split("\n")[0]?.trim() ?? "";
      const domainMatch = firstLine.match(
        /^(.+?) wants you to sign in with your Ethereum account:/,
      );
      const siweDomain = domainMatch?.[1]?.trim();

      if (!siweDomain) {
        log.warn({ ip, address }, "Cannot extract SIWE domain from message");
        return c.json(
          {
            error: "Invalid SIWE message format",
            code: "AUTH_SIWE_PARSE_ERROR",
          },
          400,
        );
      }

      if (originUrl.hostname !== siweDomain) {
        log.warn(
          {
            origin: originUrl.hostname,
            siweDomain,
            ip,
            address,
          },
          "SIWE domain-origin mismatch detected",
        );

        metrics.recordAuthFailure("siwe", "domain_mismatch", Date.now() - start);

        return c.json(
          {
            error: "Domain-origin mismatch",
            code: "AUTH_DOMAIN_MISMATCH",
            message: "The SIWE message domain does not match the request origin",
          },
          403,
        );
      }
    } catch {
      log.warn({ origin: requestOrigin }, "Invalid origin header format");
    }
  }

  try {
    const userAgent = c.req.header("user-agent") ?? "";
    const context = { ip, userAgent };

    const result = await auth.loginWithSiwe(body.message, body.signature, context);

    metrics.recordAuthSuccess("siwe", Date.now() - start);

    return c.json(result);
  } catch (err) {
    log.error({ err, address, ip }, "login failed");

    await rateLimiter.applyAuthFailurePenalty(ip, address);

    await broadcastSecurityEvent({
      type: "auth_failure",
      severity: "medium",
      source: "auth/login",
      details: { address, error: err instanceof Error ? err.message : String(err) },
      ip,
      ...(address !== undefined ? { wallet: address } : {}),
    });

    if (err instanceof TalakWeb3Error) {
      return c.json({ error: err.message, code: err.code }, err.status as ContentfulStatusCode);
    }
    return c.json({ error: "Authentication failed" }, 401);
  }
});

const RefreshBody = z.object({ refreshToken: z.string().min(20) });

app.post("/auth/refresh", async (c) => {
  const start = Date.now();
  const log = getLogger(c);
  const bodyResult = RefreshBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: "Invalid request body" }, 400);

  try {
    const result = await auth.refresh(bodyResult.data.refreshToken);

    metrics.recordAuthSuccess("refresh", Date.now() - start);

    return c.json(result);
  } catch (err) {
    log.warn({ err }, "refresh failed");
    const errorCode = err instanceof TalakWeb3Error ? err.code : "unknown";
    metrics.recordAuthFailure("refresh", errorCode, Date.now() - start);
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }
});

app.post("/auth/logout", async (c) => {
  const log = getLogger(c);
  const bodyResult = RefreshBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: "Invalid request body" }, 400);

  const authHeader = c.req.header("Authorization") ?? c.req.header("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  try {
    await auth.revokeSession(accessToken, bodyResult.data.refreshToken);
    log.info({}, "logout: session revoked");

    const ip = getIp(c);
    await broadcastSecurityEvent({
      type: "auth_success",
      severity: "low",
      source: "auth/logout",
      details: { action: "logout" },
      ip,
    });

    return c.json({ ok: true });
  } catch (err) {
    log.error({ err }, "storage failure during logout");
    return c.json({ error: "Service Unavailable" }, 503);
  }
});

app.get("/auth/verify", async (c) => {
  const authHeader = c.req.header("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) return c.json({ ok: false }, 401);

  try {
    const payload = await auth.verifySession(token);
    return c.json({ ok: true, payload });
  } catch {
    return c.json({ ok: false }, 401);
  }
});

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const port = Number(process.env["PORT"] ?? 8787);
  serve({ fetch: app.fetch, port });
  logger.info(`[hono-backend] listening on http://localhost:${port}`);
}

export default app;
