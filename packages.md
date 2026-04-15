# Workspace packages

This file lists every **npm workspace member** in this repo (see [`pnpm-workspace.yaml`](pnpm-workspace.yaml)) and links to its **README**. Workspace packages are folders that contain a `package.json` at the listed path.

**Live npm versions** (badges from the public registry): [`docs/NPM_REGISTRY.md`](docs/NPM_REGISTRY.md).

For a short overview of the `packages/` directory, see [`packages/README.md`](packages/README.md).

---

## Libraries (`packages/`)

| Path | npm name | README | Summary |
|------|----------|--------|---------|
| [`packages/talak-web3`](packages/talak-web3/) | `talak-web3` | [README](packages/talak-web3/README.md) | Unified SDK entrypoint; re-exports feature modules. |
| [`packages/talak-web3-adapters`](packages/talak-web3-adapters/) | `@talak-web3/adapters` | [README](packages/talak-web3-adapters/README.md) | Adapters for web, Node, and other runtimes. |
| [`packages/talak-web3-ai`](packages/talak-web3-ai/) | `@talak-web3/ai` | [README](packages/talak-web3-ai/README.md) | AI-related helpers and integrations. |
| [`packages/talak-web3-analytics`](packages/talak-web3-analytics/) | `@talak-web3/analytics-engine` | [README](packages/talak-web3-analytics/README.md) | Analytics event types and sinks (engine). |
| [`packages/talak-web3-auth`](packages/talak-web3-auth/) | `@talak-web3/auth` | [README](packages/talak-web3-auth/README.md) | SIWE, sessions, token lifecycle. |
| [`packages/talak-web3-client`](packages/talak-web3-client/) | `@talak-web3/client` | [README](packages/talak-web3-client/README.md) | HTTP client for talak-web3 APIs. |
| [`packages/talak-web3-config`](packages/talak-web3-config/) | `@talak-web3/config` | [README](packages/talak-web3-config/README.md) | Configuration loading and validation. |
| [`packages/talak-web3-core`](packages/talak-web3-core/) | `@talak-web3/core` | [README](packages/talak-web3-core/README.md) | Core orchestrator, plugins, middleware chains, context. |
| [`packages/talak-web3-errors`](packages/talak-web3-errors/) | `@talak-web3/errors` | [README](packages/talak-web3-errors/README.md) | Shared error types and helpers. |
| [`packages/talak-web3-handlers`](packages/talak-web3-handlers/) | `@talak-web3/handlers` | [README](packages/talak-web3-handlers/README.md) | Route and protocol handlers. |
| [`packages/talak-web3-hooks`](packages/talak-web3-hooks/) | `@talak-web3/hooks` | [README](packages/talak-web3-hooks/README.md) | React hooks and providers. |
| [`packages/talak-web3-identity`](packages/talak-web3-identity/) | `@talak-web3/identity` | [README](packages/talak-web3-identity/README.md) | Identity and account abstractions. |
| [`packages/talak-web3-middleware`](packages/talak-web3-middleware/) | `@talak-web3/middleware` | [README](packages/talak-web3-middleware/README.md) | Auth and authorization middleware. |
| [`packages/talak-web3-orgs`](packages/talak-web3-orgs/) | `@talak-web3/orgs` | [README](packages/talak-web3-orgs/README.md) | Organization and tenancy helpers. |
| [`packages/talak-web3-plugins`](packages/talak-web3-plugins/) | `@talak-web3/plugins` | [README](packages/talak-web3-plugins/README.md) | Plugin registration and lifecycle. |
| [`packages/talak-web3-realtime`](packages/talak-web3-realtime/) | `@talak-web3/realtime` | [README](packages/talak-web3-realtime/README.md) | Realtime channels and messaging. |
| [`packages/talak-web3-rpc`](packages/talak-web3-rpc/) | `@talak-web3/rpc` | [README](packages/talak-web3-rpc/README.md) | Multi-provider RPC routing and resilience. |
| [`packages/talak-web3-test-utils`](packages/talak-web3-test-utils/) | `@talak-web3/test-utils` | [README](packages/talak-web3-test-utils/README.md) | Mocks, factories, and test helpers. |
| [`packages/talak-web3-tx`](packages/talak-web3-tx/) | `@talak-web3/tx` | [README](packages/talak-web3-tx/README.md) | Transaction and account-abstraction utilities. |
| [`packages/talak-web3-types`](packages/talak-web3-types/) | `@talak-web3/types` | [README](packages/talak-web3-types/README.md) | Shared TypeScript types. |
| [`packages/talak-web3-utils`](packages/talak-web3-utils/) | `@talak-web3/utils` | [README](packages/talak-web3-utils/README.md) | General-purpose utilities. |
| [`packages/@talak-web3/analytics`](packages/@talak-web3/analytics/) | `@talak-web3/analytics` | [README](packages/@talak-web3/analytics/README.md) | Re-exports analytics types from `@talak-web3/analytics-engine`. |
| [`packages/@talak-web3/cli`](packages/@talak-web3/cli/) | `@talak-web3/cli` | [README](packages/@talak-web3/cli/README.md) | CLI: `init`, `doctor`, `generate`, and other tooling. |
| [`packages/@talak-web3/dashboard`](packages/@talak-web3/dashboard/) | `@talak-web3/dashboard` | [README](packages/@talak-web3/dashboard/README.md) | Admin dashboard UI building blocks. |
| [`packages/@talak-web3/devtools`](packages/@talak-web3/devtools/) | `@talak-web3/devtools` | [README](packages/@talak-web3/devtools/README.md) | Request IDs and lightweight dev helpers. |
| [`packages/@talak-web3/templates`](packages/@talak-web3/templates/) | `@talak-web3/templates` | [README](packages/@talak-web3/templates/README.md) | Programmatic templates used by the CLI. |

