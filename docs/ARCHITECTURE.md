# Architecture Overview

`talak-web3` is built on a modular, context-driven architecture that prioritizes extensibility and security. This document details the core systems that power the framework.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> The Context System

At the heart of every `talak-web3` instance is the **Context**. This is a shared object that provides services and state to all plugins and middlewares.

### Context Composition
- **Config**: The validated global configuration.
- **Hooks**: An event emitter for system-wide lifecycle events (e.g., `plugin-load`).
- **Plugins**: A registry of all active plugins.
- **Auth**: The authoritative authentication engine.
- **RPC**: The unified RPC manager.
- **Cache**: A TTL-based in-memory cache for RPC results and metadata.
- **Logger**: A structured logger for consistent operational visibility.
- **Middleware Chains**: Separate chains for intercepting outgoing requests and incoming responses.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Plugin Lifecycle

Plugins are the primary way to extend `talak-web3` functionality.

### 1. Registration
Plugins are defined in the global configuration and passed to the `talakWeb3()` factory.

### 2. Setup (`init`)
During `instance.init()`, each plugin's `setup(context)` method is called. This is where plugins can:
- Register hooks.
- Add middleware to the `requestChain` or `responseChain`.
- Initialize external connections (e.g., Ceramic nodes).

### 3. Execution
Once set up, plugins operate reactively through hooks or preemptively through middleware.

### 4. Teardown (`destroy`)
When the instance is destroyed, `plugin.teardown()` is called to ensure clean resource disposal.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Middleware Chain

The framework uses an onion-style middleware pattern for both requests and responses.

- **Request Chain**: Intercepts RPC calls before they are dispatched to providers. This is where security invariants, logging, and performance overrides (like caching) live.
- **Response Chain**: Processes results before they are returned to the caller, allowing for data transformation or error normalization.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Unified RPC

The `rpc` module provides a single entry point for all blockchain interactions. It handles:
- **Provider Failover**: Automatically rotates through prioritized RPC URLs if one fails.
- **Context Injection**: Passes the global context into specific request handlers.
- **Deterministic Routing**: Ensures requests are routed to the correct chain based on the provided `chainId`.

## <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> User Safety Boundaries

- **Context Mutation**: Never mutate the `ctx` object directly within a plugin after the `onInit` phase. Use provided registries to ensure deterministic request handling.
- **Middleware Order**: Do not move the `AuthMiddleware` after RPC proxying logic. This would allow unauthenticated users to drain your RPC quotas.

---

Next: [Authentication Model](./AUTH.md)
