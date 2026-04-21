# @talak-web3/utils

Utility functions for talak-web3.

## Installation

```bash
npm install @talak-web3/utils
# or
yarn add @talak-web3/utils
# or
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

isAddress('0x1111111111111111111111111111111111111111'); // true/false
getAddress('0x1111111111111111111111111111111111111111'); // checksummed address
shortenAddress('0x1234567890abcdef...'); // 0x1234...cdef
checksumAddress('0x1111111111111111111111111111111111111111'); // EIP-55 checksummed
```

### Hex Utilities

```typescript
import {
  hexToString,
  stringToHex,
  hexToNumber,
  numberToHex
} from '@talak-web3/utils';

hexToString('0x68656c6c6f'); // 'hello'
stringToHex('hello'); // '0x68656c6c6f'
```

### Formatting

```typescript
import {
  formatEther,
  parseEther,
  formatUnits,
  parseUnits
} from '@talak-web3/utils';

formatEther(1000000000000000000n); // '1.0'
parseEther('1.0'); // 1000000000000000000n
```

### Validation

```typescript
import {
  isValidSignature,
  isValidNonce,
  isExpired
} from '@talak-web3/utils';

isValidSignature(message, signature, address); // true/false
isExpired(timestamp); // true/false
```

## License

MIT
