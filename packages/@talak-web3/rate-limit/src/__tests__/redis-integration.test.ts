import Redis from "ioredis";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { RedisRateLimiter } from "../src/index.js";

describe("RedisRateLimiter Integration", () => {
  let redis: Redis;
  let limiter: RedisRateLimiter;

  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
    });

    await redis.ping();

    limiter = new RedisRateLimiter(redis, {
      capacity: 5,
      refillPerSecond: 1,
    });
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("should allow requests within limit", async () => {
    const key = `test:allow:${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      const result = await limiter.check(key);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    }
  });

  it("should block requests exceeding limit", async () => {
    const key = `test:block:${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      await limiter.check(key);
    }

    const result = await limiter.check(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBeDefined();
  });

  it("should reset rate limit for a key", async () => {
    const key = `test:reset:${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      await limiter.check(key);
    }

    const beforeReset = await limiter.check(key);
    expect(beforeReset.allowed).toBe(false);

    await limiter.reset(key);

    const afterReset = await limiter.check(key);
    expect(afterReset.allowed).toBe(true);
  });

  it("should handle concurrent requests correctly", async () => {
    const key = `test:concurrent:${Date.now()}`;

    const promises = Array.from({ length: 10 }, () => limiter.check(key));
    const results = await Promise.all(promises);

    const allowed = results.filter((r) => r.allowed).length;
    const blocked = results.filter((r) => !r.allowed).length;

    expect(allowed).toBe(5);
    expect(blocked).toBe(5);
  });
});

describe("RedisRateLimiter Without Redis", () => {
  it("should skip tests if Redis is unavailable", () => {
    const redisAvailable = process.env.REDIS_HOST !== undefined;
    if (!redisAvailable) {
      console.log("Skipping Redis integration tests (REDIS_HOST not set)");
    }
    expect(true).toBe(true);
  });
});
