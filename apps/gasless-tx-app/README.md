# Gasless Transaction Example

Shows how to implement account abstraction and sponsored transactions using `@talak-web3/tx` and `@talak-web3/client`.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Prerequisites

- `hono-backend` must be running on `http://localhost:8787`.
- An **Account Abstraction Plugin** and **Paymaster** must be configured in your backend context.

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

This example showcases the **ERC-4337 Full-Stack Flow**:
1. **UserOp Construction**: The client uses the transaction builder to define intent.
2. **Paymaster Off-chain Signing**: The backend proxy communicates with the paymaster service (via its own adapters) to sponsor the gas.
3. **Bundler Submission**: The finalized transaction is submitted to a bundler via the unified RPC interface.

It demonstrates how the framework obscures the complexity of gas payment, allowing developers to build "one-click" Web3 experiences.
