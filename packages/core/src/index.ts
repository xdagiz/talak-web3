import {
  TalakWeb3Auth,
  type RevocationStore,
  type NonceStore,
  type RefreshStore,
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
  isMemoryStore,
} from "@talak-web3/auth";
import type { TalakWeb3AuthOptions } from "@talak-web3/auth";
import { resolvePreset, validateConfig } from "@talak-web3/config";
import type { TalakWeb3Config } from "@talak-web3/config";
import {
  TalakWeb3Error,
  RPC_ERROR_CODES,
  PLUGIN_ERROR_CODES,
  CONFIG_ERROR_CODES,
} from "@talak-web3/errors";
import { UnifiedRpc } from "@talak-web3/rpc";
import type { RpcEndpoint } from "@talak-web3/rpc";
import type {
  IRpc,
  TalakWeb3BaseConfig,
  TalakWeb3Input,
  TalakWeb3Context,
  TalakWeb3EventsMap,
  TalakWeb3Instance,
  TalakWeb3Plugin,
  Logger,
  RpcCache,
} from "@talak-web3/types";

import { HookRegistry } from "./hook-registry.js";
import { resolvePluginOrder } from "./plugin-pipeline.js";

export {
  MiddlewareChain,
  errorHandlingMiddleware,
  requestLoggingMiddleware,
  requestIdMiddleware,
  setRequestId as setContextRequestId,
  getRequestId as getContextRequestId,
} from "./middleware.js";
import { createAuthHandler } from "./auth-handler.js";
import {
  MiddlewareChain,
  errorHandlingMiddleware,
  requestIdMiddleware,
  requestLoggingMiddleware,
} from "./middleware.js";
import { SecurityInvariant, securityMiddleware } from "./security.js";

export { createAuthHandler, type AuthHandlerOptions } from "./auth-handler.js";
export {
  TALAK_ACCESS_COOKIE,
  TALAK_REFRESH_COOKIE,
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  createSetCookieString,
  appendAuthCookies,
  appendClearAuthCookies,
} from "./auth-cookies.js";
export {
  getShouldSkipSessionRefresh,
  setShouldSkipSessionRefresh,
  resetShouldSkipSessionRefresh,
} from "./should-session-refresh.js";
export { runWithRequestState, runWithRequestStateAsync } from "./request-state.js";

const liveInstances = new Set<{ destroy(): Promise<void> }>();
let shutdownHandlerRegistered = false;

export async function shutdownAllInstances(): Promise<void> {
  const snapshot = Array.from(liveInstances);
  await Promise.allSettled(snapshot.map((instance) => instance.destroy()));
}

class ConsoleLogger implements Logger {
  private readonly structured: boolean;

  constructor(structured = process.env["LOG_FORMAT"] === "json") {
    this.structured = structured;
  }

  private formatMessage(level: string, message: string, args: unknown[]): string | object {
    if (this.structured) {
      return JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        args: args.length > 0 ? args : undefined,
      });
    }
    return message;
  }

  info(message: string, ...args: unknown[]): void {
    const output = this.formatMessage("info", message, args);
    if (this.structured) {
      console.log(output);
    } else {
      console.info("[talak-web3]", message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    const output = this.formatMessage("warn", message, args);
    if (this.structured) {
      console.error(output);
    } else {
      console.warn("[talak-web3]", message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    const output = this.formatMessage("error", message, args);
    if (this.structured) {
      console.error(output);
    } else {
      console.error("[talak-web3]", message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env["NODE_ENV"] !== "production") {
      const output = this.formatMessage("debug", message, args);
      if (this.structured) {
        console.log(output);
      } else {
        console.debug("[talak-web3]", message, ...args);
      }
    }
  }
}

class TtlCache implements RpcCache {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize: number;
  private insertionOrder: Set<string> = new Set();

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.insertionOrder.delete(key);
      return undefined;
    }
    this.insertionOrder.delete(key);
    this.insertionOrder.add(key);
    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlMs = 60_000): void {
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      this.evictOldest();
    }

    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });

    this.insertionOrder.delete(key);
    this.insertionOrder.add(key);
  }

  delete(key: string): void {
    this.store.delete(key);
    this.insertionOrder.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.insertionOrder = new Set();
  }

  private evictOldest(): void {
    const oldestKey = this.insertionOrder.values().next().value;
    if (oldestKey !== undefined) {
      this.insertionOrder.delete(oldestKey);
      this.store.delete(oldestKey);
    }
  }
}

