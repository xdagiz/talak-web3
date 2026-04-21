import type { RedisClientType } from 'redis';
import type { Context } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';
import { RedisNonceStore, RedisRefreshStore } from './stores.js';
import type { NonceStore, RefreshStore } from '@talak-web3/auth';
import { rateLimitRedis } from './rateLimit.js';

export { RedisNonceStore, RedisRefreshStore };

export interface AuthStorage {

  readonly nonceStore: NonceStore;

  readonly refreshStore: RefreshStore;

  checkRateLimit(
    key: string,
    capacity: number,
    refillsPerSecond: number,
    cost?: number
  ): Promise<{ allowed: boolean; remaining: number }>;

  penalize(key: string, cost: number): Promise<void>;
}

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

        throw new TalakWeb3Error('INFRA_UNAVAILABLE: Storage for rate limiter failed', {
          code: 'INFRA_UNAVAILABLE',
          status: 503,
          cause: err,
        });
      }

      return { allowed: false, remaining: 0 };
    }
  }

  async penalize(key: string, cost: number): Promise<void> {
    try {
      if (!this.redis.isOpen) return;
      const now = Date.now();
      const windowMs = 60000;
      const fullKey = `ratelimit:${key}`;

      const multi = this.redis.multi();
      for (let i = 0; i < cost; i++) {
        multi.zAdd(fullKey, { score: now, value: `${now}:penalty:${i}:${Math.random()}` });
      }
      multi.pExpire(fullKey, windowMs);
      await multi.exec();
    } catch (err) {
      console.error('[RedisAuthStorage] Failed to apply penalty:', err);
    }
  }
}
