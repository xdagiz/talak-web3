# Authentication Model

`talak-web3` implements a zero-trust, authoritative SIWE (Sign-In with Ethereum) authentication model. This document explains the lifecycle of a session and the security guarantees provided.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> The SIWE Flow

The authentication process is designed to be deterministic and resistant to common Web3 vulnerabilities like replay attacks and front-running.

### 1. Nonce Acquisition
The client requests a nonce from the server.
- **Endpoint**: `POST /auth/nonce`
- **Logic**: The server generates a high-entropy random string, stores it in Redis (associated with the wallet address), and sets a `csrf_token` cookie.

### 2. EIP-4361 Message Signing
The client constructs a SIWE message using the server-provided nonce and signs it using their private key (e.g., via MetaMask or WalletConnect).

### 3. Authorization
The client submits the message and signature.
- **Endpoint**: `POST /auth/login`
- **Logic**:
    - **Header Check**: Must include the `x-csrf-token` matching the session cookie.
    - **Nonce Verification**: The server consumes the nonce from Redis using a Lua script. If the nonce is missing or already used, the request is rejected immediately (**Atomic Consumption**).
    - **Signature Verification**: The signature is verified against the derived address from the SIWE message.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Token Lifecycle

Upon successful login, the server issues a pair of tokens:

### 1. Access Token (JWT)
- **Format**: Signed JWT.
- **Expiry**: 15 minutes (default).
- **Usage**: Included in the `Authorization: Bearer <token>` header for all protected RPC calls and API routes.

### 2. Refresh Token (Opaque)
- **Format**: Cryptographically random string (stored as a SHA-256 hash in Redis).
- **Expiry**: 7 days (default).
- **Usage**: Used to obtain a new Access Token/Refresh Token pair via `POST /auth/refresh`.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Token Rotation

`talak-web3` enforces **Refresh Token Rotation**. When a refresh token is used:
1. The old token is immediately revoked in Redis.
2. A new Access Token and a NEW Refresh Token are issued.
3. If an old, revoked refresh token is attempted to be used again, it alerts the system to a potential theft, and the entire session can be invalidated.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> CSRF Protection

We use a **Double-Submit Cookie** pattern:
- A `csrf_token` cookie is set on the first interaction (`/auth/nonce`).
- Every subsequent mutating request (POST, PUT, DELETE) must include an `x-csrf-token` header with the same value.
- The server validates that the header matches the cookie before processing the request.

## <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> User Safety Boundaries

- **Atomic Integrity**: Do not replace the Redis-backed nonce storage with local `Map` or in-memory arrays in production. This breaks atomicity across scaled instances.
- **Rotation Enforcement**: Ensure the `refresh` endpoint always rotates tokens. Disabling rotation allows for indefinite session hijacking if a token is ever leaked.
- **CSRF Exactness**: Do not use wildcard (`*`) origins in `ALLOWED_ORIGINS`. This invalidates the Double-Submit Cookie protection and exposes your users to cross-site attacks.

---

Next: [Deployment Guide](./DEPLOYMENT.md)
