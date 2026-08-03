# @talak-web3/rate-limit

Rate limiting utilities for talak-web3 with both in-memory and Redis-backed implementations.

## Installation

```bash
npm install @talak-web3/rate-limit

yarn add @talak-web3/rate-limit

pnpm add @talak-web3/rate-limit
```

## Usage

### In-Memory (Development/Testing)

```typescript
import { InMemoryRateLimiter } from "@talak-web3/rate-limit";

const limiter = new InMemoryRateLimiter({
  capacity: 10,
  refillPerSecond: 1,
});

const result = await limiter.check("user:123");
if (result.allowed) {
  console.log(`Allowed! ${result.remaining} requests remaining`);
} else {
  console.log(`Rate limited. Try again at ${new Date(result.resetAt!).toISOString()}`);
}
```

### Redis (Production)

```typescript
import Redis from "ioredis";
import { RedisRateLimiter } from "@talak-web3/rate-limit";

const redis = new Redis(process.env.REDIS_URL);

const limiter = new RedisRateLimiter(redis, {
  capacity: 100,
  windowMs: 60000, // 1 minute window
});

const result = await limiter.check("ip:192.168.1.1");
```

### Factory Function (Redis only)

```typescript
import Redis from "ioredis";
import { createRateLimiter } from "@talak-web3/rate-limit";

const redis = new Redis(process.env.REDIS_URL);

const limiter = createRateLimiter({
  redis,
  capacity: 100,
  windowMs: 60000,
});

const result = await limiter.check("ip:192.168.1.1");
```

## API

### `InMemoryRateLimiter`

Token bucket rate limiter using in-memory storage. Suitable for single-instance deployments.

#### Constructor Options

- `capacity`: Maximum number of requests allowed
- `refillPerSecond`: Rate at which tokens are refilled
- `maxBuckets?: number` - Maximum number of unique keys (default: 10,000)

### `RedisRateLimiter`

Redis-backed sliding window rate limiter for distributed deployments.

#### Constructor

```typescript
new RedisRateLimiter(redis: Redis, opts: { capacity: number; windowMs: number })
```

### `createRateLimiter(opts)`

Factory function returning a `RedisRateLimiter`:

```typescript
createRateLimiter({ redis, capacity, windowMs });
```

### `RateLimiter` Interface

```typescript
interface RateLimiter {
  check(key: string, cost?: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
}
```

### `rateLimitHeaders()`

Formats a rate limit result into standard HTTP headers.

```typescript
import { rateLimitHeaders } from "@talak-web3/rate-limit";

const headers = rateLimitHeaders(result.remaining, 100, result.resetAt ?? Date.now() + 60000);
```

## Algorithms

### Token Bucket (In-Memory)

- Simple token bucket algorithm
- Tokens refill at a constant rate
- Good for single-process applications

### Sliding Window (Redis)

- Uses Redis sorted sets for precise rate limiting
- Works across multiple processes/servers
- Atomic operations via Lua scripts

## License

MIT
