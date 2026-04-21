# talak-web3

> Production-grade Web3 backend toolkit for server-side SIWE authentication, resilient RPC routing, and account abstraction.

[![GitHub version](https://img.shields.io/github/v/package/dagimabebe/talak-web3?logo=github&label=github%20package)](https://github.com/dagimabebe/talak-web3/pkgs/npm/talak-web3)
[![npm version](https://img.shields.io/npm/v/talak-web3?logo=npm&label=npm%20package)](https://www.npmjs.com/package/talak-web3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=20.12](https://img.shields.io/badge/node-%3E%3D20.12-brightgreen)](https://nodejs.org)

## Overview

`talak-web3` is a unified SDK that provides the infrastructure layer for production Web3 applications. It solves common backend challenges in decentralized app development:

- **Server-authoritative authentication** — SIWE (Sign-In with Ethereum) with server-side session management, JWT issuance, and refresh token rotation
- **Resilient RPC routing** — Multi-provider failover with health tracking and automatic recovery
- **Replay-resistant security** — Atomic nonce consumption, token rotation, and revocation mechanisms
- **Type-safe development** — Full TypeScript support with generated types across all packages
- **Extensible architecture** — Plugin system with middleware chains for custom behavior

## Installation

### From GitHub Packages (Recommended)

```bash
npm install @dagimabebe/talak-web3@1.0.9
```

### From npm

```bash
npm install talak-web3@1.0.9
```

**Requirements:** Node.js >= 20.12.0

## Quick Start

### Basic Setup

```typescript
import { talakWeb3, MainnetPreset } from 'talak-web3';

const app = talakWeb3({
  ...MainnetPreset,
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET,
  },
});

await app.init();

const nonce = await app.auth.createNonce('0x...');
const result = await app.rpc.request('eth_blockNumber');
```

### React Integration

```tsx
import { TalakWeb3Provider, useAccount, useChain } from 'talak-web3/react';

function App() {
  return (
    <TalakWeb3Provider>
      <YourComponent />
    </TalakWeb3Provider>
  );
}

function YourComponent() {
  const { address, isConnected } = useAccount();
  const { chain } = useChain();

  if (!isConnected) return <ConnectWallet />;

  return <div>Connected: {address}</div>;
}
```

### Multi-Chain Support

```typescript
import { talakWeb3, MainnetPreset, PolygonPreset } from 'talak-web3';
import { MultiChainRouter } from 'talak-web3/multichain';

const app = talakWeb3({
  chains: [MainnetPreset, PolygonPreset],
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET,
  },
});

const router = new MultiChainRouter(app.context);
const ethBlock = await router.request(1, 'eth_blockNumber');
const polygonBlock = await router.request(137, 'eth_blockNumber');
```

## Core Concepts

### Instance lifecycle

`talakWeb3()` returns a **new instance** on each call (no global singleton state).
`__resetTalakWeb3()` is retained for backwards compatibility and is a **no-op**.

### Authentication Flow

The SDK implements a secure SIWE authentication flow with short-lived JWTs and rotating refresh tokens:

```typescript
import { talakWeb3 } from 'talak-web3';

const app = talakWeb3({ auth: { domain: 'yourdapp.com', secret: process.env.JWT_SECRET }});

const nonce = await app.auth.createNonce(address);

const { accessToken, refreshToken } = await app.auth.loginWithSiwe(signedMessage, signature);

const payload = await app.auth.verifySession(accessToken);

const { accessToken: newAccess, refreshToken: newRefresh } = await app.auth.refresh(refreshToken);

await app.auth.revokeSession(accessToken, refreshToken);
```

### Production Configuration

For production deployments, configure Redis-backed stores for atomic operations:

```typescript
import { talakWeb3 } from 'talak-web3';
import { RedisNonceStore, RedisRefreshStore, RedisRevocationStore } from '@talak-web3/auth/stores';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const app = talakWeb3({
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET,
    nonceStore: new RedisNonceStore(redis),
    refreshStore: new RedisRefreshStore(redis),
    revocationStore: new RedisRevocationStore(redis),
    accessTtlSeconds: 900,
    refreshTtlSeconds: 604800,
  },
  rpc: {
    providers: [
      { url: process.env.RPC_URL_PRIMARY, priority: 1 },
      { url: process.env.RPC_URL_BACKUP, priority: 2 },
    ],
  },
});
```

## Package Exports

### Main Entry Point

```typescript
import {
  talakWeb3,
  __resetTalakWeb3,
  TalakWeb3Client,
  InMemoryTokenStorage,
  CookieTokenStorage,
  MainnetPreset,
  PolygonPreset,
  ConfigManager,
  MultiChainRouter,
  estimateEip1559Fees,
} from 'talak-web3';
```

### Type Exports

```typescript
import type {
  TalakWeb3Instance,
  TalakWeb3Context,
  TalakWeb3Plugin,
  TalakWeb3BaseConfig,
  TokenStorage,
  NonceResponse,
  LoginResponse,
  RefreshResponse,
  VerifyResponse,
} from 'talak-web3';
```

### Subpath Exports

```typescript
import { MultiChainRouter } from 'talak-web3/multichain';

import {
  TalakWeb3Provider,
  useTalakWeb3,
  useAccount,
  useChain,
} from 'talak-web3/react';
```

## Ecosystem Packages

The `talak-web3` monorepo includes scoped packages for modular usage:

| Package | Description | Install |
|---------|-------------|---------|
| `@talak-web3/core` | Core orchestrator and singleton factory | `npm install @talak-web3/core` |
| `@talak-web3/auth` | SIWE authentication and session management | `npm install @talak-web3/auth` |
| `@talak-web3/rpc` | RPC provider routing and failover | `npm install @talak-web3/rpc` |
| `@talak-web3/client` | HTTP client with token management | `npm install @talak-web3/client` |
| `@talak-web3/hooks` | React hooks and context providers | `npm install @talak-web3/hooks` |
| `@talak-web3/config` | Configuration presets and validation | `npm install @talak-web3/config` |
| `@talak-web3/tx` | Account abstraction and gasless transactions | `npm install @talak-web3/tx` |
| `@talak-web3/types` | Shared TypeScript types | `npm install @talak-web3/types` |
| `@talak-web3/errors` | Standardized error classes | `npm install @talak-web3/errors` |
| `@talak-web3/rate-limit` | Rate limiting (memory and Redis) | `npm install @talak-web3/rate-limit` |
| `@talak-web3/cli` | CLI scaffolding tools | `npm install -g @talak-web3/cli` |

## Security Architecture

### Fail-Closed Design

All security-critical operations follow a fail-closed posture:
- If Redis is unavailable → authentication endpoints return `503 Service Unavailable`
- If rate limiter cannot verify quotas → request is blocked
- If signature verification fails → session is not issued

### Replay Protection

- **Nonce consumption**: Each nonce can only be used once, enforced atomically
- **Token rotation**: Refresh tokens are rotated on every use; old tokens are immediately revoked
- **Session revocation**: Revoking a refresh token invalidates the entire session hierarchy

## API Reference

### `talakWeb3(config)`

Creates or returns the singleton application instance.

**Parameters:**
- `config` — Configuration object or preset (see `MainnetPreset`, `PolygonPreset`)

**Returns:**
- `TalakWeb3Instance` — Application instance with `auth`, `rpc`, `context`, and other capabilities

**Example:**
```typescript
const app = talakWeb3({
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET,
  },
  rpc: {
    providers: [
      { url: 'https://eth.llamarpc.com', priority: 1 },
      { url: 'https://rpc.ankr.com/eth', priority: 2 },
    ],
  },
});
```

### `app.auth`

Authentication and session management interface.

**Methods:**
- `createNonce(address: string)` — Generate a nonce for SIWE authentication
- `loginWithSiwe(message: string, signature: string)` — Verify SIWE message and issue tokens
- `verifySession(accessToken: string)` — Validate JWT and return session payload
- `refresh(refreshToken: string)` — Rotate refresh token and issue new access token
- `revokeSession(accessToken: string, refreshToken: string)` — Revoke both tokens
- `validateJwt(token: string)` — Quick validation check (returns boolean)

### `app.rpc`

RPC provider with automatic failover.

**Methods:**
- `request(method: string, params?: any[])` — Send JSON-RPC request
- `stop()` — Stop health checks
- `start(intervalMs?: number)` — Start/resume health checks

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** (production) | Secret key for JWT signing (min 32 characters) |
| `REDIS_URL` | **Yes** (production) | Redis connection string for session storage |
| `NODE_ENV` | No | Environment (`development` or `production`) |
| `LOG_FORMAT` | No | Set to `json` for structured logging |
| `SIWE_DOMAIN` | No | SIWE domain override (defaults to auth.domain) |

## Examples

See the [`apps/`](https://github.com/dagimabebe/talak-web3/tree/main/apps) directory for complete example applications:

- **Next.js dApp** — Full-stack application with SIWE authentication
- **Hono Backend** — API server with auth endpoints
- **React Native dApp** — Mobile application integration
- **Minimal Auth** — Standalone authentication example
- **RPC Dashboard** — RPC provider monitoring interface

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/dagimabebe/talak-web3/blob/main/CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/dagimabebe/talak-web3.git
cd talak-web3

pnpm install

pnpm build

pnpm test

pnpm test:coverage

pnpm lint

pnpm typecheck
```

## Documentation

- [Getting Started](https://github.com/dagimabebe/talak-web3/blob/main/docs/MINIMAL_SETUP.md) — First steps with talak-web3
- [Architecture](https://github.com/dagimabebe/talak-web3/blob/main/docs/ARCHITECTURE.md) — System design and patterns
- [Security](https://github.com/dagimabebe/talak-web3/blob/main/docs/SECURITY_ARCHITECTURE.md) — Security architecture and threat model
- [API Reference](https://docs.talak.dev/api) — Complete API documentation
- [Package Ecosystem](https://github.com/dagimabebe/talak-web3/blob/main/docs/PACKAGE_ECOSYSTEM.md) — Published package catalog
- [Troubleshooting](https://github.com/dagimabebe/talak-web3/blob/main/docs/TROUBLESHOOTING.md) — Common issues and solutions

## License

MIT © [Dagim Abebe](https://github.com/dagimabebe)
