import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import { RedisRevocationStore } from '../stores/redis-revocation.js';

const REDIS_URL = process.env.REDIS_URL;
const describeIf = (condition: boolean) => condition ? describe : describe.skip;

describeIf(!!REDIS_URL)('RedisRevocationStore Integration', () => {
  let redis: Redis;
  let store: RedisRevocationStore;

  beforeAll(() => {
    redis = new Redis(REDIS_URL!);
    store = new RedisRevocationStore({ redis });
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should revoke and check JTI', async () => {
    const jti = 'test-jti-123';
    const expiresAtMs = Date.now() + 3600000;

    expect(await store.isRevoked(jti)).toBe(false);

    await store.revoke(jti, expiresAtMs);

    expect(await store.isRevoked(jti)).toBe(true);
  });

  it('should handle multiple JTIs independently', async () => {
    const jti1 = 'jti-alpha';
    const jti2 = 'jti-beta';
    const expiresAtMs = Date.now() + 3600000;

    await store.revoke(jti1, expiresAtMs);

    expect(await store.isRevoked(jti1)).toBe(true);
    expect(await store.isRevoked(jti2)).toBe(false);

    await store.revoke(jti2, expiresAtMs);
    expect(await store.isRevoked(jti2)).toBe(true);
  });

  it('should respect TTL expiration', async () => {
    const jti = 'jti-short-lived';
    const shortTtlMs = 150;

    await store.revoke(jti, Date.now() + shortTtlMs);
    expect(await store.isRevoked(jti)).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(await store.isRevoked(jti)).toBe(false);
  });

  it('should handle high concurrency revocation checks', async () => {
    const jti = 'jti-concurrent';
    const expiresAtMs = Date.now() + 3600000;

    await store.revoke(jti, expiresAtMs);

    const promises = Array(50).fill(null).map(() =>
      store.isRevoked(jti)
    );

    const results = await Promise.all(promises);

    const allRevoked = results.every(r => r === true);
    expect(allRevoked).toBe(true);
  });

  it('should handle concurrent revocations gracefully', async () => {
    const jti = 'jti-multi-revoke';
    const expiresAtMs = Date.now() + 3600000;

    const promises = Array(10).fill(null).map(() =>
      store.revoke(jti, expiresAtMs)
    );

    await expect(Promise.all(promises)).resolves.not.toThrow();

    expect(await store.isRevoked(jti)).toBe(true);
  });

  it('should clean up expired JTIs automatically', async () => {
    const jti = 'jti-cleanup-test';
    const shortTtlMs = 100;

    await store.revoke(jti, Date.now() + shortTtlMs);

    const key = `talak:jti:${jti}`;

    const existsBefore = await redis.exists(key);
    expect(existsBefore).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 150));

    const existsAfter = await redis.exists(key);
    expect(existsAfter).toBe(0);
  });

  it('should handle rapid revoke and check cycles', async () => {
    const iterations = 20;
    const expiresAtMs = Date.now() + 3600000;

    for (let i = 0; i < iterations; i++) {
      const jti = `jti-rapid-${i}`;

      await store.revoke(jti, expiresAtMs);
      const isRevoked = await store.isRevoked(jti);

      expect(isRevoked).toBe(true);
    }
  });

  it('should handle non-existent JTI gracefully', async () => {
    const nonExistentJti = 'jti-does-not-exist';

    expect(await store.isRevoked(nonExistentJti)).toBe(false);
  });

  it('should support custom key prefix', async () => {
    const customStore = new RedisRevocationStore({
      redis,
      keyPrefix: 'custom:prefix:'
    });

    const jti = 'jti-custom-prefix';
    const expiresAtMs = Date.now() + 3600000;

    await customStore.revoke(jti, expiresAtMs);

    const key = `custom:prefix:${jti}`;
    const exists = await redis.exists(key);
    expect(exists).toBe(1);

    await redis.del(key);
  });

  it('should maintain consistency under load', async () => {
    const numJTIs = 100;
    const expiresAtMs = Date.now() + 3600000;

    const jtiList = Array(numJTIs).fill(null).map((_, i) => `jti-load-${i}`);

    await Promise.all(
      jtiList.map(jti => store.revoke(jti, expiresAtMs))
    );

    const checkResults = await Promise.all(
      jtiList.map(jti => store.isRevoked(jti))
    );

    const allRevoked = checkResults.every(r => r === true);
    expect(allRevoked).toBe(true);

    await Promise.all(
      jtiList.map(jti => redis.del(`talak:jti:${jti}`))
    );
  });
});
