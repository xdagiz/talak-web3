import Redis from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
}

export interface RateLimiter {
  check(key: string, cost?: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export function extractSubnet(ip: string): string {
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
local windowStart = now - windowMs

-- Cleanup expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

local currentCount = redis.call('ZCARD', key)
local allowed = 0
local remaining = limit - currentCount

if (currentCount + cost) <= limit then
  allowed = 1
  -- Add entries for each cost unit to correctly track capacity
  for i=1,cost do
    redis.call('ZADD', key, now, now .. ":" .. i .. ":" .. math.random())
  end
  remaining = limit - (currentCount + cost)
end

-- Set expiry to at least the window duration
redis.call('PEXPIRE', key, windowMs)

return { allowed, remaining, now + windowMs }
`;

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

    const res = (await this.redis.eval(
      adaptiveSlidingWindowLua,
      1,
      fullKey,
      String(this.windowMs),
      String(this.capacity),
      String(now),
      String(cost),
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
      await this.redis.zadd(fullKey, now, `${now}:penalty:${i}:${Math.random()}`);
    }
    await this.redis.pexpire(fullKey, this.windowMs);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`rate_limit:${key}`);
  }
}

export function createRateLimiter(opts: {
  redis: Redis;
  capacity: number;
  windowMs: number;
}): RedisRateLimiter {
  return new RedisRateLimiter(opts.redis, opts);
}
