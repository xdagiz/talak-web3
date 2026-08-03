# @talak-web3/client

HTTP client for talak-web3 auth API interactions.

## Installation

```bash
npm install @talak-web3/client

yarn add @talak-web3/client

pnpm add @talak-web3/client
```

Or use `TalakWeb3Client` from the unified `talak-web3` package.

## Usage

```typescript
import { TalakWeb3Client } from "@talak-web3/client";

const client = new TalakWeb3Client({
  baseUrl: "https://api.example.com",
});

const { nonce } = await client.getNonce(address);
await client.loginWithSiwe(message, signature);
await client.logout();
```

For Next.js apps with the handler at `/api/auth/*`, use `baseUrl: "/api"`.

See the [Next.js integration](https://docs.talak.dev/docs/nextjs) for the full App Router setup.

## License

MIT
