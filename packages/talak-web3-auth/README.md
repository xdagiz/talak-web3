# @talak-web3/auth

Authentication and session management for talak-web3. Provides secure SIWE (Sign-In with Ethereum) authentication with atomic nonce consumption, refresh token rotation, and JWT session management.

## Features

- **SIWE Authentication** - Sign-In with Ethereum (structured SIWE messages; validate production traffic against your threat model)
- **Atomic Nonce Consumption** - In-memory dev stores; **production:** `RedisNonceStore` uses a Redis Lua script for atomic GET+DEL per nonce
- **Refresh Token Rotation** - One-time use refresh tokens with automatic rotation
- **JWT Session Management** - Short-lived access tokens with secure revocation
- **Pluggable Storage** - In-memory (dev), Redis implementations in `@talak-web3/auth/stores`, or custom `NonceStore` / `RefreshStore` / `RevocationStore`

## Installation

```bash
npm install @talak-web3/auth

yarn add @talak-web3/auth

pnpm add @talak-web3/auth
```

## Quick Start

```typescript
import { TalakWeb3Auth, InMemoryNonceStore, InMemoryRefreshStore } from '@talak-web3/auth';

const auth = new TalakWeb3Auth({
  nonceStore: new InMemoryNonceStore(),
  refreshStore: new InMemoryRefreshStore(),
  accessTtlSeconds: 15 * 60,
  refreshTtlSeconds: 7 * 24 * 60 * 60,
});

const nonce = await auth.createNonce('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

const { accessToken, refreshToken } = await auth.loginWithSiwe(message, signature);

const session = await auth.verifySession(accessToken);

const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
  await auth.refresh(refreshToken);
```

## Production Setup

For production, use Redis-backed stores:

```typescript
import Redis from 'ioredis';
import { TalakWeb3Auth } from '@talak-web3/auth';
import { RedisNonceStore, RedisRefreshStore, RedisRevocationStore } from '@talak-web3/auth/stores';

const redis = new Redis(process.env.REDIS_URL!);

const auth = new TalakWeb3Auth({
  nonceStore: new RedisNonceStore({ redis }),
  refreshStore: new RedisRefreshStore({ redis }),
  revocationStore: new RedisRevocationStore({ redis }),
  expectedDomain: 'yourdomain.com',
  accessTtlSeconds: 900,
  refreshTtlSeconds: 604800,
});
```

Use one shared `ioredis` client for all three stores (or separate clients pointing at the same Redis, depending on your pooling strategy).

## API Reference

### TalakWeb3Auth

Main authentication class.

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `nonceStore` | `NonceStore` | `InMemoryNonceStore` | Store for SIWE nonces |
| `refreshStore` | `RefreshStore` | `InMemoryRefreshStore` | Store for refresh tokens |
| `revocationStore` | `RevocationStore` | `InMemoryRevocationStore` | Store for revoked JWTs |
| `accessTtlSeconds` | `number` | `900` | Access token TTL in seconds |
| `refreshTtlSeconds` | `number` | `604800` | Refresh token TTL in seconds |
| `expectedDomain` | `string` | - | Expected SIWE domain |

#### Methods

- `createNonce(address: string): Promise<string>` - Generate a new nonce
- `loginWithSiwe(message: string, signature: string): Promise<TokenPair>` - Authenticate with SIWE
- `verifySession(token: string): Promise<SessionPayload>` - Verify access token
- `refresh(token: string): Promise<TokenPair>` - Rotate refresh token
- `revokeSession(accessToken: string, refreshToken?: string): Promise<void>` - Revoke session

## Security

- Nonces are single-use and expire after 5 minutes
- Refresh tokens are rotated on each use (one-time use)
- Access tokens are short-lived (15 minutes by default)
- All tokens are cryptographically secure random strings
- Addresses are normalized to lowercase for consistency

## License

MIT
