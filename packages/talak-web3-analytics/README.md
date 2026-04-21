# @talak-web3/analytics-engine

Analytics and metrics for Web3 applications.

## Installation

```bash
npm install @talak-web3/analytics-engine

yarn add @talak-web3/analytics-engine

pnpm add @talak-web3/analytics-engine
```

## Usage

```typescript
import { createAnalyticsEngine } from '@talak-web3/analytics-engine';

const analytics = createAnalyticsEngine({
  apiKey: process.env.ANALYTICS_KEY,
});

analytics.track('wallet_connected', {
  address: '0x1111111111111111111111111111111111111111',
  chainId: 1,
  connector: 'metamask',
});

analytics.track('transaction_sent', {
  hash: '0x1111111111111111111111111111111111111111',
  value: '1.5',
  token: 'ETH',
});
```

## Features

- Privacy-preserving analytics
- On-chain event tracking
- User journey mapping
- Custom dashboards
- Real-time metrics

## License

MIT
