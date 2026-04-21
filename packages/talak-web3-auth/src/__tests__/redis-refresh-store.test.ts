import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Redis from 'ioredis';
import { RedisRefreshStore } from '../stores/redis-refresh.js';

const REDIS_URL = process.env.REDIS_URL;
const describeIf = (condition: boolean) => condition ? describe : describe.skip;

describeIf(!!REDIS_URL)('RedisRefreshStore Integration', () => {
  let redis: Redis;
  let store: RedisRefreshStore;

  beforeAll(() => {
    redis = new Redis(REDIS_URL!);
    store = new RedisRefreshStore({ redis });
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('should create and lookup a refresh session', async () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const chainId = 1;
    const ttlMs = 7 * 24 * 60 * 60 * 1000;

    const { token, session } = await store.create(address, chainId, ttlMs);

    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(0);
    expect(session.address).toBe(address.toLowerCase());
    expect(session.chainId).toBe(chainId);
    expect(session.revoked).toBe(false);

    const lookedUp = await store.lookup(token);
    expect(lookedUp).not.toBeNull();
    expect(lookedUp!.address).toBe(address.toLowerCase());
    expect(lookedUp!.chainId).toBe(chainId);
  });

  it('should rotate a refresh token atomically', async () => {
    const address = '0xabcdefabcdefabcdefabcdefabcdefabcdef';
    const chainId = 137;
    const ttlMs = 3600000;

    const { token: oldToken } = await store.create(address, chainId, ttlMs);

    const { token: newToken, session: newSession } = await store.rotate(oldToken, ttlMs);

    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);
    expect(newSession.address).toBe(address.toLowerCase());
    expect(newSession.chainId).toBe(chainId);
    expect(newSession.revoked).toBe(false);

    const oldSession = await store.lookup(oldToken);
    expect(oldSession).not.toBeNull();
    expect(oldSession!.revoked).toBe(true);

    const newSessionLookup = await store.lookup(newToken);
    expect(newSessionLookup).not.toBeNull();
    expect(newSessionLookup!.revoked).toBe(false);
  });

  it('should reject rotation of already revoked token', async () => {
    const address = '0x9999999999999999999999999999999999999999';
    const chainId = 1;
    const ttlMs = 3600000;

    const { token } = await store.create(address, chainId, ttlMs);

    await store.rotate(token, ttlMs);

    await expect(store.rotate(token, ttlMs)).rejects.toThrow('Refresh token already used or revoked');
  });

  it('should reject rotation of expired token', async () => {
    const address = '0x8888888888888888888888888888888888888888';
    const chainId = 1;
    const shortTtlMs = 100;

    const { token } = await store.create(address, chainId, shortTtlMs);

    await new Promise(resolve => setTimeout(resolve, 150));

    await expect(store.rotate(token, shortTtlMs)).rejects.toThrow('Refresh token expired');
  });

  it('should handle concurrent rotation attempts with retry', async () => {
    const address = '0x7777777777777777777777777777777777777777';
    const chainId = 1;
    const ttlMs = 3600000;

    const { token } = await store.create(address, chainId, ttlMs);

    const promises = Array(5).fill(null).map(async (_, i) => {
      try {
        const result = await store.rotate(token, ttlMs);
        return { success: true, index: i, token: result.token };
      } catch (error: any) {
        return { success: false, index: i, error: error.message };
      }
    });

    const results = await Promise.all(promises);

    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(4);

    failures.forEach(failure => {
      expect(
        failure.error.includes('conflict') ||
        failure.error.includes('already used') ||
        failure.error.includes('not found')
      ).toBe(true);
    });
  });

  it('should revoke a refresh token', async () => {
    const address = '0x6666666666666666666666666666666666666666';
    const chainId = 1;
    const ttlMs = 3600000;

    const { token } = await store.create(address, chainId, ttlMs);

    await store.revoke(token);

    const session = await store.lookup(token);
    expect(session).not.toBeNull();
    expect(session!.revoked).toBe(true);

    await expect(store.rotate(token, ttlMs)).rejects.toThrow('Refresh token already used or revoked');
  });

  it('should handle rotation retry on WATCH failures', async () => {
    const address = '0x5555555555555555555555555555555555555555';
    const chainId = 1;
    const ttlMs = 3600000;

    const { token } = await store.create(address, chainId, ttlMs);

    const hash = require('crypto').createHash('sha256').update(token).digest('hex');
    const key = `talak:rt:${hash}`;

    const result = await store.rotate(token, ttlMs);
    expect(result.token).toBeDefined();
    expect(result.session.revoked).toBe(false);
  });

  it('should clean up with TTL', async () => {
    const address = '0x4444444444444444444444444444444444444444';
    const chainId = 1;
    const shortTtlMs = 200;

    const { token } = await store.create(address, chainId, shortTtlMs);

    const hash = require('crypto').createHash('sha256').update(token).digest('hex');
    const key = `talak:rt:${hash}`;

    const existsBefore = await redis.exists(key);
    expect(existsBefore).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 250));

    const existsAfter = await redis.exists(key);
    expect(existsAfter).toBe(0);
  });
});
