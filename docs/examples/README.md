# Example Apps

This directory contains example applications demonstrating talak-web3 SDK usage.

## Directory Structure

```
apps/
├── README.md                    # This file
├── docs/                       # Documentation site (working)
├── hono-backend/               # Backend API server (working, has syntax error)
├── example-next-dapp/         # Next.js example → APP_LOGIC.md
├── minimal-auth-app/          # Minimal auth demo → APP_LOGIC.md
├── rpc-dashboard-app/         # RPC testing dashboard → APP_LOGIC.md
├── gasless-tx-app/           # ERC-4337 gasless demo → APP_LOGIC.md
└── react-native-dapp/         # React Native example → APP_LOGIC.md
```

## Apps Overview

### Production Apps

| App | Status | Description |
|-----|--------|-------------|
| `docs` | Working | Docusaurus documentation site |
| `hono-backend` | Has syntax error | API server with auth, RPC proxying, rate limiting |

### Example Apps (Source Preserved in APP_LOGIC.md)

| App | Status | Framework | Description |
|-----|--------|-----------|-------------|
| `example-next-dapp` | Broken (React 19 TS) | Next.js App Router with wallet, chain, RPC, gasless |
| `minimal-auth-app` | Stub | Vanilla JS SIWE authentication |
| `rpc-dashboard-app` | Stub | Simple RPC method tester |
| `gasless-tx-app` | Stub | ERC-4337 gasless transactions |
| `react-native-dapp` | Broken (missing deps) | React Native mobile app |

## Quick Reference

### example-next-dapp
- **Status**: Broken (React 19 TypeScript error)
- **Framework**: Next.js 16.2.0 (App Router)
- **Key Features**: Wallet connect, chain switcher, RPC tester, gasless transactions
- **Logic**: See [APP_LOGIC.md](./example-next-dapp/APP_LOGIC.md)
- **Run**: `pnpm dev` in the app directory

### minimal-auth-app
- **Status**: Stub
- **Framework**: Vanilla HTML + TypeScript
- **Key Features**: SIWE (Sign-In with Ethereum) authentication flow
- **Logic**: See [APP_LOGIC.md](./minimal-auth-app/APP_LOGIC.md)
- **Run**: `pnpm dev` in the app directory

### rpc-dashboard-app
- **Status**: Stub
- **Framework**: Vanilla HTML + TypeScript
- **Key Features**: Interactive RPC method tester with auth
- **Logic**: See [APP_LOGIC.md](./rpc-dashboard-app/APP_LOGIC.md)
- **Run**: `pnpm dev` in the app directory

### gasless-tx-app
- **Status**: Stub
- **Framework**: Vanilla HTML + TypeScript
- **Key Features**: ERC-4337 UserOperation submission
- **Logic**: See [APP_LOGIC.md](./gasless-tx-app/APP_LOGIC.md)
- **Run**: `pnpm dev` in the app directory

### react-native-dapp
- **Status**: Broken (missing esbuild dependency)
- **Framework**: Expo (React Native 0.74.5)
- **Key Features**: Mobile wallet connection, RPC calls
- **Logic**: See [APP_LOGIC.md](./react-native-dapp/APP_LOGIC.md)
- **Run**: `expo start` in the app directory

## Common Patterns

### Connecting a Wallet

```typescript
import { useAccount } from '@talak-web3/hooks';

function WalletButton() {
  const account = useAccount();

  return account.isConnected ? (
    <button onClick={account.disconnect}>Disconnect</button>
  ) : (
    <button onClick={() => account.connect(walletAddress)}>Connect</button>
  );
}
```

### Making RPC Calls

```typescript
import { useRpc } from '@talak-web3/hooks';

function RpcTester() {
  const rpc = useRpc();

  const blockNumber = await rpc.request('eth_blockNumber', []);
  // or
  const balance = await rpc.request('eth_getBalance', [address, 'latest']);
}
```

### SIWE Authentication

```typescript
import { TalakWeb3Client } from '@talak-web3/client';

const client = new TalakWeb3Client({ baseUrl: 'http://localhost:8787' });

// 1. Get nonce
const { nonce } = await client.getNonce(address);

// 2. Create SIWE message
const message = `${host} wants you to sign in with your Ethereum account...`;

// 3. Sign and login
await client.login(message, signature);
```

## API Reference

### @talak-web3/hooks (React)

- `TalakWeb3Provider` - Context provider component
- `useAccount()` - Wallet connection state and methods
- `useChain()` - Current chain and switcher
- `useRpc()` - RPC request interface
- `useGasless()` - Gasless transaction methods

### @talak-web3/client

- `TalakWeb3Client` - Main client class
- `client.getNonce()` - Fetch auth nonce
- `client.login()` - Authenticate with SIWE
- `client.verifySession()` - Check active session
- `client.logout()` - Clear session

## Notes

- All example apps assume hono-backend is running at `http://localhost:8787`
- Some apps use mock wallet addresses for demonstration
- For gasless transactions, need AccountAbstractionPlugin attached
- React Native version needs esbuild dependency added