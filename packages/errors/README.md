# @talak-web3/errors

Standardized error handling for talak-web3.

## Installation

```bash
npm install @talak-web3/errors
pnpm add @talak-web3/errors
```

## Usage

```typescript
import { TalakWeb3Error, AuthError, AUTH_ERROR_CODES, RPC_ERROR_CODES } from "@talak-web3/errors";

throw new TalakWeb3Error("SIWE expired", {
  code: AUTH_ERROR_CODES.SIWE_EXPIRED,
  status: 401,
});

try {
  await authenticate(message, signature);
} catch (error) {
  if (error instanceof TalakWeb3Error) {
    console.log(error.code); // "AUTH_SIWE_EXPIRED"
    console.log(error.status); // 401
  }
}
```

## Error Classes

| Class            | Base             | Usage                                                   |
| ---------------- | ---------------- | ------------------------------------------------------- |
| `TalakWeb3Error` | `Error`          | Base error class with `code`, `status`, `data`, `cause` |
| `AuthError`      | `TalakWeb3Error` | Broad authentication errors (status 401)                |

## Error Code Constants

All error codes are exported as `as const` objects for type-safe matching:

- `AUTH_ERROR_CODES` — 42 codes (SIWE, JWT, nonce, refresh token errors)
- `RPC_ERROR_CODES` — 7 codes (retries, validation, endpoints)
- `CONFIG_ERROR_CODES` — 1 code
- `SECURITY_ERROR_CODES` — 3 codes (param validation, secret leak, CORS)
- `PLUGIN_ERROR_CODES` — 2 codes
- `STORAGE_ERROR_CODES` — 4 codes
- `TABLELAND_ERROR_CODES` — 2 codes
- `CERAMIC_ERROR_CODES` — 1 code
- `AI_ERROR_CODES` — 3 codes
- `CRYPTO_ERROR_CODES` — 2 codes
- `REALTIME_ERROR_CODES` — 1 code
- `TX_ERROR_CODES` — 1 code
- `AA_ERROR_CODES` — 4 codes
- `CIRCUIT_ERROR_CODES` — 1 code

## License

MIT
