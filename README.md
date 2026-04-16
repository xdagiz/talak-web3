# talak-web3
  
  
[![npm version](https://img.shields.io/npm/v/talak-web3?logo=npm&label=npm%20package)](https://www.npmjs.com/package/talak-web3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Web3 backend toolkit for server-side SIWE sessions, RPC failover, and account-abstraction helpers. See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Features

- **Server-authenticated SIWE**: Server-side sessions and pluggable stores (`@talak-web3/auth`, Redis-backed stores in `@talak-web3/auth/stores`)
- **Resilient RPC routing**: Multi-provider failover with health tracking (`@talak-web3/rpc`)
- **Replay-resistant flows**: Nonce consumption before signature verification; refresh rotation (use Redis stores in production)
- **TypeScript-first**: Typed public APIs across packages
- **Examples**: Next.js, Hono, and React Native sample apps under `apps/` (bring your own HTTP rate limits and deployment hardening)

## Quick Start

### Installation

```bash
npm install talak-web3
```

### Initialize Project

The CLI package is `@talak-web3/cli`. Binaries: `talak`, `talak-web3`, and `create-talak-web3` (all equivalent).

```bash
npx talak-web3 init my-dapp --template nextjs
# or
npx @talak-web3/cli init my-dapp --template nextjs
cd my-dapp
npm install
npm run dev
```

### Manual Setup

Consult [`docs/MINIMAL_SETUP.md`](./docs/MINIMAL_SETUP.md) and the [`@talak-web3/core`](./packages/talak-web3-core/README.md) README — `talakWeb3()` is configured via `@talak-web3/config` presets and plugins; JWT/session secrets are enforced by `@talak-web3/auth` (**`JWT_SECRET` is required when `NODE_ENV=production`**).

### React integration

`talak-web3/react` re-exports hooks from `@talak-web3/hooks` (e.g. `TalakWeb3Provider`, `useTalakWeb3`, `useAccount`, `useChain`). Wire your own SIWE signing flow against your API; there is no `useSIWE` helper in the current release.

### Instance lifecycle

`talakWeb3()` returns a **new instance** on each call (no global singleton state).  
`__resetTalakWeb3()` is retained for backwards compatibility and is a **no-op**.

## Package ecosystem

Highlights below; **every publishable package** (SDK + **26** scoped `@talak-web3/*` libraries) is listed with **live npm version badges** in [`docs/NPM_REGISTRY.md`](./docs/NPM_REGISTRY.md). Workspace paths: [`packages.md`](./packages.md) and [`docs/PACKAGE_ECOSYSTEM.md`](./docs/PACKAGE_ECOSYSTEM.md).

| Package | Version (live from npm) | Description |
|---------|-------------------------|-------------|
| `talak-web3` | [![npm](https://img.shields.io/npm/v/talak-web3?logo=npm)](https://www.npmjs.com/package/talak-web3) | Unified SDK entrypoint |
| `@talak-web3/auth` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fauth?logo=npm)](https://www.npmjs.com/package/@talak-web3/auth) | SIWE and session lifecycle |
| `@talak-web3/rpc` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Frpc?logo=npm)](https://www.npmjs.com/package/@talak-web3/rpc) | Provider routing and failover |
| `@talak-web3/tx` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Ftx?logo=npm)](https://www.npmjs.com/package/@talak-web3/tx) | Account abstraction helpers |
| `@talak-web3/hooks` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fhooks?logo=npm)](https://www.npmjs.com/package/@talak-web3/hooks) | React hooks and providers |
| `@talak-web3/cli` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fcli?logo=npm)](https://www.npmjs.com/package/@talak-web3/cli) | CLI (`talak-web3`, `talak`, `create-talak-web3`) |

**Full matrix:** [`docs/NPM_REGISTRY.md`](./docs/NPM_REGISTRY.md)

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


## Documentation

- [Workspace package list](./packages.md) - Every monorepo package and app, with links to each README
- [Getting Started](./docs/MINIMAL_SETUP.md) - First steps with talak-web3
- [Package Ecosystem](./docs/PACKAGE_ECOSYSTEM.md) - Published package catalog and install names
- [Architecture](./docs/ARCHITECTURE.md) - System design and patterns
- [Security](./docs/SECURITY_ARCHITECTURE.md) - Security architecture and threat model
- [Threat Model](./docs/THREAT_MODEL.md) - Comprehensive threat analysis
- [API Reference](https://docs.talak.dev/api) - Complete API documentation
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines and troubleshooting (for example `npm warn Unknown env config "_dagimabebe-registry"`)

## Releases

See [CHANGELOG.md](./CHANGELOG.md) and [GitHub Releases](https://github.com/dagimabebe/talak-web3/releases).

## npm on GitHub (live registry data)

- **Version badges** in this README and in [`docs/NPM_REGISTRY.md`](./docs/NPM_REGISTRY.md) are served by [shields.io](https://shields.io/) from the **public npm registry** (same source as [npmjs.com](https://www.npmjs.com/)); they update when you publish new versions.
- Each package’s `package.json` includes `repository.directory` pointing at its folder in this monorepo so GitHub can link the repo to the published npm package.
- The GitHub **Packages** tab for `npm.pkg.github.com` is separate from the public npm registry. Optional GitHub Packages publish: [`.github/workflows/publish-github-packages.yml`](.github/workflows/publish-github-packages.yml).

## Security

See [SECURITY.md](./SECURITY.md) for security policies and vulnerability disclosure thanks.

## License

MIT © [Dagim Abebe](https://github.com/dagimabebe)
