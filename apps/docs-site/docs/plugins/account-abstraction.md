# Account Abstraction Plugin

Standard-compliant ERC-4337 implementation.

## Features
- **Gasless Transactions**: Sponsor transactions via Paymasters.
- **User Operations**: High-level API for creating and sending UserOps.
- **Session Keys**: Temporary keys for limited-scope interactions.

## Usage

```typescript
import { talakWeb3 } from '@talak-web3/core';
import { AccountAbstractionPlugin } from '@talak-web3/tx';

const b3 = talakWeb3({
  plugins: [AccountAbstractionPlugin]
});

// Send a gasless transaction
const hash = await b3.aa.sendGasless('0x...', '0x...');
```
