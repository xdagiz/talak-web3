import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedisNonceStore, RedisRefreshStore } from './stores.js';
import { rateLimitRedis } from './rateLimit.js';
import type { RedisClientType } from 'redis';

// ---------------------------------------------------------------------------
// Redis mock factory
// Simulates an in-process key-value store with hash and eval support.
// ---------------------------------------------------------------------------

type HMap = Record<string, string>;

function createRedisMock() {
  const db = new Map<string, HMap>();
  const ttls = new Map<string, number>(); // key → absolute expiry ms

  function isExpired(key: string): boolean {
    const exp = ttls.get(key);
    return exp !== undefined && Date.now() > exp;
  }

  function getHash(key: string): HMap | null {
    if (!db.has(key) || isExpired(key)) return null;
    return db.get(key) ?? null;
  }

  const mock = {
    isOpen: true,
    hSet: vi.fn(async (key: string, fields: HMap) => {
      const existing = db.get(key) ?? {};
      db.set(key, { ...existing, ...fields });
    }),
    hGet: vi.fn(async (key: string, field: string) => {
      return getHash(key)?.[field] ?? null;
    }),
    hGetAll: vi.fn(async (key: string) => {
      return getHash(key) ?? {};
    }),
    pExpire: vi.fn(async (key: string, ms: number) => {
      ttls.set(key, Date.now() + ms);
    }),
    // Simplified eval: for our Lua scripts we parse the arguments and run the logic in JS
    eval: vi.fn(async (lua: string, { keys, arguments: args }: { keys: string[]; arguments?: string[] }) => {
      const argv = args ?? [];
      const key = keys[0]!;
      const now = Date.now();

      // Nonce consume Lua
      if (lua.includes('consumed')) {
        const h = getHash(key);
        if (!h) return 0;
        const expiresAt = Number(h['expiresAt'] ?? '0');
        if (now > expiresAt) return 0;
        if (h['consumed'] !== '0') return 0;
        h['consumed'] = '1';
        db.set(key, h);
        return 1;
      }

      // Refresh rotate Lua
      if (lua.includes('HMSET') && keys.length > 1) {
        const oldKey = keys[0]!;
        const newKey = keys[1]!;
        const h = getHash(oldKey);
        if (!h) return 0;
        if (h['revoked'] === '1') return 0;
        const expiresAt = Number(h['expiresAt'] ?? '0');
        if (now > expiresAt) return 0;

        h['revoked'] = '1';
        db.set(oldKey, h);

        const ttlMs = Number(argv[0] ?? '0');
        const newId = argv[1] ?? '';
        const newHash = argv[2] ?? '';
        const newExpiresAt = now + ttlMs;

        db.set(newKey, {
          id: newId,
          address: h['address'] ?? '',
          chainId: h['chainId'] ?? '1',
          hash: newHash,
          expiresAt: String(newExpiresAt),
          revoked: '0',
        });
        ttls.set(newKey, now + ttlMs);
        return [String(newExpiresAt), h['address'] ?? '', h['chainId'] ?? '1'];
      }

      // Sliding-window rate limiter Lua
      if (lua.includes('ZREMRANGEBYSCORE') && lua.includes('ZCARD')) {
        const windowMs = Number(argv[0] ?? '1000');
        const limit = Number(argv[1] ?? '10');
        const tsRaw = (db.get(key)?.['events'] ?? '').split(',').filter(Boolean).map(Number);
        const windowStart = now - windowMs;
        const kept = tsRaw.filter((t) => t > windowStart);
        const currentCount = kept.length;
        let allowed = 0;
        let remaining = limit - currentCount;
        if (currentCount < limit) {
          allowed = 1;
          kept.push(now);
          remaining -= 1;
        }
        db.set(key, { events: kept.join(',') });
        ttls.set(key, now + windowMs);
        return [allowed, remaining];
      }

      return 0;
    }),
    on: vi.fn(),
    connect: vi.fn(async () => undefined),
    // Expose db for test inspection
    _db: db,
    _ttls: ttls,
  };

  return mock as unknown as RedisClientType & typeof mock;
}

// ---------------------------------------------------------------------------
// RedisNonceStore
// ---------------------------------------------------------------------------