export type { TalakWeb3Instance, MiddlewareHandler, IMiddlewareChain } from "@talak-web3/types";

function extractAuthFromInput(input: unknown): TalakWeb3Auth | undefined {
  if (input === null || typeof input !== "object") return undefined;
  if (!("auth" in input)) return undefined;
  const rec = input as Record<PropertyKey, unknown>;
  const auth = rec["auth"];
  return auth instanceof TalakWeb3Auth ? auth : undefined;
}

function extractAuthStoresFromInput(input: unknown): Partial<TalakWeb3AuthOptions> {
  if (input === null || typeof input !== "object") return {};
  if (!("auth" in input)) return {};
  const rec = input as Record<PropertyKey, unknown>;
  const auth = rec["auth"];
  if (auth === null || typeof auth !== "object" || auth instanceof TalakWeb3Auth) return {};

  const options: Partial<TalakWeb3AuthOptions> = {};
  const authRec = auth as Record<PropertyKey, unknown>;

  if ("nonceStore" in authRec) options.nonceStore = authRec["nonceStore"] as NonceStore;
  if ("refreshStore" in authRec) options.refreshStore = authRec["refreshStore"] as RefreshStore;
  if ("revocationStore" in authRec) {
    options.revocationStore = authRec["revocationStore"] as RevocationStore;
  }
  if ("accessTtlSeconds" in authRec) {
    options.accessTtlSeconds = authRec["accessTtlSeconds"] as number;
  }
  if ("refreshTtlSeconds" in authRec) {
    options.refreshTtlSeconds = authRec["refreshTtlSeconds"] as number;
  }
  if ("domain" in authRec && typeof authRec["domain"] === "string") {
    options.expectedDomain = authRec["domain"] as string;
  }

  return options;
}

class PendingRpc implements IRpc {
  async request<T = unknown>(
    _chainId: number,
    _method: string,
    _params?: unknown[],
    _options?: import("@talak-web3/types").RpcOptions,
  ): Promise<T> {
    throw new TalakWeb3Error("RPC not initialized", {
      code: RPC_ERROR_CODES.NOT_READY,
      status: 500,
    });
  }

  pauseHealthChecks(): void {
    throw new TalakWeb3Error("RPC not initialized", {
      code: RPC_ERROR_CODES.NOT_READY,
      status: 500,
    });
  }

  resumeHealthChecks(): void {
    throw new TalakWeb3Error("RPC not initialized", {
      code: RPC_ERROR_CODES.NOT_READY,
      status: 500,
    });
  }

  async getProvider(_chainId: number): Promise<RpcEndpoint | undefined> {
    throw new TalakWeb3Error("RPC not initialized", {
      code: RPC_ERROR_CODES.NOT_READY,
      status: 500,
    });
  }

  stop(): void {
    // noop
  }
}

/**
 * Create a new TalakWeb3 SDK instance.
 *
 * Omitting auth stores (`nonceStore`, `refreshStore`, `revocationStore`)
 * auto-creates in-memory stores suitable for **development only**.
 * In production (`NODE_ENV=production`), in-memory stores are rejected —
 * provide Redis-backed stores from `@talak-web3/auth/stores`.
 *
 * The returned instance must be initialized via `await app.init()` before
 * it can handle requests.
 *
 * @example
 * ```ts
 * const app = createTalakWeb3({
 *   chains: [{ id: 1, name: "Ethereum", rpcUrls: ["https://cloudflare-eth.com"],
 *              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
 *              testnet: false }],
 *   auth: { domain: "app.example.com" },
 * });
 * await app.init();
 * ```
 */
