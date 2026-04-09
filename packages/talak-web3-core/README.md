# @talak-web3/core

Core framework for talak-web3. Provides the plugin system, middleware chains, context management, and RPC handling.

## Features

- **Plugin System** - Extensible plugin architecture with lifecycle hooks
- **Middleware Chains** - Onion-style middleware for requests and responses
- **Context Management** - Shared context across all components
- **RPC Management** - Unified RPC interface with failover support
- **Singleton Pattern** - Ensures single framework instance per application

## Installation

```bash
npm install @talak-web3/core
# or
yarn add @talak-web3/core
# or
pnpm add @talak-web3/core
```

## Quick Start

```typescript
import { talakWeb3 } from '@talak-web3/core';

// Create framework instance
const app = talakWeb3({
  chains: [
    { id: 1, rpcUrls: ['https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'] },
    { id: 137, rpcUrls: ['https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY'] },
  ],
  auth: {
    domain: 'yourdomain.com',
    secret: process.env.JWT_SECRET,
  },
});

// Initialize
await app.init();

// Use RPC
const blockNumber = await app.context.rpc.request({
  method: 'eth_blockNumber',
  chainId: 1,
});

// Clean up on shutdown
await app.destroy();
```

## Plugin System

```typescript
import type { TalakWeb3Plugin, TalakWeb3Context } from '@talak-web3/core';

const myPlugin: TalakWeb3Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  async setup(context: TalakWeb3Context) {
    // Register hooks
    context.hooks.on('plugin-load', ({ name }) => {
      console.log(`Plugin loaded: ${name}`);
    });
    
    // Add middleware
    context.requestChain.use(async (req, next) => {
      console.log('Request:', req);
      return next();
    });
  },
  
  async teardown() {
    // Cleanup
  },
};

// Use plugin
const app = talakWeb3({
  chains: [...],
  plugins: [myPlugin],
});
```

## Context

The context object provides access to all framework services:

```typescript
interface TalakWeb3Context {
  config: TalakWeb3Config;        // Framework configuration
  hooks: HookRegistry;             // Event emitter
  plugins: Map<string, TalakWeb3Plugin>; // Loaded plugins
  auth: TalakWeb3Auth;            // Authentication instance
  cache: RpcCache;                 // TTL cache for RPC results
  logger: Logger;                  // Structured logger
  requestChain: MiddlewareChain;   // Request middleware
  responseChain: MiddlewareChain;  // Response middleware
  rpc: UnifiedRpc;                 // RPC interface
}
```

## Middleware

Middleware follows the onion pattern:

```typescript
// Request middleware
app.context.requestChain.use(async (request, next) => {
  // Before request
  console.log('Before:', request);
  
  // Call next middleware
  const response = await next();
  
  // After request
  console.log('After:', response);
  
  return response;
});
```

## License

MIT
