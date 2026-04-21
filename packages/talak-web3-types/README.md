# @talak-web3/types

Shared TypeScript types for talak-web3 packages.

## Installation

```bash
npm install @talak-web3/types

yarn add @talak-web3/types

pnpm add @talak-web3/types
```

## Usage

```typescript
import type {
  Chain,
  WalletConfig,
  SIWEMessage,
  Session,
  TransactionRequest
} from '@talak-web3/types';
```

## Core Types

### Chain

```typescript
interface Chain {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorers: {
    name: string;
    url: string;
  }[];
}
```

### SIWEMessage

```typescript
interface SIWEMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
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
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}
```

## License

MIT
