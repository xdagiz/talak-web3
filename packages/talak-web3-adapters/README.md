# @talak-web3/adapters

Adapters for external protocols and services (Ceramic, Tableland, etc.).

## Installation

```bash
npm install @talak-web3/adapters

yarn add @talak-web3/adapters

pnpm add @talak-web3/adapters
```

## Adapters

### Ceramic

Interact with Ceramic Network for decentralized data.

```typescript
import { CeramicAdapter } from '@talak-web3/adapters';

const ceramic = new CeramicAdapter({
  ceramicUrl: 'https://ceramic-clay.3boxlabs.com',
  seed: process.env.CERAMIC_SEED,
});

const stream = await ceramic.createTile({
  content: { name: 'My Profile', avatar: 'example-value' },
});
```

### Tableland

SQL database on the blockchain.

```typescript
import { TablelandAdapter } from '@talak-web3/adapters';

const tableland = new TablelandAdapter({
  privateKey: process.env.TABLELAND_KEY,
  chain: 'ethereum-goerli',
});

const { name } = await tableland.create(
  `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`
);

await tableland.write(`INSERT INTO ${name} (id, name) VALUES (1, 'Alice')`);
```

## License

MIT
