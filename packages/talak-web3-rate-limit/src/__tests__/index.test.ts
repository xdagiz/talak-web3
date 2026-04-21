import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRateLimiter } from '../src/index.js';

describe('InMemoryRateLimiter', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({
      capacity: 5,
      refillPerSecond: 1,
    });
  });

  it('should allow requests within limit', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await limiter.check('test-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    }
  });

  it('should block requests exceeding limit', async () => {

    for (let i = 0; i < 5; i++) {
      await limiter.check('test-key');
    }

    const result = await limiter.check('test-key');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBeDefined();
  });

  it('should track different keys independently', async () => {

    for (let i = 0; i < 5; i++) {
      await limiter.check('key1');
    }

    expect((await limiter.check('key1')).allowed).toBe(false);

    expect((await limiter.check('key2')).allowed).toBe(true);
  });

  it('should reset rate limit for a key', async () => {

    for (let i = 0; i < 5; i++) {
      await limiter.check('test-key');
    }

    expect((await limiter.check('test-key')).allowed).toBe(false);

    await limiter.reset('test-key');

    expect((await limiter.check('test-key')).allowed).toBe(true);
  });

  it('should respect cost parameter', async () => {

    const result1 = await limiter.check('test-key', 3);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = await limiter.check('test-key', 2);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(0);

    const result3 = await limiter.check('test-key');
    expect(result3.allowed).toBe(false);
  });
});
