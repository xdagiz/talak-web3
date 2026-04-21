# API Reference

Complete API reference for talak-web3.

## Core API

### `talakWeb3(config)`

Creates a new talak-web3 application instance.

```typescript
import { talakWeb3, MainnetPreset } from 'talak-web3';

const app = talakWeb3({
  ...MainnetPreset,
  auth: {
    domain: 'myapp.com',
    secret: process.env.JWT_SECRET!,
    sessionDuration: 900,
  },
  rpc: {
    providers: [
      { url: 'https://eth-mainnet.g.alchemy.com/v2/demo_api_key', weight: 1 },
      { url: 'https://mainnet.infura.io/v3/demo_project_id', weight: 1 },
    ],
  },
});

await app.init();
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `auth.domain` | `string` | required | SIWE domain |
| `auth.secret` | `string` | required | JWT signing secret |
| `auth.sessionDuration` | `number` | `900` | Access token TTL in seconds |
| `auth.refreshDuration` | `number` | `604800` | Refresh token TTL in seconds |
| `rpc.providers` | `ProviderConfig[]` | `[]` | RPC provider configurations |
| `rpc.timeout` | `number` | `30000` | RPC request timeout in ms |
| `redis.url` | `string` | `undefined` | Redis connection URL |

### Context API

#### `app.context.auth`

Authentication context methods.

##### `generateNonce()`

Generates a new SIWE nonce.

```typescript
const nonce = await app.context.auth.generateNonce();

```

##### `verifySignature(message, signature)`

Verifies a SIWE signature.

```typescript
const result = await app.context.auth.verifySignature(message, signature);

```

##### `createSession(address, chainId)`

Creates a new session.

```typescript
const session = await app.context.auth.createSession(address, chainId);

```

##### `verifySession(token)`

Verifies an access token.

```typescript
const session = await app.context.auth.verifySession(token);

```

##### `refreshSession(refreshToken)`

Refreshes a session using a refresh token.

```typescript
const newSession = await app.context.auth.refreshSession(refreshToken);

```

##### `revokeSession(token)`

Revokes a session.

```typescript
await app.context.auth.revokeSession(token);
```

#### `app.context.rpc`

RPC context methods.

##### `getProvider(chainId)`

Gets the best available provider for a chain.

```typescript
const provider = await app.context.rpc.getProvider(1);
```

##### `request(chainId, method, params)`

Makes an RPC request.

```typescript
const balance = await app.context.rpc.request(1, 'eth_getBalance', [
  '0x1111111111111111111111111111111111111111',
  'latest',
]);
```

## React Hooks

### `useSIWE(options)`

Hook for Sign-In with Ethereum.

```typescript
import { useSIWE } from 'talak-web3/react';

const {
  signIn,
  signOut,
  isAuthenticated,
  isLoading,
  user,
  error,
} = useSIWE({
  domain: 'myapp.com',
  uri: 'https://myapp.com/login',
  onSuccess: (user) => console.log('Logged in:', user),
  onError: (error) => console.error('Login failed:', error),
});
```

### `useSession()`

Hook for accessing session state.

```typescript
import { useSession } from 'talak-web3/react';

const {
  session,
  isAuthenticated,
  isLoading,
} = useSession();
```

### `useWallet()`

Hook for wallet interactions.

```typescript
import { useWallet } from 'talak-web3/react';

const {
  connect,
  disconnect,
  address,
  chainId,
  isConnected,
  isConnecting,
} = useWallet();
```

## Error Handling

### Error Classes

```typescript
import { AuthError, RpcError, ValidationError } from '@talak-web3/errors';

try {
  await verifySignature(message, signature);
} catch (error) {
  if (error instanceof AuthError) {
    console.log(error.code);
    console.log(error.message);
  }
}

try {
  await rpc.request(chainId, method, params);
} catch (error) {
  if (error instanceof RpcError) {
    console.log(error.code);
    console.log(error.provider);
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `AUTH_INVALID_SIGNATURE` | Signature verification failed |
| `AUTH_EXPIRED_NONCE` | Nonce has expired |
| `AUTH_INVALID_TOKEN` | JWT token is invalid |
| `AUTH_SESSION_REVOKED` | Session has been revoked |
| `RPC_PROVIDER_ERROR` | RPC provider returned error |
| `RPC_TIMEOUT` | RPC request timed out |
| `RPC_ALL_PROVIDERS_FAILED` | All providers failed |
| `VALIDATION_INVALID_INPUT` | Input validation failed |

## Types

### SIWEMessage

```typescript
interface SIWEMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: '1';
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}
```

### Session

```typescript
interface Session {
  id: string;
  address: string;
  chainId: number;
  issuedAt: number;
  expiresAt: number;
}
```

### ProviderConfig

```typescript
interface ProviderConfig {
  url: string;
  weight?: number;
  timeout?: number;
  priority?: number;
}
```

## Events

### Auth Events

```typescript
app.on('auth:login', ({ address, chainId }) => {
  console.log(`User ${address} logged in`);
});

app.on('auth:logout', ({ address }) => {
  console.log(`User ${address} logged out`);
});

app.on('auth:token_refresh', ({ address }) => {
  console.log(`Token refreshed for ${address}`);
});
```

### RPC Events

```typescript
app.on('rpc:request', ({ chainId, method, duration }) => {
  console.log(`RPC ${method} took ${duration}ms`);
});

app.on('rpc:failover', ({ from, to, chainId }) => {
  console.log(`Failover from ${from} to ${to}`);
});
```

## Middleware

### Express Middleware

```typescript
import { authMiddleware } from '@talak-web3/middleware';
import express from 'express';

const app = express();

app.use(authMiddleware({
  secret: process.env.JWT_SECRET!,
  issuer: 'myapp.com',
}));

app.get('/protected', (req, res) => {
  res.json({ address: req.user.address });
});
```

### Hono Middleware

```typescript
import { authMiddleware } from '@talak-web3/middleware/hono';
import { Hono } from 'hono';

const app = new Hono();

app.use('/api/*', authMiddleware({
  secret: process.env.JWT_SECRET!,
}));
```

## Utilities

### Address Utilities

```typescript
import { isAddress, getAddress, shortenAddress } from 'talak-web3';

isAddress('0x1111111111111111111111111111111111111111');
getAddress('0x1111111111111111111111111111111111111111');
shortenAddress('0x1111111111111111111111111111111111111111');
```

### Formatting

```typescript
import { formatEther, parseEther } from 'talak-web3';

formatEther(1000000000000000000n);
parseEther('1.0');
```
