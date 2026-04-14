# <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> API Stability Contract

To enable ecosystem-wide trust, `talak-web3` adheres to a strict stability contract. This document defines which interfaces are safe for production relyance and how we handle breaking changes.

---

## 1. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Stable APIs (Tier 1)

These APIs are guaranteed to follow SemVer and will receive long-term support (LTS). Breaking changes require a major version bump and a 6-month deprecation period.

- **Auth Interface**: `login()`, `logout()`, `refresh()`.
- **Plugin Lifecycle**: `onBeforeRequest`, `onResponse`, `onInit`.
- **RPC Proxying**: The standard JSON-RPC mapping layer.
- **Client SDK Hooks**: `useAuth()`, `useUnifiedRpc()`.

## 2. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Experimental APIs (Tier 2)

These APIs are evolving and may change between minor versions. Use with caution in production.

- **AI-Driven Transaction Optimization**: Automatically selecting gas parameters.
- **New Service Adapters**: Emerging storage or identity adapters.
- **Advanced CLI Commands**: Interactive scaffolding tools.

## 3. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Breaking Change Policy

1. **RFC Process**: Any breaking change to a Tier 1 API must be proposed via a GitHub issue as an RFC.
2. **Deprecation**: Deprecated features will trigger console warnings for one full major version before removal.
3. **Migration Guides**: Every major release will include an automated or manual migration guide in the [CHANGELOG](../CHANGELOG.md).

---

[Back to Root README](../README.md)
