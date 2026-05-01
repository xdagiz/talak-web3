import { TalakWeb3Error } from "@talak-web3/errors";
import type Redis from "ioredis";

import type { NonceStore } from "../contracts.js";

const CONSUME_NONCE_DETERMINISTIC_LUA = `
-- KEYS[1] = consumed set (SOURCE OF TRUTH)
-- KEYS[2] = pending sorted set (optimization only)
-- ARGV[1] = nonce

-- INVARIANT: Check if already consumed (authoritative check)
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then
  return 0
end

-- Verify nonce exists in pending set (optional optimization)
local exists = redis.call('ZSCORE', KEYS[2], ARGV[1])
if not exists then
  -- Nonce not in pending — might be expired or invalid
  return 0
end

-- CRITICAL: Append to consumed set (IRREVERSIBLE)
-- SADD is idempotent — safe even under retry
redis.call('SADD', KEYS[1], ARGV[1])

-- Remove from pending (optimization — not required for correctness)
redis.call('ZREM', KEYS[2], ARGV[1])

-- Set TTL on pending set for auto-cleanup
redis.call('PEXPIRE', KEYS[2], tonumber(ARGV[2]))

-- CRITICAL: Consumed set has NO TTL — it is append-only truth
-- Manual cleanup occurs only after nonce expiry window + safety margin

return 1
`;

export interface RedisNonceStoreOptions {
  redis: Redis;

  ttlMs?: number;

  keyPrefix?: string;

  waitReplicas?: number;

  waitTimeoutMs?: number;
}

export class RedisNonceStore implements NonceStore {
  private readonly redis: Redis;
  private readonly ttlMs: number;
  private readonly prefix: string;

  private readonly consumedRetentionMs: number;

  private readonly waitReplicas: number;
  private readonly waitTimeoutMs: number;

  constructor(opts: RedisNonceStoreOptions) {
    this.redis = opts.redis;
    this.ttlMs = Math.min(opts.ttlMs ?? 5 * 60_000, 5 * 60_000);
    this.prefix = opts.keyPrefix ?? "talak:nonce:";
    this.consumedRetentionMs = this.ttlMs * 2;
    this.waitReplicas = opts.waitReplicas ?? 1;
    this.waitTimeoutMs = opts.waitTimeoutMs ?? 100;
  }

  private pendingKey(address: string): string {
    return `${this.prefix}pending:${address.toLowerCase()}`;
  }

  private consumedKey(address: string): string {
    return `${this.prefix}consumed:${address.toLowerCase()}`;
  }

  async create(address: string, _meta?: { ip?: string; ua?: string }): Promise<string> {
    const addr = address.toLowerCase();
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const now = Date.now();

    await this.redis.zadd(this.pendingKey(addr), now, nonce);

    await this.redis.pexpire(this.pendingKey(addr), this.ttlMs);

    return nonce;
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const consumedKey = this.consumedKey(addr);
    const pendingKey = this.pendingKey(addr);

    try {
      const result = (await this.redis.eval(
        CONSUME_NONCE_DETERMINISTIC_LUA,
        2,
        consumedKey,
        pendingKey,
        nonce,
        this.ttlMs.toString(),
      )) as number;

      if (result !== 1) {
        return false;
      }

      const replicasAcknowledged = (await this.redis.wait(
        this.waitReplicas,
        this.waitTimeoutMs,
      )) as number;

      if (replicasAcknowledged < this.waitReplicas) {
        console.error("[AUTH] CRITICAL: Nonce replication acknowledgment failed", {
          expected: this.waitReplicas,
          actual: replicasAcknowledged,
        });
      }

      return true;
    } catch (err) {
      throw new TalakWeb3Error("Redis nonce store failure — failing closed", {
        code: "AUTH_REDIS_NONCE_ERROR",
        status: 503,
        cause: err,
      });
    }
  }

  async isConsumed(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const consumedKey = this.consumedKey(addr);

    try {
      const result = await this.redis.sismember(consumedKey, nonce);
      return result === 1;
    } catch (err) {
      throw new TalakWeb3Error("Redis nonce verification failure — failing closed", {
        code: "AUTH_REDIS_NONCE_ERROR",
        status: 503,
        cause: err,
      });
    }
  }
}
