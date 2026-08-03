import { TalakWeb3Error, RpcError, RPC_ERROR_CODES, CONFIG_ERROR_CODES } from "@talak-web3/errors";
import type {
  TalakWeb3Context,
  IRpc,
  RpcOptions,
  MiddlewareHandler,
  RpcEndpoint,
} from "@talak-web3/types";

import {
  DistributedCircuitBreaker,
  type CircuitBreakerConfig,
  type RedisLike,
} from "./circuit-breaker.js";
import { validateRpcRequest } from "./validation.js";

export type { RpcEndpoint } from "@talak-web3/types";

/** Middleware that validates incoming RPC requests against the JSON-RPC 2.0 schema. */
/** @internal RPC validation middleware — not yet wired into the default middleware chain. */
export const rpcValidationMiddleware: MiddlewareHandler = async (req, next) => {
  validateRpcRequest(req);
  return next();
};

function hasExecuteMethod<T>(
  chain: unknown,
): chain is { execute: (p: unknown, ctx: TalakWeb3Context, n: () => Promise<T>) => Promise<T> } {
  if (!chain || typeof chain !== "object") return false;
  const candidate = chain as Record<string, unknown>;
  return typeof candidate["execute"] === "function";
}

function isRedisLike(cache: unknown): cache is RedisLike {
  if (typeof cache !== "object" || cache === null) return false;
  const candidate = cache as Record<string, unknown>;
  return (
    typeof candidate.get === "function" &&
    typeof candidate.set === "function" &&
    typeof candidate.del === "function" &&
    typeof candidate.incr === "function"
  );
}

/** Unified RPC client with health checking, load balancing, and circuit breaking. */
export class UnifiedRpc implements IRpc {
  private endpointsByChain: Map<number, RpcEndpoint[]>;
  ctx: TalakWeb3Context;
  private healthInterval: ReturnType<typeof setInterval> | undefined;
  private requestIdCounter = 0;
  private circuitBreaker?: DistributedCircuitBreaker;
  private pendingRequests = new Map<string, Promise<unknown>>();
  private readonly maxPendingRequests = 1000;
  private signalCleanup: (() => void) | undefined;

  constructor(
    ctx: TalakWeb3Context,
    endpointsByChain: Map<number, RpcEndpoint[]> = new Map(),
    options?: { healthCheckIntervalMs?: number },
  ) {
    this.ctx = ctx;
    this.endpointsByChain = endpointsByChain;

    if (this.endpointsByChain.size > 0) {
      const intervalMs = options?.healthCheckIntervalMs ?? 30_000;
      this.healthInterval = setInterval(() => {
        void this.checkAllHealth();
      }, intervalMs);

      this.healthInterval.unref?.();
    }

    this.signalCleanup = () => {
      this.stop();
    };
    process.on("SIGINT", this.signalCleanup);
    process.on("SIGTERM", this.signalCleanup);
  }

  configureCircuitBreaker(config: Omit<CircuitBreakerConfig, "redis">): void {
    if (!isRedisLike(this.ctx.cache)) {
      throw new TalakWeb3Error(
        "DistributedCircuitBreaker requires a Redis-backed cache implementation. " +
          "The default in-memory TtlCache does not support the required operations (incr, del). " +
          "Provide a Redis client or a RedisLike adapter with incr() via the cache property.",
        {
          code: CONFIG_ERROR_CODES.INVALID,
          status: 500,
        },
      );
    }

    const redis = this.ctx.cache as RedisLike;

    this.circuitBreaker = new DistributedCircuitBreaker({
      ...config,
      redis,
    });
  }

  stop(): void {
    if (this.healthInterval) clearInterval(this.healthInterval);

    if (this.signalCleanup) {
      process.removeListener("SIGINT", this.signalCleanup);
      process.removeListener("SIGTERM", this.signalCleanup);
      this.signalCleanup = undefined;
    }
  }

