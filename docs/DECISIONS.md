# Architectural Decision Records (ADR)

This document defines the non-negotiable architectural mandates of `talak-web3`. Every future contributor and user must conform to these decisions to maintain the framework's security and stability guarantees.

## 1. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Fail-Closed Architecture

**Decision**: The framework must adopt a strict "Fail-Closed" posture for all security-critical operations.

- **Rationale**: In Web3, a "Fail-Open" state (e.g., allowing requests when the auth store is down) is equivalent to a total security breach. It is better to deny service than to permit unverified actions.
- **Enforcement**:
    - If Redis is unavailable, all `/auth` endpoints must return `503 Service Unavailable`.
    - If a rate limiter cannot verify quotas, it must block the request.
    - If a signature cannot be verified due to infrastructure lag, the session must not be issued.

## 2. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Mandatory Redis Usage

**Decision**: Redis is the only permitted persistence layer for production-grade authentication and rate limiting.

- **Rationale**: Atomic operations are required to prevent replay attacks (nonce consumption) and token reuse. Only Redis provides the necessary Lua scripting capabilities to ensure these operations are indivisible across horizontally scaled instances.
- **Enforcement**:
    - `MemoryAuthStorage` is strictly for local development and CI testing.
    - Any production deployment lacking a `REDIS_URL` must be considered insecure and unsupported.

## 3. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Auth Model (SIWE + JWT + Refresh)

**Decision**: A hybrid model of EIP-4361 (SIWE), short-lived JWTs, and opaque rotating Refresh Tokens.

- **Rationale**: 
    - **SIWE**: Provides cryptographic proof of wallet ownership.
    - **JWT**: Enables stateless authorization for high-performance RPC proxying.
    - **Refresh Tokens**: Enable long-lived sessions with the ability to revoke access without waiting for JWT expiry.
- **Enforcement**:
    - Refresh tokens must be rotated on every use.
    - Revocation of a single refresh token must invalidate the entire session hierarchy for that address.

## 4. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Plugin System Design

**Decision**: Plugins operate through a strict registry and predefined lifecycle hooks.

- **Rationale**: To prevent non-deterministic behavior and "callback hell," all extensions must be registered during initialization and respect the core context's lifecycle.
- **Enforcement**:
    - No dynamic plugin registration at runtime.
    - Plugins cannot mutate the core `context` object after initialization; they may only use provided hook/middleware registries.

## 5. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> RPC Abstraction Layer

**Decision**: All blockchain interactions must traverse the `UnifiedRpc` abstraction.

- **Rationale**: Direct RPC calls bypass the framework's security middleware, logging, and failover logic. The framework must maintain health tracking of upstream providers to ensure high availability.
- **Enforcement**:
    - Outgoing requests must support automated failover across at least two unique providers in production.
    - Every RPC call must be associated with the current Request Context for tracing and observability.
## 6. <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> User Safety Boundaries

- **Fail-Closed Mandate**: Any custom plugin must respect the `fail-closed` policy. If a plugin's external dependency is down, it must throw an error that triggers a 503 response, rather than allowing the request to proceed in an unverified state.
- **Statelessness**: Avoid introducing local server state (variables, caches) that are not synchronized via Redis. This breaks horizontal scalability.