---

## Example apps (`apps/`)

Private applications used to exercise the SDK. Each has its own README.

| Path | `package.json` name | README | Summary |
|------|---------------------|--------|---------|
| [`apps/example-next-dapp`](apps/example-next-dapp/) | `example-next-dapp` | [README](apps/example-next-dapp/README.md) | Next.js sample using core, hooks, and tx. |
| [`apps/gasless-tx-app`](apps/gasless-tx-app/) | `example-gasless-tx` | [README](apps/gasless-tx-app/README.md) | Gasless transaction demo. |
| [`apps/hono-backend`](apps/hono-backend/) | `hono-backend` | [README](apps/hono-backend/README.md) | Hono reference backend for talak-web3. |
| [`apps/minimal-auth-app`](apps/minimal-auth-app/) | `example-minimal-auth` | [README](apps/minimal-auth-app/README.md) | Minimal auth + client example. |
| [`apps/react-native-dapp`](apps/react-native-dapp/) | `react-native-dapp` | [README](apps/react-native-dapp/README.md) | Expo / React Native sample with hooks. |
| [`apps/rpc-dashboard-app`](apps/rpc-dashboard-app/) | `example-rpc-dashboard` | [README](apps/rpc-dashboard-app/README.md) | RPC dashboard demo. |

---

## Documentation sources (`apps/docs-site`)

| Path | README | Note |
|------|--------|------|
| [`apps/docs-site`](apps/docs-site/) | [README](apps/docs-site/README.md) | Markdown documentation sources. This folder is listed in `pnpm-workspace.yaml` but **does not define a `package.json`**, so it is **not** an installable workspace package until a `package.json` is added. |

---

## Counts

- **Libraries:** 26 packages under `packages/`
- **Apps:** 6 packages under `apps/` (with `package.json`)
- **Docs-only folder:** `apps/docs-site` (no `package.json`)

Run `pnpm -r list --depth -1` from the repo root to list workspace packages as resolved by pnpm.