  pauseHealthChecks(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = undefined;
    }
  }

  resumeHealthChecks(intervalMs = 30_000): void {
    if (this.healthInterval) return;

    if (this.endpointsByChain.size > 0) {
      this.healthInterval = setInterval(() => {
        void this.checkAllHealth();
      }, intervalMs);
      this.healthInterval.unref?.();
    }
  }

  async getProvider(chainId: number): Promise<RpcEndpoint | undefined> {
    return this.getBestEndpoint(chainId);
  }

  async checkAllHealth(): Promise<void> {
    const allEndpoints: RpcEndpoint[] = [];
    for (const endpoints of this.endpointsByChain.values()) {
      allEndpoints.push(...endpoints);
    }
    await Promise.all(allEndpoints.map((e) => this.checkEndpointHealth(e)));
  }

  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<void> {
    const start = Date.now();
    try {
      const healthMethods = ["eth_blockNumber", "eth_chainId"];
      let healthOk = false;

      for (const method of healthMethods) {
        try {
          if (this.circuitBreaker && endpoint.providerId) {
            await this.circuitBreaker.execute(
              endpoint.chainId,
              endpoint.providerId,
              () => this.doRequest(endpoint.chainId, endpoint.url, method, [], 5_000),
              5000,
            );
          } else {
            await this.doRequest(endpoint.chainId, endpoint.url, method, [], 5_000);
          }
          healthOk = true;
          break;
        } catch {
          // non-fatal: try next provider
        }
      }

      if (healthOk) {
        endpoint.health = { status: "up", latency: Date.now() - start, lastChecked: Date.now() };
      } else {
        endpoint.health = { status: "down", latency: Infinity, lastChecked: Date.now() };
      }
    } catch {
      endpoint.health = { status: "down", latency: Infinity, lastChecked: Date.now() };
    }
  }

  async request<T = unknown>(
    chainId: number,
    method: string,
    params: unknown[] = [],
    options: RpcOptions = {},
  ): Promise<T> {
    const {
      retries = this.ctx.config.rpc.retries,
      timeout = this.ctx.config.rpc.timeout,
      failover = true,
    } = options;

    const requestId = (this.requestIdCounter =
      (this.requestIdCounter + 1) % Number.MAX_SAFE_INTEGER);
    const run = async () =>
      this.fetchWithRetry<T>(chainId, method, params, retries, timeout, failover, requestId);

    const req = { jsonrpc: "2.0", id: requestId, method, params };

    validateRpcRequest(req);

    const readOnlyMethods = new Set([
      "eth_call",
      "eth_getBalance",
      "eth_getCode",
      "eth_blockNumber",
      "eth_chainId",
    ]);
    if (readOnlyMethods.has(method)) {
      const cacheKey = `${method}:${JSON.stringify(params)}`;
      const cached = this.ctx.cache.get<T>(cacheKey);
      if (cached !== undefined) return cached;

      const existing = this.pendingRequests.get(cacheKey) as Promise<T> | undefined;
      if (existing) return existing;

      if (this.pendingRequests.size >= this.maxPendingRequests) {
        const oldestKey = this.pendingRequests.keys().next().value;
        if (oldestKey !== undefined) {
          this.pendingRequests.delete(oldestKey);
        }
      }

      const promise = (async () => {
        const result = await this.executeChain<T>(this.ctx.requestChain, req, run);
        await this.executeChain(this.ctx.responseChain, { req, result }, async () => result);
        this.ctx.cache.set(cacheKey, result, this.getCacheTtl(method));
        return result;
      })();

      this.pendingRequests.set(cacheKey, promise);
      promise.then(
        () => this.pendingRequests.delete(cacheKey),
        () => this.pendingRequests.delete(cacheKey),
      );
      return promise;
    }

    const result = await this.executeChain<T>(this.ctx.requestChain, req, run);
    await this.executeChain(this.ctx.responseChain, { req, result }, async () => result);
    return result;
  }

  private async executeChain<T>(
    chain: unknown,
    payload: unknown,
    fallback: () => Promise<T>,
  ): Promise<T> {
    if (!hasExecuteMethod<T>(chain)) return fallback();
    const result = await chain.execute(payload, this.ctx, fallback);
    if (result === undefined) return fallback();
    return result;
  }

  private async fetchWithRetry<T>(
    chainId: number,
    method: string,
    params: unknown[],
    retries: number,
    timeout: number,
    failover: boolean,
    requestId?: number,
  ): Promise<T> {
    const rpcStartTime = Date.now();
    let lastError: Error | undefined;
    let lastFailedUrl: string | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const endpoint = await this.getBestEndpoint(chainId, failover ? undefined : lastFailedUrl);
      if (!endpoint) {
        throw new RpcError("No RPC endpoints available", {
          code: RPC_ERROR_CODES.NO_ENDPOINTS,
          status: 503,
          chainId,
        });
      }

      try {
        if (attempt > 0) {
          const baseDelay = Math.min(100 * Math.pow(2, attempt), 2000);
          const jitter = baseDelay * Math.random() * 0.3;
          const delay = baseDelay + jitter;
          await new Promise((r) => setTimeout(r, delay));
        }

        const emitRpcRequest = (result: T) => {
          this.ctx.hooks.emit("rpc:request", {
            chainId,
            method,
            duration: Date.now() - rpcStartTime,
            endpoint: endpoint.url,
          });
          return result;
        };

        if (this.circuitBreaker && endpoint.providerId) {
          const result = await this.circuitBreaker.execute(
            chainId,
            endpoint.providerId,
            () => this.doRequest<T>(chainId, endpoint.url, method, params, timeout, requestId),
            timeout,
          );
          return emitRpcRequest(result);
        }

        const result = await this.doRequest<T>(
          chainId,
          endpoint.url,
          method,
          params,
          timeout,
          requestId,
        );
        return emitRpcRequest(result);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (lastError instanceof TalakWeb3Error && !this.isRetryableError(lastError)) {
          throw lastError;
        }
        lastFailedUrl = endpoint.url;
        const chainEndpoints = this.endpointsByChain.get(chainId) ?? [];
        const canonical = chainEndpoints.find((e) => e.url === endpoint.url);
        if (canonical) {
          canonical.health = { status: "down", latency: Infinity, lastChecked: Date.now() };
        }
        const nextEndpoint = await this.getBestEndpoint(chainId, lastFailedUrl);
        if (nextEndpoint && nextEndpoint.url !== lastFailedUrl) {
          this.ctx.hooks.emit("rpc:failover", {
            from: lastFailedUrl ?? endpoint.url,
            to: nextEndpoint.url,
            chainId,
            method,
          });
        }
        this.ctx.hooks.emit("rpc-error", {
          chainId,
          endpoint: endpoint.url,
          error: lastError,
          attempt,
        });
        this.ctx.logger.warn(
          `RPC attempt ${attempt + 1}/${retries + 1} failed on ${endpoint.url}: ${lastError.message}`,
        );
      }
    }

    throw new RpcError(`RPC request failed after ${retries + 1} attempts`, {
      code: RPC_ERROR_CODES.ALL_PROVIDERS_FAILED,
      status: 502,
      cause: lastError,
      chainId,
    });
  }

  private async getBestEndpoint(
    chainId: number,
    excludeUrl?: string,
  ): Promise<RpcEndpoint | undefined> {
    const chainEndpoints = this.endpointsByChain.get(chainId) ?? [];
    if (chainEndpoints.length === 0) return undefined;

    const endpoints = await Promise.all(
      chainEndpoints.map(async (e) => {
        if (this.circuitBreaker && e.providerId) {
          const isAvailable = await this.circuitBreaker.isAvailable(chainId, e.providerId);
          if (!isAvailable) {
            return { ...e, circuitOpen: true };
          }
        }
        return { ...e, circuitOpen: false };
      }),
    );

    const healthy = endpoints
      .filter(
        (e) => !e.circuitOpen && (!e.health || e.health.status === "up") && e.url !== excludeUrl,
      )
      .sort(
        (a, b) =>
          (a.priority ?? 0) - (b.priority ?? 0) ||
          (a.health?.latency ?? 0) - (b.health?.latency ?? 0),
      );

    if (healthy.length > 0) return healthy[0];

    if (excludeUrl) {
      const fallback = endpoints
        .filter((e) => !e.circuitOpen && (!e.health || e.health.status === "up"))
        .sort(
          (a, b) =>
            (a.priority ?? 0) - (b.priority ?? 0) ||
            (a.health?.latency ?? 0) - (b.health?.latency ?? 0),
        );

      if (fallback.length > 0) return fallback[0];
    }

    const recovering = endpoints
      .filter((e) => e.circuitOpen)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    if (recovering.length > 0) return recovering[0];

    return [...chainEndpoints].sort(
      (a, b) => (a.health?.lastChecked ?? 0) - (b.health?.lastChecked ?? 0),
    )[0];
  }

  private getCacheTtl(method: string): number {
    switch (method) {
      case "eth_chainId":
        return 60_000;
      case "eth_blockNumber":
        return 3_000;
      case "eth_getBalance":
        return 12_000;
      case "eth_call":
        return 12_000;
      default:
        return 12_000;
    }
  }

  private async doRequest<T>(
    chainId: number,
    url: string,
    method: string,
    params: unknown[],
    timeoutMs: number,
    requestId?: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const id =
        requestId ??
        (this.requestIdCounter = (this.requestIdCounter + 1) % Number.MAX_SAFE_INTEGER);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new RpcError(`HTTP ${response.status} from ${url}`, {
          code: RPC_ERROR_CODES.PROVIDER_ERROR,
          status: response.status,
          provider: url,
          chainId,
        });
      }

      const data = (await response.json()) as {
        result?: T;
        error?: { message: string; code: number };
      };
      if (data.error)
        throw new RpcError(data.error.message, {
          code: RPC_ERROR_CODES.PROVIDER_ERROR,
          status: 502,
          provider: url,
          chainId,
          data: { jsonRpcCode: data.error.code },
        });
      if (data.result === undefined)
        throw new RpcError("Missing result in JSON-RPC response", {
          code: RPC_ERROR_CODES.PROVIDER_ERROR,
          status: 502,
          provider: url,
          chainId,
        });
      return data.result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new RpcError(`RPC request timed out after ${timeoutMs}ms on ${url}`, {
          code: RPC_ERROR_CODES.TIMEOUT,
          status: 504,
          provider: url,
          chainId,
        });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private isRetryableError(error: TalakWeb3Error): boolean {
    const nonRetryableCodes = new Set([
      RPC_ERROR_CODES.VALIDATION_ERROR,
      RPC_ERROR_CODES.INVALID_PAYLOAD,
      RPC_ERROR_CODES.DEPTH_EXCEEDED,
      RPC_ERROR_CODES.PAYLOAD_TOO_LARGE,
    ]);
    if (
      nonRetryableCodes.has(error.code as typeof nonRetryableCodes extends Set<infer T> ? T : never)
    ) {
      return false;
    }
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }
    return true;
  }
}
