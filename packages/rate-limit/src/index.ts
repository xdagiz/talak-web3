import type Redis from "ioredis";

/** Result of a rate limit check indicating whether the request is allowed. */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
}

/** Interface for rate limiter implementations (in-memory or Redis-backed). */
export interface RateLimiter {
  check(key: string, cost?: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

/** Extracts a subnet from an IP address for rate limit grouping (IPv4 /30, IPv6 /64). */
export function extractSubnet(ip: string): string {
  const ipv4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4Mapped?.[1]) {
    ip = ipv4Mapped[1];
  }

  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(":") + "::/64";
    }

    return ip.split("::")[0] + "::/64";
  }

  const octets = ip.split(".");
  if (octets.length === 4) {
    const lastOctet = parseInt(octets[3] || "0", 10);
    const subnetLastOctet = lastOctet & 0xfc;
    return `${octets[0]}.${octets[1]}.${octets[2]}.${subnetLastOctet}/30`;
  }

  throw new Error(`Invalid IP format: ${ip}`);
}

export function normalizeIpForRateLimit(ip: string): string {
  try {
    return extractSubnet(ip);
  } catch {
    return ip;
  }
}

const adaptiveSlidingWindowLua = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4]) or 1
local memberPrefix = ARGV[5]
local windowStart = now - windowMs

-- Cleanup expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

local currentCount = redis.call('ZCARD', key)
local allowed = 0
local remaining = limit - currentCount

if (currentCount + cost) <= limit then
  allowed = 1
  for i=1,cost do
    redis.call('ZADD', key, now, memberPrefix .. ":" .. i)
  end
  remaining = limit - (currentCount + cost)
end

-- Set expiry to at least the window duration
redis.call('PEXPIRE', key, windowMs)

return { allowed, remaining, now + windowMs }
`;

/** Options for configuring the in-memory token bucket rate limiter. */
export interface InMemoryRateLimiterOptions {
  capacity: number;
  refillPerSecond: number;
  maxBuckets?: number;
}

/** Token bucket rate limiter using in-memory storage. Suitable for single-instance deployments. */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly maxBuckets: number;
  private readonly buckets = new Map<string, { tokens: number; last: number }>();

  constructor(opts: InMemoryRateLimiterOptions) {
    this.capacity = opts.capacity;
    this.refillPerSecond = opts.refillPerSecond;
    this.maxBuckets = opts.maxBuckets ?? 10_000;
  }

  private bucket(key: string): { tokens: number; last: number } {
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.capacity, last: Date.now() };
      this.buckets.set(key, b);
      this.evictIfNeeded();
    }
    return b;
  }

  private evictIfNeeded(): void {
    if (this.buckets.size <= this.maxBuckets) return;
    let oldestKey: string | undefined;
    let oldestLast = Infinity;
    for (const [k, v] of this.buckets) {
      if (v.last < oldestLast) {
        oldestLast = v.last;
        oldestKey = k;
      }
    }
    if (oldestKey) this.buckets.delete(oldestKey);
  }

  private refill(b: { tokens: number; last: number }): void {
    const now = Date.now();
    const elapsedSeconds = (now - b.last) / 1000;
    if (elapsedSeconds > 0) {
      b.tokens = Math.min(this.capacity, b.tokens + elapsedSeconds * this.refillPerSecond);
      b.last = now;
    }
  }

  async check(key: string, cost = 1): Promise<RateLimitResult> {
    const b = this.bucket(key);
    this.refill(b);

    if (b.tokens >= cost) {
      b.tokens -= cost;
      return {
        allowed: true,
        remaining: Math.max(0, Math.floor(b.tokens)),
        resetAt: Date.now() + ((this.capacity - b.tokens) / this.refillPerSecond) * 1000,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + ((cost - b.tokens) / this.refillPerSecond) * 1000,
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }
}

/** Redis-backed sliding window rate limiter for distributed deployments. */
export class RedisRateLimiter implements RateLimiter {
  private readonly redis: Redis;
  private readonly capacity: number;
  private readonly windowMs: number;

  constructor(redis: Redis, opts: { capacity: number; windowMs: number }) {
    if (!redis) throw new Error("Redis client required for distributed rate limiting");
    this.redis = redis;
    this.capacity = opts.capacity;
    this.windowMs = opts.windowMs;
  }

  async check(key: string, cost = 1): Promise<RateLimitResult> {
    const fullKey = `rate_limit:${key}`;
    const now = Date.now();
    const memberPrefix =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${now}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

    const res = (await this.redis.eval(
      adaptiveSlidingWindowLua,
      1,
      fullKey,
      String(this.windowMs),
      String(this.capacity),
      String(now),
      String(cost),
      memberPrefix,
    )) as unknown;

    if (!Array.isArray(res) || res.length < 3) {
      return { allowed: false, remaining: 0 };
    }

    return {
      allowed: Number(res[0]) === 1,
      remaining: Math.max(0, Number(res[1])),
      resetAt: Number(res[2]),
    };
  }

  async penalize(key: string, cost: number): Promise<void> {
    const fullKey = `rate_limit:${key}`;
    const now = Date.now();

    for (let i = 0; i < cost; i++) {
      const unique =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${now}-${i}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      await this.redis.zadd(fullKey, now, `${now}:penalty:${i}:${unique}`);
    }
    await this.redis.pexpire(fullKey, this.windowMs);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`rate_limit:${key}`);
  }
}

/** Creates a rate limiter instance based on the provided configuration. */
export function createRateLimiter(opts: {
  redis: Redis;
  capacity: number;
  windowMs: number;
}): RedisRateLimiter {
  return new RedisRateLimiter(opts.redis, opts);
}

/** Formats rate limit result into standard HTTP headers. */
export function rateLimitHeaders(
  remaining: number,
  limit: number,
  resetMs: number,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
  };
}
