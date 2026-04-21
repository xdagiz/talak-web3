# @talak-web3/handlers

Request handlers for various frameworks (Express, Fastify, Hono, Next.js).

## Installation

```bash
npm install @talak-web3/handlers

yarn add @talak-web3/handlers

pnpm add @talak-web3/handlers
```

## Express

```typescript
import { createAuthRouter } from '@talak-web3/handlers/express';
import express from 'express';

const app = express();

app.use('/auth', createAuthRouter({
  domain: 'myapp.com',
  secret: process.env.JWT_SECRET,
}));
```

## Hono

```typescript
import { createAuthApp } from '@talak-web3/handlers/hono';
import { Hono } from 'hono';

const app = new Hono();

app.route('/auth', createAuthApp({
  domain: 'myapp.com',
  secret: process.env.JWT_SECRET,
}));
```

## Next.js

```typescript
import { createAuthHandler } from '@talak-web3/handlers/nextjs';

export default createAuthHandler({
  domain: 'myapp.com',
  secret: process.env.JWT_SECRET,
});
```

## License

MIT
