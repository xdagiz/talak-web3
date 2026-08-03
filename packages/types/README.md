# @talak-web3/types

Shared TypeScript types for talak-web3 packages.

## Installation

```bash
npm install @talak-web3/types
pnpm add @talak-web3/types
```

## Usage

```typescript
import type {
  Hex,
  Address,
  ChainId,
  Logger,
  NonceStore,
  RefreshStore,
  RefreshSession,
  RevocationStore,
  TalakWeb3BaseConfig,
  TalakWeb3Plugin,
  TalakWeb3Instance,
  TalakWeb3Context,
  IRpc,
  IMiddlewareChain,
} from "@talak-web3/types";
```

## Core Types

### Primitives

```typescript
type ChainId = number;
type Hex = `0x${string}`;
type Address = Hex;
type UnixMs = number;
```

### Stores

```typescript
interface NonceStore {
  create(address: string, meta?: { ip?: string; ua?: string }): Promise<string>;
  consume(address: string, nonce: string): Promise<boolean>;
}

interface RefreshStore {
  create(
    address: string,
    chainId: number,
    ttlMs: number,
  ): Promise<{ token: string; session: RefreshSession }>;
  rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  revoke(token: string): Promise<void>;
  lookup(token: string): Promise<RefreshSession | null>;
}

interface RevocationStore {
  revoke(jti: string, expiresAtMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}
```

### Plugin System

```typescript
interface TalakWeb3Plugin {
  name: string;
  version: string;
  dependencies?: string[];
  setup(ctx: TalakWeb3Context): void | Promise<void>;
  onBeforeRequest?(req: unknown, ctx: TalakWeb3Context): Promise<void>;
  onAfterResponse?(res: unknown, ctx: TalakWeb3Context): Promise<void>;
  onChainChanged?(chainId: number): void;
  onAccountChanged?(address: string | null): void;
  teardown?(): void | Promise<void>;
  health?(): boolean;
}
```

### Middleware

```typescript
interface IMiddlewareChain<T = unknown, R = unknown> {
  use(handler: MiddlewareHandler<T, R>): void;
  execute(req: T, ctx: TalakWeb3Context, finalHandler: () => Promise<R>): Promise<R>;
}

type MiddlewareHandler<T = unknown, R = unknown> = (
  req: T,
  next: () => Promise<R>,
  ctx: TalakWeb3Context,
) => Promise<R>;
```

## License

MIT
