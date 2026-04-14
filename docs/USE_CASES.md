# <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Real-World Use Cases

This document provides concrete architectural patterns for implementing `talak-web3` in diverse production scenarios.

---

## 1. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Case 1 — SaaS Backend (Enterprise Auth)

**Scenario**: A Web3-native B2B platform requiring traditional session management coupled with wallet-based identity.

### Request Flow
1. **Auth**: User logs in via SIWE. Server issues a 15-minute Access JWT and a 7-day rotating Refresh Token.
2. **Persistence**: Access Token is stored in memory; Refresh Token is stored in a `Secure` cookie.
3. **API Access**: All subsequent GraphQL/REST calls include the `Authorization: Bearer <JWT>` header.
4. **Validation**: The `hono-backend` validates the JWT statelessly. If expired, the client calls `/auth/refresh`.

### Data Flow
- **Client**: Submits SIWE message → Receives tokens.
- **Backend**: Verifies SIWE → Checks Redis for nonce usage → Writes new session to Redis → Returns JWT.
- **Redis**: Stores `{address}:session` and `{address}:nonce`.

### System Boundary
- **Inside**: Auth logic, session validation, rate limiting.
- **Outside**: Application business logic (e.g., Stripe integration, DB writes).

---

## 2. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Case 2 — DAO Backend (Role-Based Governance)

**Scenario**: A DAO dashboard where different wallet addresses have different permissions (Admin, Member, Voter).

### Request Flow
1. **Identity**: User authenticates with SIWE.
2. **Authorization**: A `talak-web3` plugin interceptor checks the wallet address against an on-chain registry or off-chain database.
3. **Context Injection**: The `context` object in Hono is populated with `user.role`.
4. **Execution**: Middleware blocks or allows requests to `/admin` or `/propose` based on `user.role`.

### Data Flow
- **RPC**: Framework calls `balanceOf` or `hasRole` on-chain through the `UnifiedRpc` manager with failover support.
- **Caching**: Role data is cached in Redis for 5 minutes to reduce RPC costs.

### System Boundary
- **Inside**: RPC management, on-chain role verification.
- **Outside**: Governance smart contracts, snapshotting logic.

---

## 3. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Case 3 — Creator Platform (Storage & Analytics)

**Scenario**: A platform where creators upload content (S3) and track engagement (Prometheus) using authenticated sessions.

### Request Flow
1. **Upload**: User requests a pre-signed S3 URL. Backend validates JWT before generating the URL via the `S3Adapter`.
2. **Metrics**: Every authenticated request triggers a hook in the `AnalyticsPlugin` to increment Prometheus counters.
3. **Identity**: Creator's address is used as the key for asset ownership in the backend DB.

### Data Flow
- **Hooks**: Request → `onBeforeRequest` (track metrics) → `onResponse` (log status).
- **Adapters**: Backend context provides `ctx.storage` (S3) and `ctx.metrics` (Prometheus).

### System Boundary
- **Inside**: Metric tracking, S3 adapter registration, JWT scoping.
- **Outside**: AWS S3, Prometheus/Grafana instance.

---

[Back to Root README](../README.md)
