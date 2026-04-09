# talak-web3

The unified Web3 backend framework for production-grade dApps.

## Overview
`talak-web3` is a suite of interoperable packages that solve the "Backend Gap" in decentralized applications. It provides the infrastructure for authoritative SIWE, RPC resilience, and account abstraction.

## Installation
```bash
npm install talak-web3
```

## Quick Start
```ts
import { talakWeb3, MainnetPreset } from 'talak-web3';

const app = talakWeb3({
  ...MainnetPreset,
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET
  }
});

await app.init();
```

## React
```tsx
import { TalakWeb3Provider } from 'talak-web3/react';
import { TalakWeb3Client } from 'talak-web3';

const client = new TalakWeb3Client({ baseUrl: 'https://api.yourdapp.com' });
```

## Features
- **Authoritative SIWE**: Beyond client-side signing; real server-side session management.
- **RPC Resilience**: Multi-provider failover and health tracking.
- **Atomic State**: Redis-backed guarantees for nonces and token rotation.
- **Fail-Closed Security**: A system that shuts down safely rather than exposing users on infrastructure failure.

## What This Solves
- **Replay / nonce races**: centralized nonce issuance and verification.
- **Fragile RPC providers**: retries + failover patterns via a unified backend layer.
- **Session theft / weak auth**: server-issued sessions instead of trusting the client.
- **Account abstraction complexity**: consistent middleware surfaces for gasless flows.
- **Production observability gaps**: structured hooks/events across wallet interactions.

## Documentation
For full documentation, visit [the docs site](https://github.com/dagimabebe/talak-web3#readme).
