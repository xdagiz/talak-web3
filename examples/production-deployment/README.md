# <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Production Deployment Reference

This example demonstrates the authoritative production topology for `talak-web3`.

---

## 1. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Topology Overview

The reference architecture consists of three core layers:
1. **Nginx (Edge)**: Handles SSL termination, security headers, and reverse proxying.
2. **Hono Backend (App)**: The stateless framework instance running in production mode.
3. **Redis (State)**: The shared, atomic store for session management and rate limiting.

## 2. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Prerequisites

- **Docker & Docker Compose**: Installed on the host machine.
- **SSL Certificates**: Place `fullchain.pem` and `privkey.pem` in the `./certs` directory.
- **Domain Name**: A valid domain pointing to your host IP.

## 3. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Quickstart (Production)

1. **Clone & Configure**
   ```bash
   cp .env.production.example .env
   # Edit .env with your production secrets and domain
   ```

2. **Prepare Certificates**
   Ensure your SSL certificates are in `./certs/`.

3. **Launch Stack**
   ```bash
   docker-compose up -d --build
   ```

## 4. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Failure Simulation (Mandatory Verification)

To trust the system, you must observe its failure behavior.

### 4.1. Redis Outage
- **Action**: `docker-compose stop redis`
- **Expected**: Any request to `/auth/login` or `/auth/nonce` must return `503 Service Unavailable`.
- **Reasoning**: The system **fails closed** to prevent un-recorded session issuance.

### 4.2. Upstream RPC Outage
- **Action**: Edit `.env` to include an invalid RPC URL as the primary provider.
- **Expected**: The system should automatically failover to the secondary provider without user impact.
- **Verification**: Check logs for `UnifiedRpc: Provider failover triggered`.

### 4.3. Token Replay (Attack)
- **Action**: Attempt to use an already-rotated Refresh Token.
- **Expected**: The request must be rejected with `401 Unauthorized`.
- **Verification**: Check logs for `Refresh token reuse detected. Revoking entire session hierarchy.`

## 5. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Operational Guarantees

- **Fail-Closed**: No in-memory fallbacks on Redis failure.
- **Stateless Scaling**: Scale `backend` service freely via `docker-compose up --scale backend=3`.
- **Header Integrity**: Nginx forwards `X-Forwarded-For` for accurate rate limiting.

---

[Back to Root README](../../README.md)
