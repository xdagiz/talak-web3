import { TalakWeb3Error } from '@talak-web3/errors';
import type { TalakWeb3Context, IRpc, RpcOptions } from '@talak-web3/types';

export interface RpcEndpoint {
  url: string;
  weight?: number;
  priority?: number;
  health?: {
    status: 'up' | 'down';
    latency: number;
    lastChecked: number;
  };
}

export class UnifiedRpc implements IRpc {
  private endpoints: RpcEndpoint[];
  ctx: TalakWeb3Context;
  private readonly healthInterval: ReturnType<typeof setInterval> | undefined;

  constructor(ctx: TalakWeb3Context, endpoints: RpcEndpoint[] = []) {
    this.ctx = ctx;
    this.endpoints = endpoints;

    if (this.endpoints.length > 0) {
      this.healthInterval = setInterval(() => {
        void this.checkAllHealth();
      }, 30_000);
      // Allow process to exit even if interval is pending
      this.healthInterval.unref?.();
    }
  }

  stop(): void {
    if (this.healthInterval) clearInterval(this.healthInterval);
  }

  async checkAllHealth(): Promise<void> {
    await Promise.all(this.endpoints.map(e => this.checkEndpointHealth(e)));
  }

  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<void> {
    const start = Date.now();
    try {
      await this.doRequest(endpoint.url, 'eth_blockNumber', [], 5_000);
      endpoint.health = { status: 'up', latency: Date.now() - start, lastChecked: Date.now() };
    } catch {
      endpoint.health = { status: 'down', latency: Infinity, lastChecked: Date.now() };
    }
  }

  async request<T = unknown>(
    method: string,
    params: unknown[] = [],
    options: RpcOptions = {},
  ): Promise<T> {
    const { retries = this.ctx.config.rpc.retries, timeout = this.ctx.config.rpc.timeout, failover = true } = options;

    const run = async () => this.fetchWithRetry<T>(method, params, retries, timeout, failover);

    const req = { method, params, options };

    // Cache read-only calls
    const readOnlyMethods = new Set(['eth_call', 'eth_getBalance', 'eth_getCode', 'eth_blockNumber', 'eth_chainId']);
    if (readOnlyMethods.has(method)) {
      const cacheKey = `${method}:${JSON.stringify(params)}`;
      const cached = this.ctx.cache.get<T>(cacheKey);
      if (cached !== undefined) return cached;

      const result = await this.executeChain<T>(this.ctx.requestChain, req, run);
      await this.executeChain(this.ctx.responseChain, { req, result }, async () => result);
      this.ctx.cache.set(cacheKey, result, 12_000); // 12 second TTL for block-level data
      return result;
    }

    const result = await this.executeChain<T>(this.ctx.requestChain, req, run);
    await this.executeChain(this.ctx.responseChain, { req, result }, async () => result);
    return result;
  }

  private async executeChain<T>(
    chain: unknown,
    payload: unknown,
    fallback: () => Promise<T>
  ): Promise<T> {
    const executor = (chain as { execute?: (p: unknown, ctx: TalakWeb3Context, n: () => Promise<T>) => Promise<T> } | undefined)?.execute;
    if (typeof executor !== 'function') return fallback();
    const result = await executor.call(chain, payload, this.ctx, fallback);
    if (result === undefined) return fallback();
    return result;
  }

  private async fetchWithRetry<T>(
    method: string,
    params: unknown[],
    retries: number,
    timeout: number,
    failover: boolean,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const endpoint = this.getBestEndpoint(failover ? undefined : lastError);
      if (!endpoint) {
        throw new TalakWeb3Error('No RPC endpoints available', {
          code: 'RPC_NO_ENDPOINTS',
          status: 503,
        });
      }

      try {
        return await this.doRequest<T>(endpoint.url, method, params, timeout);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        endpoint.health = { status: 'down', latency: Infinity, lastChecked: Date.now() };
        this.ctx.hooks.emit('rpc-error', { endpoint: endpoint.url, error: lastError, attempt });
        this.ctx.logger.warn(`RPC attempt ${attempt + 1}/${retries + 1} failed on ${endpoint.url}: ${lastError.message}`);
      }
    }

    throw new TalakWeb3Error(`RPC request failed after ${retries + 1} attempts`, {
      code: 'RPC_MAX_RETRIES',
      status: 502,
      cause: lastError,
    });
  }

  private getBestEndpoint(_lastError?: Error | undefined): RpcEndpoint | undefined {
    const healthy = this.endpoints
      .filter(e => !e.health || e.health.status === 'up')
      .sort((a, b) =>
        (a.priority ?? 0) - (b.priority ?? 0) ||
        (a.health?.latency ?? 0) - (b.health?.latency ?? 0),
      );

    if (healthy.length > 0) return healthy[0];

    // All down — try the one that was checked longest ago
    return [...this.endpoints].sort(
      (a, b) => (a.health?.lastChecked ?? 0) - (b.health?.lastChecked ?? 0),
    )[0];
  }

  private async doRequest<T>(url: string, method: string, params: unknown[], timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }

      const data = await response.json() as { result?: T; error?: { message: string; code: number } };
      if (data.error) throw new Error(data.error.message);
      if (data.result === undefined) throw new Error('Missing result in JSON-RPC response');
      return data.result;
    } finally {
      clearTimeout(timer);
    }
  }
}
