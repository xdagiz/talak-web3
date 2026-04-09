# talak-web3 Full Implementation Task

## Phase 1 — Type System & Core Hardening
- [ ] Fix [TalakWeb3Context](file:///d:/baba/talak-web3/packages/talak-web3-types/src/index.ts#21-33) — replace all `any` fields with concrete interfaces
- [ ] Add `HookRegistry` concrete type to `talak-web3-hooks` and export it
- [ ] Replace `as any` casts in `talak-web3-core/index.ts` (rpc, hooks wiring)
- [ ] Update [TalakWeb3Config](file:///d:/baba/talak-web3/packages/talak-web3-config/src/schema.ts#41-42) schema — add `allowedOrigins` field (used by security but not in schema)
- [ ] Add `rpcUrl` field to `ChainSchema` (core currently reads `c.rpcUrl` but schema has `rpcUrls[]`)
- [ ] Standardize `auth` field on Context with concrete [TalakWeb3Auth](file:///d:/baba/talak-web3/packages/talak-web3-auth/src/index.ts#3-20) type

## Phase 2 — Complete Stubbed Packages

### talak-web3-adapters
- [ ] Install `@ceramicnetwork/http-client` + types
- [ ] Replace [CeramicPlugin](file:///d:/baba/talak-web3/packages/talak-web3-adapters/src/ceramic.ts#4-23) stub with real Ceramic HTTP client integration
- [ ] Install `@tableland/sdk`
- [ ] Replace [TablelandPlugin](file:///d:/baba/talak-web3/packages/talak-web3-adapters/src/tableland.ts#4-23) stub with real Tableland query execution
- [ ] Add [StorageAdapter](file:///d:/baba/talak-web3/packages/talak-web3-adapters/src/index.ts#9-13) implementation (IPFS via Pinata or w3up)
- [ ] Add typed response types throughout

### talak-web3-tx
- [ ] Install `viem` for low-level EVM types + AA support
- [ ] Implement real [UserOperation](file:///d:/baba/talak-web3/packages/talak-web3-tx/src/index.ts#1-6) construction (ERC-4337 v0.6)
- [ ] Implement real Bundler RPC (`eth_sendUserOperation`, `eth_getUserOperationReceipt`)
- [ ] Implement real Paymaster RPC (`pm_sponsorUserOperation`)
- [ ] Remove hardcoded budget mock — wire to configurable paymaster
- [ ] Add `AccountAbstractionClient` class wiring bundler + paymaster

### talak-web3-realtime
- [ ] Implement `WebSocketMessagingClient` (native WebSocket transport)
- [ ] Implement pub/sub subscription model
- [ ] Implement [listConversations](file:///d:/baba/talak-web3/packages/talak-web3-realtime/src/index.ts#9-10), [listMessages](file:///d:/baba/talak-web3/packages/talak-web3-realtime/src/index.ts#10-11), [sendMessage](file:///d:/baba/talak-web3/packages/talak-web3-realtime/src/index.ts#11-12)
- [ ] Add reconnect logic with exponential backoff

### talak-web3-ai
- [ ] Install `openai` (OpenAI-compatible SDK)
- [ ] Replace [TalakWeb3AiPlugin](file:///d:/baba/talak-web3/packages/talak-web3-ai/src/plugin.ts#4-26) stub with real LLM adapter
- [ ] Implement tool-call dispatch
- [ ] Add streaming response support via `AsyncIterable`
- [ ] Make provider URL + key configurable via [TalakWeb3Config](file:///d:/baba/talak-web3/packages/talak-web3-config/src/schema.ts#41-42)

### talak-web3-auth
- [ ] Install `jose` for real JWT validation
- [ ] Implement SIWE (Sign-In with Ethereum) message parsing + verification
- [ ] Add `createSession` / [verifySession](file:///d:/baba/talak-web3/packages/talak-web3-client/src/index.ts#43-46) / `revokeSession` methods
- [ ] Wire to `TalakWeb3Context.auth`

### talak-web3-hooks
- [ ] Add `HookRegistry` class with typed `on/off/emit` methods
- [ ] Export `HookRegistry` from package
- [ ] Add `useGasless` hook
- [ ] Add `useIdentity` hook

## Phase 3 — Create Missing Apps

### apps/example-next-dapp
- [ ] Initialize Next.js 14 App Router project
- [ ] Wire [TalakWeb3Provider](file:///d:/baba/talak-web3/packages/talak-web3-hooks/src/index.tsx#11-18) in root layout
- [ ] Wallet connection page (connect/disconnect, address display)
- [ ] Chain switcher UI component
- [ ] RPC request tester UI
- [ ] Gasless transaction trigger with AA budget display
- [ ] Error boundary integration

### apps/hono-backend
- [ ] Initialize Hono project
- [ ] `GET  /health`
- [ ] `POST /rpc/:chainId` — proxies JSON-RPC to UnifiedRpc
- [ ] `POST /auth/login` — SIWE verify, issue JWT
- [ ] `GET  /auth/verify` — validate Bearer JWT
- [ ] `POST /analytics` — ingest AnalyticsEvent[]
- [ ] Middleware: Zod request validation, CORS, error handler

### apps/react-native-dapp
- [ ] Initialize bare React Native project (Expo managed)
- [ ] Wire [TalakWeb3Provider](file:///d:/baba/talak-web3/packages/talak-web3-hooks/src/index.tsx#11-18)
- [ ] Account + chain state display screen
- [ ] RPC call demo
- [ ] Basic navigation

## Phase 4 — Integration Wiring
- [ ] Ensure `talak-web3-client` endpoint paths match Hono backend routes
- [ ] Wire `talak-web3-analytics` sink to Hono `/analytics`
- [ ] Wire `talak-web3-identity` to real Ceramic in adapters
- [ ] Add missing package.json `exports` for all packages
- [ ] Fix all broken imports (e.g., core reads `c.rpcUrl` vs schema `rpcUrls[0]`)

## Phase 5 — Security & Error Hardening
- [ ] Add `allowedOrigins` to `TalakWeb3ConfigSchema`
- [ ] Add XSS sanitization in dashboard component
- [ ] Replace console logger with structured logger in Context
- [ ] Wrap all async paths in [TalakWeb3Error](file:///d:/baba/talak-web3/packages/talak-web3-errors/src/index.ts#1-15) boundary
- [ ] Add request body size limit in Hono backend

## Phase 6 — Performance
- [ ] Add LRU cache layer to [UnifiedRpc](file:///d:/baba/talak-web3/packages/talak-web3-rpc/src/index.ts#21-141) for read-only calls
- [ ] Memoize [getBestEndpoint()](file:///d:/baba/talak-web3/packages/talak-web3-rpc/src/index.ts#97-108) result for 100ms window
- [ ] Add `useMemo`/`useCallback` wrappers in dashboard component

## Phase 7 — Verification
- [ ] Confirm TypeScript compiles across all packages (`tsc --noEmit`)
- [ ] Confirm all imports resolve
- [ ] Confirm test suites pass
