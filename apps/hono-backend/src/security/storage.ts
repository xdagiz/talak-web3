import type { RedisClientType } from 'redis';
import type { Context } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';
import { RedisNonceStore, RedisRefreshStore } from './stores.js';
import type { NonceStore, RefreshStore } from '@talak-web3/auth';
import { rateLimitRedis } from './rateLimit.js';

// Re-export the primitives for convenience
export { RedisNonceStore, RedisRefreshStore };

/**
 * Unified storage facade unifying the 3 stateful auth requirements:
 * 1. Nonce lifecycle (anti-replay)
 * 2. Refresh session lifecycle (token rotation/revocation)
 * 3. Rate Limiting
 */
export interface AuthStorage {
  /** Underlying nonce store exposed to core auth */
  readonly nonceStore: NonceStore;
  
  /** Underlying refresh store exposed to core auth */
  readonly refreshStore: RefreshStore;

  /**
   * Apply a token-bucket rate limit.
   * On failure (timeout/redis down) AND strictRateLimit=true, this must throw/fail closed.
   */
  checkRateLimit(
    key: string,
    capacity: number,
    refillsPerSecond: number
  ): Promise<{ allowed: boolean; remaining: number }>;
}

/**
 * Production-grade Redis-backed cluster storage.
 * Enforces `fail closed` behaviors by throwing if connection drops.
 */
export class RedisAuthStorage implements AuthStorage {
  readonly nonceStore: NonceStore;
  readonly refreshStore: RefreshStore;

  constructor(
    private readonly redis: RedisClientType,
    private readonly strictRateLimit: boolean = true
  ) {
    // We bind 5-minute hard TTL internally
    this.nonceStore = new RedisNonceStore(redis, 5 * 60_000);
    this.refreshStore = new RedisRefreshStore(redis);
  }

  async checkRateLimit(key: string, capacity: number, refillsPerSecond: number): Promise<{ allowed: boolean; remaining: number }> {
    try {
      if (!this.redis.isOpen) {
        throw new Error('Redis connection not open');
      }
      return await rateLimitRedis(this.redis, key, { capacity, refillPerSecond: refillsPerSecond });
    } catch (err) {
      if (this.strictRateLimit) {
        // FAIL CLOSED with 503
        throw new TalakWeb3Error('INFRA_UNAVAILABLE: Storage for rate limiter failed', {
          code: 'INFRA_UNAVAILABLE',
          status: 503,
          cause: err,
        });
      }
      return { allowed: true, remaining: capacity };
    }
  }
}

/**
 * DANGER: Development-only fallback storage.
 * Using this in production will cause a runtime halt.
 */
import { InMemoryNonceStore, InMemoryRefreshStore } from '@talak-web3/auth';

export class MemoryAuthStorage implements AuthStorage {
  readonly nonceStore: NonceStore;
  readonly refreshStore: RefreshStore;
  
  private readonly buckets = new Map<string, { tokens: number; ts: number }>();

  constructor() {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(
        'CRITICAL: MemoryAuthStorage instantiated in production environment. ' +
        'This fails closed to protect the system. Provide REDIS_URL to use RedisAuthStorage.'
      );
    }
    console.warn('⚠️ [MemoryAuthStorage] Using in-memory auth storage. NOT SAFE FOR PRODUCTION.');
    
    this.nonceStore = new InMemoryNonceStore();
    this.refreshStore = new InMemoryRefreshStore();
  }

  async checkRateLimit(key: string, capacity: number, refillsPerSecond: number): Promise<{ allowed: boolean; remaining: number }> {
    // Basic in-memory token bucket
    const nowMs = Date.now();
    let b = this.buckets.get(key);
    if (!b) b = { tokens: capacity, ts: nowMs };

    const deltaMs = Math.max(0, nowMs - b.ts);
    const refill = (deltaMs / 1000) * refillsPerSecond;
    b.tokens = Math.min(capacity, b.tokens + refill);
    b.ts = nowMs;

    let allowed = false;
    if (b.tokens >= 1) {
      allowed = true;
      b.tokens -= 1;
    }
    this.buckets.set(key, b);
    return { allowed, remaining: Math.floor(b.tokens) };
  }
}
