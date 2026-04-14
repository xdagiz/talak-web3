# RPC Dashboard Example

Demonstrates unified RPC management and authenticated provider proxying using `@talak-web3/client`.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Prerequisites

- `hono-backend` must be running on `http://localhost:8787`.
- Upstream RPC providers must be configured in your backend environment.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> Running the Example

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Start Dev Server**
   ```bash
   pnpm dev
   ```

3. **Visit http://localhost:5173**

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> What it demonstrates

This example showcases how the framework Abstracts infrastructure complexity:
1. **Authenticated Proxying**: The client automatically injects session headers if the user is logged in.
2. **Unified Interface**: Regardless of the backend provider stack, the client uses a consistent `request` method.
3. **Error Handling**: Demonstrates how transport and provider-level errors are surfaced through the framework context.

It highlights the **Stateless Application Layer** — the dashboard doesn't need to know anything about the underlying blockchain providers, only the secure gateway.
