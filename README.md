# talak-web3

[![CI](https://github.com/dagimabebe/talak-web3/actions/workflows/ci.yml/badge.svg)](https://github.com/dagimabebe/talak-web3/actions)
[![codecov](https://codecov.io/gh/dagimabebe/talak-web3/branch/main/graph/badge.svg)](https://codecov.io/gh/dagimabebe/talak-web3)
[![npm version](https://badge.fury.io/js/talak-web3.svg)](https://www.npmjs.com/package/talak-web3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Production-first Web3 backend framework for authentication, RPC resilience, and account abstraction.

## Features

- **Server-Authenticated SIWE**: True server-side session management, not client-trust auth
- **Resilient RPC Routing**: Multi-provider failover with health tracking
- **Atomic Operations**: Nonce consumption and token rotation for replay resistance
- **Fail-Closed Security**: System fails securely on infrastructure degradation
- **Type Safety**: Full TypeScript support with generated types
- **Multi-Framework**: Support for Next.js, React, Hono, Express, NestJS

## Quick Start

### Installation

```bash
npm install talak-web3
# or
yarn add talak-web3
# or
pnpm add talak-web3
```

### Initialize Project

```bash
npx talak init my-dapp --template nextjs
cd my-dapp
npm install
npm run dev
```

### Manual Setup

```typescript
import { talakWeb3, MainnetPreset } from "talak-web3";

const app = talakWeb3({
  ...MainnetPreset,
  auth: {
    domain: "yourdapp.com",
    secret: process.env.JWT_SECRET!,
  },
});

await app.init();
```

### React Integration

```tsx
import { TalakWeb3Provider, useSIWE } from "talak-web3/react";

function LoginButton() {
  const { signIn, isAuthenticated, user } = useSIWE();
  
  return (
    <button onClick={signIn}>
      {isAuthenticated ? user.address : "Sign In with Ethereum"}
    </button>
  );
}

function App() {
  return (
    <TalakWeb3Provider config={{ apiUrl: "https://api.yourdapp.com" }}>
      <LoginButton />
    </TalakWeb3Provider>
  );
}
```

## Package Ecosystem

| Package | Version | Description |
|---------|---------|-------------|
| `talak-web3` | [![npm](https://img.shields.io/npm/v/talak-web3)](https://www.npmjs.com/package/talak-web3) | Unified SDK entrypoint |
| `@talak-web3/auth` | [![npm](https://img.shields.io/npm/v/@talak-web3/auth)](https://www.npmjs.com/package/@talak-web3/auth) | SIWE and session lifecycle |
| `@talak-web3/rpc` | [![npm](https://img.shields.io/npm/v/@talak-web3/rpc)](https://www.npmjs.com/package/@talak-web3/rpc) | Provider routing and failover |
| `@talak-web3/tx` | [![npm](https://img.shields.io/npm/v/@talak-web3/tx)](https://www.npmjs.com/package/@talak-web3/tx) | Account abstraction helpers |
| `@talak-web3/hooks` | [![npm](https://img.shields.io/npm/v/@talak-web3/hooks)](https://www.npmjs.com/package/@talak-web3/hooks) | React hooks and providers |
| `@talak-web3/cli` | [![npm](https://img.shields.io/npm/v/@talak-web3/cli)](https://www.npmjs.com/package/@talak-web3/cli) | CLI tooling and scaffolding |

## Development

```bash
# Clone repository
git clone https://github.com/dagimabebe/talak-web3.git
cd talak-web3

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

## Production Checklist

- [ ] Redis configured for session storage
- [ ] HTTPS enabled with valid certificates
- [ ] JWT secrets rotated (256-bit minimum)
- [ ] Rate limiting configured
- [ ] CORS origins restricted
- [ ] Audit logging enabled
- [ ] Error tracking configured (Sentry)
- [ ] Health checks implemented
- [ ] Monitoring dashboards set up

## Documentation

- [Getting Started](./docs/MINIMAL_SETUP.md) - First steps with talak-web3
- [Architecture](./docs/ARCHITECTURE.md) - System design and patterns
- [Security](./docs/SECURITY_ARCHITECTURE.md) - Security architecture and threat model
- [Threat Model](./docs/THREAT_MODEL.md) - Comprehensive threat analysis
- [API Reference](https://docs.talak.dev/api) - Complete API documentation
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines

## Releases

See [GitHub Releases](https://github.com/dagimabebe/talak-web3/releases) for changelog and version history.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`talak-web3`](https://www.npmjs.com/package/talak-web3) | [![npm](https://img.shields.io/npm/v/talak-web3.svg)](https://www.npmjs.com/package/talak-web3) | Core SDK with all features |
| [`@talak-web3/core`](https://www.npmjs.com/package/@talak-web3/core) | [![npm](https://img.shields.io/npm/v/@talak-web3/core.svg)](https://www.npmjs.com/package/@talak-web3/core) | Core orchestrator |
| [`@talak-web3/auth`](https://www.npmjs.com/package/@talak-web3/auth) | [![npm](https://img.shields.io/npm/v/@talak-web3/auth.svg)](https://www.npmjs.com/package/@talak-web3/auth) | SIWE authentication |
| [`@talak-web3/rpc`](https://www.npmjs.com/package/@talak-web3/rpc) | [![npm](https://img.shields.io/npm/v/@talak-web3/rpc.svg)](https://www.npmjs.com/package/@talak-web3/rpc) | RPC resilience layer |
| [`@talak-web3/hooks`](https://www.npmjs.com/package/@talak-web3/hooks) | [![npm](https://img.shields.io/npm/v/@talak-web3/hooks.svg)](https://www.npmjs.com/package/@talak-web3/hooks) | React hooks |
| [`@talak-web3/types`](https://www.npmjs.com/package/@talak-web3/types) | [![npm](https://img.shields.io/npm/v/@talak-web3/types.svg)](https://www.npmjs.com/package/@talak-web3/types) | TypeScript types |

## Security

See [SECURITY.md](./SECURITY.md) for security policies and vulnerability disclosure.

## License

MIT © [Dagim Abebe](https://github.com/dagimabebe)
