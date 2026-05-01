import Redis from "ioredis";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { RedisNonceStore } from "../../stores/redis-nonce.js";

describe("Adversarial: Nonce Crash Replay", () => {
  let redis: Redis;
  let nonceStore: RedisNonceStore;
  const testAddress = "0x1234567890abcdef1234567890abcdef12345678";

  beforeEach(async () => {
    redis = new Redis({
      host: "localhost",
      port: 6379,
      db: 15,
    });

    nonceStore = new RedisNonceStore({ redis });

    await redis.flushdb();
  });

  afterEach(async () => {
    await redis.quit();
  });

  it("should prevent nonce replay after simulated crash (consumed set persists)", async () => {
    const nonce = await nonceStore.create(testAddress);

    const firstConsume = await nonceStore.consume(testAddress, nonce);
    expect(firstConsume).toBe(true);

    const pendingKey = `talak:nonce:pending:${testAddress.toLowerCase()}`;
    await redis.del(pendingKey);

    const replayAttempt = await nonceStore.consume(testAddress, nonce);
    expect(replayAttempt).toBe(false);
  });

  it("should handle concurrent consumption atomically", async () => {
    const nonce = await nonceStore.create(testAddress);

    const results = await Promise.all([
      nonceStore.consume(testAddress, nonce),
      nonceStore.consume(testAddress, nonce),
      nonceStore.consume(testAddress, nonce),
    ]);

    const successCount = results.filter((r) => r).length;
    expect(successCount).toBe(1);
  });

  it("should reject non-existent nonce", async () => {
    const result = await nonceStore.consume(testAddress, "nonexistent-nonce");
    expect(result).toBe(false);
  });

  it("should handle expired nonces correctly", async () => {
    const shortTtlStore = new RedisNonceStore({
      redis,
      ttlMs: 100,
    });

    const nonce = await shortTtlStore.create(testAddress);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const result = await shortTtlStore.consume(testAddress, nonce);
    expect(result).toBe(false);
  });

  it("should maintain consumed set with proper TTL", async () => {
    const nonce = await nonceStore.create(testAddress);
    await nonceStore.consume(testAddress, nonce);

    const consumedKey = `talak:nonce:consumed:${testAddress.toLowerCase()}`;
    const exists = await redis.exists(consumedKey);
    expect(exists).toBe(1);

    const ttl = await redis.ttl(consumedKey);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(86400);
  });
});
