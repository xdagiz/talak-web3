# Failure Modes & Resilience

`talak-web3` adopts a **fail-closed** security posture. This document explains how the system behaves under infrastructure degradation.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Critical Failure Scenarios

### 1. Redis Unavailability
**Behavior**: **FAIL-CLOSED**
- **Impact**: `/auth/nonce`, `/auth/login`, and `/auth/refresh` will return `503 Service Unavailable`.
- **Reasoning**: Without Redis, we cannot guarantee the atomicity of nonce consumption or token rotation. Falling back to in-memory storage would expose the system to replay and reuse attacks across scaled instances.

### 2. Rate Limiter Failure
**Behavior**: **FAIL-CLOSED**
- **Impact**: If the storage backing the rate limiter is unreachable, all requests to that endpoint will be denied with `503 Service Unavailable`.
- **Reasoning**: We prioritize protecting the system from abuse over availability when the abuse-prevention mechanism is down.

### 3. Upstream RPC Failure
**Behavior**: **FAILOVER**
- **Impact**: If an RPC provider fails, the `UnifiedRpc` will automatically attempt the request on the next available provider in the priority list.
- **Final Result**: If ALL providers for a chain fail, the request returns `502 Bad Gateway`.

### 4. JWT Secret Compromise
**Behavior**: **MANUAL INTERVENTION REQUIRED**
- **Impact**: An attacker with the `JWT_SECRET` can forge valid Access Tokens.
- **Resilience**: Rotation of the secret will immediately invalidate all existing Access Tokens, forcing all users to re-authenticate (via their Refresh Tokens, unless those are also compromised).

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Recovery Procedures

### Recovering from Redis Failure
1. Restore connectivity to the Redis cluster.
2. The `hono-backend` will automatically reconnect (via the `redis` client's built-in retry logic).
3. Service will resume once the connection is established.

### Recovering from RPC Outage
1. Update your configuration with fresh, working RPC URLs.
2. The `UnifiedRpc` manager will pick up the new configuration without requiring a restart if using dynamic configuration plugins.

---

[Back to Root README](../README.md)
