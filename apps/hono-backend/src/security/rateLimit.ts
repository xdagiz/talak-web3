import type { MiddlewareHandler } from 'hono';
import type { RedisClientType } from 'redis';

export type TokenBucketConfig = {
  capacity: number;
  refillPerSecond: number;
};

const adaptiveSlidingWindowLua = `
-- KEYS[1] = limit key
-- ARGV[1] = windowMs
-- ARGV[2] = limit
-- ARGV[3] = now
-- ARGV[4] = cost
-- returns: { allowed(0/1), remaining }

local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4]) or 1
local windowStart = now - windowMs

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

local currentCount = redis.call('ZCARD', key)
local allowed = 0
local remaining = limit - currentCount

if (currentCount + cost) <= limit then
  allowed = 1
  for i=1,cost do
    redis.call('ZADD', key, now, now .. ":" .. i .. ":" .. math.random())
  end
  remaining = limit - (currentCount + cost)
end

redis.call('PEXPIRE', key, windowMs)

return { allowed, remaining }
`;

export async function rateLimitRedis(
  redis: RedisClientType,
  key: string,
  cfg: TokenBucketConfig,
  cost = 1,
): Promise<{ allowed: boolean; remaining: number }> {
  const windowMs = (cfg.capacity / cfg.refillPerSecond) * 1000;
  const now = Date.now();

  const res = await redis.eval(adaptiveSlidingWindowLua, {
    keys: [key],
    arguments: [String(windowMs), String(cfg.capacity), String(now), String(cost)],
  }) as unknown;

  if (!Array.isArray(res) || res.length < 2) return { allowed: false, remaining: 0 };
  const allowed = Number(res[0]) === 1;
  const remaining = Math.max(0, Number(res[1]));
  return { allowed, remaining };
}

export function rateLimitMiddleware(opts: {
  redis: RedisClientType;
  bucket: TokenBucketConfig;
  keyFn: (c: Parameters<MiddlewareHandler>[0]) => string;
}): MiddlewareHandler {
  return async (c, next) => {
    const key = opts.keyFn(c);
    const result = await rateLimitRedis(opts.redis, key, opts.bucket, 1);
    if (!result.allowed) {
      c.header('Retry-After', '1');
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    await next();
  };
}
