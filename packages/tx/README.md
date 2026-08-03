# @talak-web3/tx

Account Abstraction (ERC-4337) client for gasless transactions and smart account interactions.

## Installation

```bash
npm install @talak-web3/tx

yarn add @talak-web3/tx

pnpm add @talak-web3/tx
```

## Usage

### Account Abstraction Client

```typescript
import { AccountAbstractionClient } from "@talak-web3/tx";

const client = new AccountAbstractionClient({
  bundlerUrl: "https://bundler.example.com",
  paymasterUrl: "https://paymaster.example.com", // optional
  sender: "0x1111111111111111111111111111111111111111",
  chainId: 1,
  sign: async (hash) => `0x${"00".repeat(32)}`, // sign the userOp hash with the account's key
});

// Send a gasless user operation (builds call data and signs it)
const hash = await client.sendGasless(
  "0x2222222222222222222222222222222222222222", // to
  "0x", // data
  0n, // value (default 0)
);

// Wait for inclusion on-chain
const receipt = await client.waitForReceipt(hash, 60000);
console.log(`Success: ${receipt.success}`);
```

The `entryPoint` and `version` are configured on the client (defaults: `ENTRY_POINT_V07`, `v0.7`):

```typescript
new AccountAbstractionClient({
  bundlerUrl: "https://bundler.example.com",
  sender: "0x1111111111111111111111111111111111111111",
  chainId: 1,
  sign: async (hash) => `0x${"00".repeat(32)}`,
  version: "v0.6",
  entryPoint: ENTRY_POINT_V06,
});
```

### Account Abstraction Plugin

Wires AA support into a `talak-web3` instance via `ctx.adapters.aa`:

```typescript
import { AccountAbstractionPlugin } from "@talak-web3/tx";
import { talakWeb3 } from "@talak-web3/core";

const instance = talakWeb3({});
await instance.init();
const plugin = AccountAbstractionPlugin.setup(instance.context, {
  bundlerUrl: "https://bundler.example.com",
  sender: "0x1111111111111111111111111111111111111111",
  sign: async (hash) => `0x${"00".repeat(32)}`,
});

const hash = await plugin.sendGasless("0x2222222222222222222222222222222222222222", "0x");
```

## API

### `AccountAbstractionClient`

Client for communicating with ERC-4337 bundlers and paymasters.

- `sendGasless(to, data, value?)` - Build, sign, and submit a user operation; returns the user op hash
- `waitForReceipt(userOpHash, timeoutMs?)` - Wait for inclusion on-chain (default timeout: 120s)
- `estimateGas(partial, signal?)` - Estimate gas for a partial user operation (optional `AbortSignal`)
- `getNonce()` - Fetch the smart account nonce
- `buildCallData(to, value, data)` - Encode a wallet-style `execute` call

### `AccountAbstractionPlugin`

- `static setup(ctx, opts)` - Create the plugin and register it on `ctx.adapters.aa`
- `sendGasless(to, data, value?)` - Instance method emitting `tx:gasless-*` hooks

### Constants

- `ENTRY_POINT_V06` - ERC-4337 EntryPoint v0.6 contract address
- `ENTRY_POINT_V07` - ERC-4337 EntryPoint v0.7 contract address

## License

MIT