describe('RedisNonceStore', () => {
  let redis: ReturnType<typeof createRedisMock>;
  let store: RedisNonceStore;

  beforeEach(() => {
    vi.useFakeTimers();
    redis = createRedisMock();
    store = new RedisNonceStore(redis, 5 * 60_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  it('creates a nonce and records it in Redis', async () => {
    const nonce = await store.create(ADDRESS);
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
    expect(redis.hSet).toHaveBeenCalled();
    expect(redis.pExpire).toHaveBeenCalled();
  });

  it('consume succeeds on valid nonce', async () => {
    const nonce = await store.create(ADDRESS);
    expect(await store.consume(ADDRESS, nonce)).toBe(true);
  });

  it('nonce reuse → second consume returns false', async () => {
    const nonce = await store.create(ADDRESS);
    await store.consume(ADDRESS, nonce);
    expect(await store.consume(ADDRESS, nonce)).toBe(false);
  });

  it('expired nonce → consume returns false', async () => {
    const nonce = await store.create(ADDRESS);
    vi.advanceTimersByTime(5 * 60_000 + 1);
    expect(await store.consume(ADDRESS, nonce)).toBe(false);
  });

  it('unknown nonce → consume returns false', async () => {
    expect(await store.consume(ADDRESS, 'deadbeefcafe')).toBe(false);
  });

  it('constructor warns and clamps TTL > 5 min', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = new RedisNonceStore(redis, 10 * 60_000);
    expect(warnSpy).toHaveBeenCalled();
    expect((s as unknown as { ttlMs: number }).ttlMs).toBe(5 * 60_000);
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// RedisRefreshStore
// ---------------------------------------------------------------------------

describe('RedisRefreshStore', () => {
  let redis: ReturnType<typeof createRedisMock>;
  let store: RedisRefreshStore;

  const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const CHAIN_ID = 1;
  const TTL = 7 * 24 * 60 * 60_000;

  beforeEach(() => {
    vi.useFakeTimers();
    redis = createRedisMock();
    store = new RedisRefreshStore(redis);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a session and returns opaque token + session', async () => {
    const { token, session } = await store.create(ADDRESS, CHAIN_ID, TTL);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).not.toBe(3); // not a JWT
    expect(session.chainId).toBe(CHAIN_ID);
    expect(session.address).toBe(ADDRESS.toLowerCase());
    expect(session.revoked).toBe(false);
  });

  it('lookup returns session by token', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    const session = await store.lookup(token);
    expect(session?.address).toBe(ADDRESS.toLowerCase());
    expect(session?.chainId).toBe(CHAIN_ID);
  });

  it('rotate revokes old session and issues new', async () => {
    const { token: t1 } = await store.create(ADDRESS, CHAIN_ID, TTL);
    const { token: t2, session } = await store.rotate(t1, TTL);
    expect(t2).not.toBe(t1);
    expect(session.chainId).toBe(CHAIN_ID);
    // Old session should be marked revoked
    const old = await store.lookup(t1);
    expect(old?.revoked).toBe(true);
  });

  it('refresh reuse → second rotate throws', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.rotate(token, TTL);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });

  it('expired refresh → rotate throws', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, 1000);
    vi.advanceTimersByTime(2000);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });

  it('revoke sets revoked flag', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.revoke(token);
    const session = await store.lookup(token);
    expect(session?.revoked).toBe(true);
  });

  it('rotate on explicitly-revoked session throws', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.revoke(token);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });

  it('lookup of unknown token returns null', async () => {
    expect(await store.lookup('notarealtoken')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

describe('rateLimitRedis', () => {
  let redis: ReturnType<typeof createRedisMock>;

  beforeEach(() => {
    vi.useFakeTimers();
    redis = createRedisMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const KEY = 'rl:test:key';
  const CAPACITY = 5;
  const REFILL = 1; // 1 token/sec

  it('allows up to capacity requests', async () => {
    for (let i = 0; i < CAPACITY; i++) {
      const result = await rateLimitRedis(redis, KEY, { capacity: CAPACITY, refillPerSecond: REFILL });
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks after capacity is exhausted → HTTP 429', async () => {
    for (let i = 0; i < CAPACITY; i++) {
      await rateLimitRedis(redis, KEY, { capacity: CAPACITY, refillPerSecond: REFILL });
    }
    const blocked = await rateLimitRedis(redis, KEY, { capacity: CAPACITY, refillPerSecond: REFILL });
    expect(blocked.allowed).toBe(false);
  });

  it('allows again after refill time', async () => {
    for (let i = 0; i < CAPACITY; i++) {
      await rateLimitRedis(redis, KEY, { capacity: CAPACITY, refillPerSecond: REFILL });
    }
    // Sliding window is (capacity / refillPerSecond) * 1000 ms — advance past the window so one slot frees.
    vi.advanceTimersByTime(5100);
    const result = await rateLimitRedis(redis, KEY, { capacity: CAPACITY, refillPerSecond: REFILL });
    expect(result.allowed).toBe(true);
  });
});
