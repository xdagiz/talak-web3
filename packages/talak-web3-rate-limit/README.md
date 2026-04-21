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
import { createRateLimiter } from '@talak-web3/rate-limit';

const limiter = createRateLimiter({
  type: 'memory',
  capacity: 10,
  refillPerSecond: 1,
});

const result = await limiter.check('user:123');
if (result.allowed) {
  console.log(`Allowed! ${result.remaining} requests remaining`);
} else {
  console.log(`Rate limited. Try again at ${new Date(result.resetAt!).toISOString()}`);
}
```

### Redis (Production)

```typescript
import Redis from 'ioredis';
import { createRateLimiter } from '@talak-web3/rate-limit';

const redis = new Redis(process.env.REDIS_URL);

const limiter = createRateLimiter({
  type: 'redis',
  redis,
  capacity: 100,
  refillPerSecond: 10,
});

const result = await limiter.check('ip:192.168.1.1');
```

## API

### `createRateLimiter(opts)`

Factory function that returns a rate limiter instance.

#### Options

- `type`: `'memory'` or `'redis'`
- `capacity`: Maximum number of requests allowed
- `refillPerSecond`: Rate at which tokens are refilled
- `redis`: Redis client instance (required for `type: 'redis'`)

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
