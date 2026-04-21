# @talak-web3/utils

Utility functions for talak-web3.

## Installation

```bash
npm install @talak-web3/utils

yarn add @talak-web3/utils

pnpm add @talak-web3/utils
```

## Utilities

### Address Utilities

```typescript
import {
  isAddress,
  getAddress,
  shortenAddress,
  checksumAddress
} from '@talak-web3/utils';

isAddress('0x1111111111111111111111111111111111111111');
getAddress('0x1111111111111111111111111111111111111111');
shortenAddress('0x1234567890abcdef...');
checksumAddress('0x1111111111111111111111111111111111111111');
```

### Hex Utilities

```typescript
import {
  hexToString,
  stringToHex,
  hexToNumber,
  numberToHex
} from '@talak-web3/utils';

hexToString('0x68656c6c6f');
stringToHex('hello');
```

### Formatting

```typescript
import {
  formatEther,
  parseEther,
  formatUnits,
  parseUnits
} from '@talak-web3/utils';

formatEther(1000000000000000000n);
parseEther('1.0');
```

### Validation

```typescript
import {
  isValidSignature,
  isValidNonce,
  isExpired
} from '@talak-web3/utils';

isValidSignature(message, signature, address);
isExpired(timestamp);
```

## License

MIT
