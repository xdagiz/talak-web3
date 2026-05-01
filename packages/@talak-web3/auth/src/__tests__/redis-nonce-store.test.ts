import Redis from "ioredis";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { RedisNonceStore } from "../stores/redis-nonce.js";

const REDIS_URL = process.env.REDIS_URL;
const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!REDIS_URL)("RedisNonceStore Integration", () => {
  let redis: Redis;
  let store: RedisNonceStore;

  beforeAll(() => {
    redis = new Redis(REDIS_URL!);
    store = new RedisNonceStore({ redis, ttlMs: 5000 });
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("should create and consume a nonce atomically", async () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const nonce = await store.create(address);

    expect(nonce).toBeDefined();
    expect(nonce.length).toBe(32);

    const consumed = await store.consume(address, nonce);
    expect(consumed).toBe(true);

    const consumedAgain = await store.consume(address, nonce);
    expect(consumedAgain).toBe(false);
  });

  it("should reject invalid nonce", async () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const consumed = await store.consume(address, "invalid-nonce");
    expect(consumed).toBe(false);
  });

  it("should handle concurrent consumption attempts atomically", async () => {
    const address = "0xabcdefabcdefabcdefabcdefabcdefabcdef";
    const nonce = await store.create(address);

    const promises = Array(10)
      .fill(null)
      .map(() => store.consume(address, nonce));

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r === true).length;
    const failCount = results.filter((r) => r === false).length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(9);
  });

  it("should respect TTL expiration", async () => {
    const address = "0x9999999999999999999999999999999999999999";
    const shortTtlStore = new RedisNonceStore({ redis, ttlMs: 100 });

    const nonce = await shortTtlStore.create(address);
    expect(nonce).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 150));

    const consumed = await shortTtlStore.consume(address, nonce);
    expect(consumed).toBe(false);
  });

  it("should handle multiple nonces for same address", async () => {
    const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const nonce1 = await store.create(address);
    const nonce2 = await store.create(address);

    expect(nonce1).not.toBe(nonce2);

    expect(await store.consume(address, nonce1)).toBe(true);
    expect(await store.consume(address, nonce2)).toBe(true);
  });

  it("should be case-insensitive for addresses", async () => {
    const addressLower = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const addressUpper = addressLower.toUpperCase();

    const nonce = await store.create(addressLower);

    const consumed = await store.consume(addressUpper, nonce);
    expect(consumed).toBe(true);
  });

  it("should clean up Redis keys after consumption", async () => {
    const address = "0xcccccccccccccccccccccccccccccccccccccccc";
    const nonce = await store.create(address);

    const key = `talak:nonce:${address.toLowerCase()}:${nonce}`;

    const existsBefore = await redis.exists(key);
    expect(existsBefore).toBe(1);

    await store.consume(address, nonce);

    const existsAfter = await redis.exists(key);
    expect(existsAfter).toBe(0);
  });
});
