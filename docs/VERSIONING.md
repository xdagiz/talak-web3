# <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Versioning Strategy

`talak-web3` follows **Semantic Versioning 2.0.0** (Semver) across the entire monorepo. This document defines the rules for version increments and plugin compatibility.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> Versioning Rules

- **MAJOR (x.0.0)**: Breaking changes to core context interfaces (`TalakWeb3Context`), authentication invariants, or mandatory Redis Lua script structures.
- **MINOR (0.x.0)**: New features, such as new lifecycle hooks, core plugins, or optional adapters, that do not break existing implementations.
- **PATCH (0.0.x)**: Bug fixes, security patches, and performance optimizations.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Plugin Compatibility

Plugins MUST declare their compatibility with the core framework.

1. **Explicit Versioning**: All plugins in the monorepo must match the current major version of `@talak-web3/core`.
2. **Semver Checks**: During `TalakWeb3.init()`, the framework validates that all registered plugins are compatible with the current runtime version.
3. **Deprecation Cycle**: Breaking changes will be preceded by at least one minor version where the old behavior is marked `DEPRECATED` in logs.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Upgrade Process

1. **Review DECISIONS.md**: Check if any architectural mandates have changed.
2. **Review Deployment Logs**: Check for tags indicating deprecated plugin usage.
3. **Atomic Updates**: It is recommended to update all `@talak-web3/*` packages to the same version simultaneously to ensure internal dependency synchronization.
4. **Validation**: Run the full check suite (`pnpm test`, `pnpm typecheck`) before deploying to production.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Version Mismatch Policy

If a plugin requires a major version of `@talak-web3/core` that does not match the current runtime, the framework will:
1. Log an `PLUGIN_VERSION_MISMATCH` error.
2. **Fail-Closed**: Prevent initialization (`init()` will throw) to avoid non-deterministic behavior or security gaps.
