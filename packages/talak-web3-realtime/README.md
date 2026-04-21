# @talak-web3/realtime

Real-time updates via WebSocket for blockchain events.

## Installation

```bash
npm install @talak-web3/realtime

yarn add @talak-web3/realtime

pnpm add @talak-web3/realtime
```

## Usage

```typescript
import { createRealtimeClient } from '@talak-web3/realtime';

const realtime = createRealtimeClient({
  url: 'wss://ws.talak.dev',
});

realtime.subscribe('block', (block) => {
  console.log('New block:', block.number);
});

realtime.subscribe('transactions', {
  address: '0x1111111111111111111111111111111111111111',
}, (tx) => {
  console.log('New transaction:', tx.hash);
});

realtime.subscribe('events', {
  address: '0x1111111111111111111111111111111111111111',
  event: 'Transfer',
}, (event) => {
  console.log('Transfer:', event);
});
```

## Features

- Automatic reconnection
- Event filtering
- Multi-chain support
- Typed events

## License

MIT
