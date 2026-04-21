# @talak-web3/rpc

RPC client and utilities for blockchain interactions.

## Installation

```bash
npm install @talak-web3/rpc

yarn add @talak-web3/rpc

pnpm add @talak-web3/rpc
```

## Usage

```typescript
import { UnifiedRpc } from '@talak-web3/rpc';
import type { TalakWeb3Context } from '@talak-web3/types';

const rpc = new UnifiedRpc(context, [
  { url: 'https://eth-mainnet.g.alchemy.com/v2/demo', priority: 0 },
  { url: 'https://mainnet.infura.io/v3/demo', priority: 1 },
]);

const blockNumber = await rpc.request<string>('eth_blockNumber', []);
const balance = await rpc.request<string>('eth_getBalance', [
  '0x1111111111111111111111111111111111111111',
  'latest'
]);

rpc.stop();
```

## Features

- Multi-provider fallback with health checking
- Automatic retry with configurable attempts
- Response caching for read-only methods
- Request timeout handling
- Health monitoring (runs every 30s, can be stopped with `rpc.stop()`)

## API

### `UnifiedRpc`

The main RPC client class that implements `IRpc` interface.

#### Constructor

```typescript
constructor(ctx: TalakWeb3Context, endpoints: RpcEndpoint[])
```

- `ctx`: TalakWeb3 context instance
- `endpoints`: Array of RPC endpoints with optional priority

#### Methods

- `request<T>(method: string, params?: unknown[], options?: RpcOptions): Promise<T>` - Make an RPC request
- `stop(): void` - Stop the health check interval
- `checkAllHealth(): Promise<void>` - Manually check all endpoint health

## License

MIT
