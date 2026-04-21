import type { RedisClientType } from 'redis';
import type { Context } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';
import { RedisNonceStore, RedisRefreshStore } from './stores.js';
import type { NonceStore, RefreshStore } from '@talak-web3/auth';
import { rateLimitRedis } from './rateLimit.js';
import { randomBytes } from 'node:crypto';

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
    refillsPerSecond: number,
    cost?: number
  ): Promise<{ allowed: boolean; remaining: number }>;

  /**
   * Apply a penalty to a rate limit key (e.g. after a failed auth attempt).
   */
  penalize(key: string, cost: number): Promise<void>;
}

/**
 * Production-grade Redis-backed cluster storage.
 * Enforces `fail closed` behaviors by throwing if connection drops.
 * In-memory fallback is strictly forbidden for production security.
 */
export class RedisAuthStorage implements AuthStorage {
  readonly nonceStore: NonceStore;
  readonly refreshStore: RefreshStore;

  constructor(
    private readonly redis: RedisClientType,
    private readonly strictRateLimit: boolean = true
  ) {
    if (!redis) {
      throw new Error('CRITICAL: Redis client is required for RedisAuthStorage. In-memory fallback is disabled.');
    }
    // We bind 5-minute hard TTL internally
    this.nonceStore = new RedisNonceStore(redis, 5 * 60_000);
    this.refreshStore = new RedisRefreshStore(redis);
  }

  async checkRateLimit(key: string, capacity: number, refillsPerSecond: number, cost = 1): Promise<{ allowed: boolean; remaining: number }> {
    try {
      if (!this.redis.isOpen) {
        throw new Error('Redis connection not open');
      }
      return await rateLimitRedis(this.redis, key, { capacity, refillPerSecond: refillsPerSecond, cost });
    } catch (err) {
      if (this.strictRateLimit) {
        // FAIL CLOSED with 503
        throw new TalakWeb3Error('INFRA_UNAVAILABLE: Storage for rate limiter failed', {
          code: 'INFRA_UNAVAILABLE',
          status: 503,
          cause: err,
        });
      }
      // This path is only reached if strictRateLimit is false (not recommended for production)
      return { allowed: false, remaining: 0 };
    }
  }

  async penalize(key: string, cost: number): Promise<void> {
    try {
      if (!this.redis.isOpen) return;
      const now = Date.now();
      const windowMs = 60000; // Default window for penalties
      const fullKey = `ratelimit:${key}`;
      
      // Use pipeline for atomic penalty application
      const multi = this.redis.multi();
      for (let i = 0; i < cost; i++) {
        multi.zAdd(fullKey, { score: now, value: `${now}:penalty:${i}:${randomBytes(4).toString('hex')}` });
      }
      multi.pExpire(fullKey, windowMs);
      await multi.exec();
    } catch (err) {
      console.error('[RedisAuthStorage] Failed to apply penalty:', err);
    }
  }
}
