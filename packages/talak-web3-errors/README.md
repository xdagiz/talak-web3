# @talak-web3/errors

Standardized error handling for talak-web3.

## Installation

```bash
npm install @talak-web3/errors
# or
yarn add @talak-web3/errors
# or
pnpm add @talak-web3/errors
```

## Usage

```typescript
import {
  TalakError,
  AuthError,
  RpcError,
  ValidationError
} from '@talak-web3/errors';

// Throw standardized errors
throw new AuthError('Invalid signature', {
  code: 'AUTH_INVALID_SIGNATURE',
  statusCode: 401,
});

// Handle errors
try {
  await authenticate(message, signature);
} catch (error) {
  if (error instanceof AuthError) {
    console.log(error.code); // 'AUTH_INVALID_SIGNATURE'
    console.log(error.statusCode); // 401
  }
}
```

## Error Types

- `TalakError` - Base error class
- `AuthError` - Authentication errors
- `RpcError` - RPC/Blockchain errors
- `ValidationError` - Input validation errors
- `ConfigError` - Configuration errors
- `NetworkError` - Network-related errors

## License

MIT
