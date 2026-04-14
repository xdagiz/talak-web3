# Security Model

`talak-web3` is built with a "Secure-by-Default" philosophy. This document outlines our threat model and the mitigations we have implemented to protect decentralized applications.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Threat Model

We assume an adversary who:
- Can intercept non-HTTPS traffic (mitigated by HTTPS requirements).
- Can attempt to replay previous SIWE signatures.
- Can attempt to steal and reuse session tokens (Access/Refresh).
- Can attempt to perform Cross-Site Request Forgery (CSRF) from malicious domains.
- Can attempt to flood the system with RPC requests to drain resources.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Mitigations & Guarantees

### 1. Replay Attack Prevention
**Mitigation**: Atomic Nonce Consumption.
- Every SIWE request requires a unique nonce sourced from the backend.
- The nonce is consumed **atomically** using a Redis Lua script.
- Even if two identical login requests reach different backend instances simultaneously, only one will succeed; the other will find the nonce already deleted.

### 2. Session Theft Mitigation
**Mitigation**: Refresh Token Rotation.
- Access Tokens are short-lived (15 min).
- Refresh Tokens are opaque and one-time use during rotation.
- If a leaked refresh token is reused after it has been rotated, the system can detect the anomaly and revoke the entire session hierarchy for that address.

### 3. CSRF Protection
**Mitigation**: Double-Submit Cookie Pattern.
- We explicitly deny browser-based cross-origin credential passing.
- Every mutating request must include a header-based CSRF token that matches a strictly scoped cookie (`SameSite=Strict`, `Secure`).

### 4. Abuse & Resource Drainage
**Mitigation**: Multi-Layer Rate Limiting.
- **IP-Based**: Protects against infrastructure-level DDoS.
- **Address-Based**: Protects against specific wallet abuse or brute-force attempts on SIWE signatures.

### 5. Fail-Closed Strategy
**Mitigation**: Strict Storage Invariants.
- On storage degradation (e.g., Redis down), the system **fails closed**.
- We never fall back to in-memory non-atomic storage in production, even if configured. This ensures that security guarantees are never weakened by infrastructure instability.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Disclosure Policy

If you identify a vulnerability, please responsibly disclose it according to the instructions in [ROOT/SECURITY.md](../SECURITY.md).

## <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> User Safety Boundaries

- **Production Integrity**: Deploying `MemoryAuthStorage` in production is a critical security violation. The system will attempt to detect and block this, but users must not attempt to force-enable it.
- **Dependency Trust**: Only use trusted, audited plugins and adapters. The `talak-web3` core cannot defend against malicious logic inside a registered plugin.

---

Next: [Troubleshooting](./TROUBLESHOOTING.md)
