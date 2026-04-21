# @talak-web3/identity

Decentralized identity management for Web3 applications.

## Installation

```bash
npm install @talak-web3/identity

yarn add @talak-web3/identity

pnpm add @talak-web3/identity
```

## Features

### DID Management

```typescript
import { createIdentityManager } from '@talak-web3/identity';

const identity = createIdentityManager({
  provider: 'ethereum',
});

const did = await identity.createDID({
  address: '0x1111111111111111111111111111111111111111',
});

const doc = await identity.resolveDID('did:ethr:0x1111111111111111111111111111111111111111');
```

### Verifiable Credentials

```typescript
const credential = await identity.issueCredential({
  subject: 'did:ethr:0x1111111111111111111111111111111111111111',
  claims: {
    name: 'Alice',
    role: 'admin',
  },
});

const isValid = await identity.verifyCredential(credential);
```

### Profile Management

```typescript
const profile = await identity.getProfile('0x1111111111111111111111111111111111111111');

await identity.updateProfile({
  name: 'Alice',
  avatar: 'https://example.com/resource',
  bio: 'Web3 enthusiast',
});
```

## License

MIT
