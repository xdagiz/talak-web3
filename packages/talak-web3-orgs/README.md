# @talak-web3/orgs

Organization and team management for Web3 applications.

## Installation

```bash
npm install @talak-web3/orgs

yarn add @talak-web3/orgs

pnpm add @talak-web3/orgs
```

## Features

### Organization Management

```typescript
import { createOrgManager } from '@talak-web3/orgs';

const orgs = createOrgManager();

const org = await orgs.create({
  name: 'My DAO',
  description: 'A decentralized organization',
});

await orgs.addMember(org.id, {
  address: '0x1111111111111111111111111111111111111111',
  role: 'admin',
});
```

### Role-Based Access

```typescript
const roles = {
  admin: ['*'],
  member: ['read', 'propose'],
  guest: ['read'],
};

const canPropose = await orgs.hasPermission(org.id, user.address, 'propose');
```

### Treasury Management

```typescript
const balance = await orgs.getTreasuryBalance(org.id);

const proposal = await orgs.createProposal({
  orgId: org.id,
  title: 'Fund Project X',
  amount: '1000',
  token: 'USDC',
});
```

## License

MIT
