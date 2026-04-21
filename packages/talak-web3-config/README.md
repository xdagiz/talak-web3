# @talak-web3/config

Configuration management for talak-web3 applications.

## Installation

```bash
npm install @talak-web3/config

yarn add @talak-web3/config

pnpm add @talak-web3/config
```

## Usage

```typescript
import { createConfig, defineConfig } from '@talak-web3/config';

export default defineConfig({
  chains: ['ethereum', 'polygon', 'arbitrum'],
  rpc: {
    ethereum: {
      http: ['https://eth-mainnet.g.alchemy.com/v2/demo_api_key'],
    },
  },
  auth: {
    domain: 'myapp.com',
    sessionDuration: 86400,
  },
});

const config = createConfig({
  configFile: './talak.config.ts',
});
```

## Environment Variables

```env
TALAK_CHAINS=ethereum,polygon
TALAK_RPC_ETHEREUM=https://example.com/resource
TALAK_AUTH_DOMAIN=myapp.com
TALAK_AUTH_SECRET=...
```

## License

MIT