export function createTalakWeb3(input: TalakWeb3Input = {}): TalakWeb3Instance {
  const resolvedInput = resolvePreset(input as Record<PropertyKey, unknown>);
  const normalizedInput = normalizeConfigInput(resolvedInput);
  const injectedAuth = extractAuthFromInput(normalizedInput);
  const injectedAuthStores = extractAuthStoresFromInput(normalizedInput);
  SecurityInvariant.checkSecrets(normalizedInput);

  const validatedConfig: TalakWeb3Config = validateConfig(normalizedInput);
  const config = validatedConfig as unknown as TalakWeb3BaseConfig;
  const logger = new ConsoleLogger();
  const hooks = new HookRegistry<TalakWeb3EventsMap>(logger);
  const plugins = new Map<string, TalakWeb3Plugin>();
  const requestChain = new MiddlewareChain();
  const responseChain = new MiddlewareChain();

  const cache = new TtlCache();

  let auth: TalakWeb3Auth;
  const isProduction = process.env["NODE_ENV"] === "production";

  if (injectedAuth) {
    auth = injectedAuth;
  } else {
    const authConfig = config.auth ?? {};
    const authOptions = {
      ...injectedAuthStores,
    };

    const missingStores =
      !authOptions.nonceStore || !authOptions.refreshStore || !authOptions.revocationStore;

    if (isProduction && missingStores) {
      throw new TalakWeb3Error(
        "Production forbids auto-created in-memory auth stores. Provide nonceStore, refreshStore, and revocationStore (e.g. Redis stores from @talak-web3/auth/stores).",
        { code: CONFIG_ERROR_CODES.INMEMORY_STORES_IN_PRODUCTION, status: 500 },
      );
    }

    if (!authOptions.nonceStore) authOptions.nonceStore = new InMemoryNonceStore();
    if (!authOptions.refreshStore) authOptions.refreshStore = new InMemoryRefreshStore();
    if (!authOptions.revocationStore) authOptions.revocationStore = new InMemoryRevocationStore();

    if (
      isProduction &&
      (isMemoryStore(authOptions.nonceStore) ||
        isMemoryStore(authOptions.refreshStore) ||
        isMemoryStore(authOptions.revocationStore))
    ) {
      throw new TalakWeb3Error(
        "Production forbids InMemoryNonceStore / InMemoryRefreshStore / InMemoryRevocationStore. Use Redis-backed stores from @talak-web3/auth/stores.",
        { code: CONFIG_ERROR_CODES.INMEMORY_STORES_IN_PRODUCTION, status: 500 },
      );
    }

    if (!authOptions.expectedDomain && "domain" in authConfig && authConfig.domain) {
      authOptions.expectedDomain = authConfig.domain;
    }

    auth = new TalakWeb3Auth(authOptions as TalakWeb3AuthOptions);
  }

  const endpointsByChain = new Map<number, RpcEndpoint[]>();
  for (const chain of config.chains) {
    endpointsByChain.set(
      chain.id,
      chain.rpcUrls.map((url, i) => ({
        url,
        chainId: chain.id,
        priority: i,
        weight: 1,
      })),
    );
  }

  const contextShape: Omit<TalakWeb3Context, "rpc"> = {
    config,
    hooks,
    plugins,
    auth,
    cache,
    logger,
    requestChain,
    responseChain,
  };

  const bootstrapContext: TalakWeb3Context = {
    ...contextShape,
    rpc: new PendingRpc(),
  };
  const rpc = new UnifiedRpc(bootstrapContext, endpointsByChain);

  const context: TalakWeb3Context = {
    ...contextShape,
    rpc,
  };

  rpc.ctx = context;
  requestChain.use(errorHandlingMiddleware);
  requestChain.use(requestIdMiddleware);
  requestChain.use(securityMiddleware);
  requestChain.use(requestLoggingMiddleware);

  const instanceBase = {
    config: context.config,
    hooks,
    context,

    healthCheck() {
      const checks: Record<string, boolean> = {
        auth: !!context.auth,
        rpc: !!context.rpc,
        cache: !!context.cache,
        plugins: context.plugins.size > 0,
      };
      const failedCount = Object.values(checks).filter((v) => !v).length;
      const status: "ok" | "degraded" | "error" =
        failedCount === 0 ? "ok" : failedCount < Object.keys(checks).length ? "degraded" : "error";
      return { status, checks };
    },

    async init() {
      await auth.coldStart();

      const rawPlugins = config.plugins ?? [];

      for (const plugin of rawPlugins) {
        if (!isTalakWeb3Plugin(plugin)) {
          throw new TalakWeb3Error("Invalid plugin config: expected TalakWeb3Plugin object", {
            code: PLUGIN_ERROR_CODES.INVALID,
            status: 400,
          });
        }
      }

      const ordered = resolvePluginOrder(rawPlugins);

      for (const plugin of ordered) {
        if (plugins.has(plugin.name)) {
          throw new TalakWeb3Error(`Plugin "${plugin.name}" already registered`, {
            code: PLUGIN_ERROR_CODES.DUPLICATE,
            status: 400,
          });
        }
        await plugin.setup(context);
        plugins.set(plugin.name, plugin);
        hooks.emit("plugin-load", { name: plugin.name });
        logger.info(`Plugin loaded: ${plugin.name}@${plugin.version}`);
      }
    },

    async destroy() {
      for (const plugin of plugins.values()) {
        if (plugin.teardown) {
          await plugin.teardown();
        }
      }
      plugins.clear();
      hooks.clear();
    },

    async shutdown() {
      await this.destroy();
      const { ConnectionManager } = await import("./connections.js");
      await ConnectionManager.shutdown();
    },
  };

  const instance: TalakWeb3Instance = {
    ...instanceBase,
    async destroy() {
      try {
        await instanceBase.destroy.call(this);
      } finally {
        liveInstances.delete(instance);
      }
    },
    async shutdown() {
      await this.destroy();
      const { ConnectionManager } = await import("./connections.js");
      await ConnectionManager.shutdown();
    },
    handler: createAuthHandler({
      ...instanceBase,
      handler: async () => new Response(null, { status: 500 }),
    }),
  };

  liveInstances.add(instance);

  if (!shutdownHandlerRegistered) {
    shutdownHandlerRegistered = true;
    const gracefulShutdown = async (): Promise<void> => {
      try {
        await shutdownAllInstances();
        const { ConnectionManager } = await import("./connections.js");
        await ConnectionManager.shutdown();
        process.exit(0);
      } catch (err) {
        process.stderr.write(
          `[talak-web3] graceful shutdown error: ${
            err instanceof Error ? (err.stack ?? err.message) : String(err)
          }\n`,
        );
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => {
      void gracefulShutdown();
    });

    process.on("SIGINT", () => {
      void gracefulShutdown();
    });
  }

  return instance;
}

/** Alias for {@link createTalakWeb3}. */
export function talakWeb3(input: TalakWeb3Input = {}): TalakWeb3Instance {
  return createTalakWeb3(input);
}

function isTalakWeb3Plugin(input: unknown): input is TalakWeb3Plugin {
  if (typeof input !== "object" || input === null) return false;
  const obj = input as Record<PropertyKey, unknown>;
  return (
    typeof obj["name"] === "string" &&
    typeof obj["version"] === "string" &&
    typeof obj["setup"] === "function"
  );
}

function normalizeConfigInput(input: unknown): unknown {
  if (input === null || typeof input !== "object") return {};
  const obj = input as Record<PropertyKey, unknown>;
  const rawChains = Array.isArray(obj["chains"]) ? obj["chains"] : undefined;

  const result: Record<string, unknown> = { ...obj };

  if (rawChains) {
    const chainCurrencyMap: Record<number, { symbol: string; name: string }> = {
      1: { symbol: "ETH", name: "Ether" },
      137: { symbol: "POL", name: "Polygon" },
      10: { symbol: "ETH", name: "Ether" },
      42161: { symbol: "ETH", name: "Ether" },
      56: { symbol: "BNB", name: "BNB" },
      43114: { symbol: "AVAX", name: "Avalanche" },
    };

    result["chains"] = (rawChains as unknown[]).map((chain: unknown, i: number) => {
      if (typeof chain !== "object" || chain === null) return chain;
      const chainObj = chain as Record<PropertyKey, unknown>;
      const id = typeof chainObj["id"] === "number" ? chainObj["id"] : i + 1;
      const currency = chainCurrencyMap[id] ?? { symbol: "ETH", name: "Ether" };
      const nc = chainObj["nativeCurrency"];
      return Object.assign({}, chainObj, {
        name:
          typeof chainObj["name"] === "string" && (chainObj["name"] as string).length > 0 // SAFETY: narrowed by typeof check above
            ? chainObj["name"]
            : `Chain ${id}`,
        nativeCurrency:
          typeof nc === "object" && nc !== null
            ? nc
            : { name: currency.name, symbol: currency.symbol, decimals: 18 },
      });
    });
  }

  return result;
}
