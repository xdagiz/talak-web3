# Security Policy

`talak-web3` places the highest priority on secure-by-default execution and guarantees for decentralized applications.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Threat Model & Guarantees

- **Authentication Replay**: Prevented by an authoritative, Redis-backed atomic Lua exchange. Nonces strictly track consumption bounds under high concurrency.
- **Refresh Reuse and Theft**: Prevented via opaque refresh tokens rotating under single-use deterministic invalidation hashes (SHA-256).
- **Brute Force & Abuse**: Mitigated strictly at the edge using an IP and address mapped token bucket fail-closed strategy.
- **CSRF (Cross-Site Request Forgery)**: Blocked cleanly by explicitly denying browser-based cross-origin credential passing and opting for an Authorization header-only verification loop, secured by exact Set-based CORS.
- **Client Extensibility Bounds**: The core SDK queues and buffers network failures under an isolated Mutex to prevent retry amplification attacks.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Environment Fallbacks

Development bounds explicitly forbid deploying `MemoryAuthStorage` instances in Node.js production environments. If `REDIS_URL` is configured, subsequent network degradations will fail-closed. Do not attempt to bypass this explicitly; doing so voids zero-trust guarantees.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Reporting a Vulnerability

If you identify a vulnerability in `talak-web3`, please DO NOT open a public issue.
Instead, responsibly disclose the issue to our security team. We will acknowledge receipt immediately and work transparently toward a CVE disclosure or fix.
## <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> User Safety Boundaries

- **Production Integrity**: Deploying `MemoryAuthStorage` in production is a critical security violation. The system will attempt to detect and block this, but users must not attempt to force-enable it.
- **Dependency Trust**: Only use trusted, audited plugins and adapters. The `talak-web3` core cannot defend against malicious logic inside a registered plugin.
