# @talak-web3/middleware

Middleware for authentication and authorization.

## Installation

```bash
npm install @talak-web3/middleware

yarn add @talak-web3/middleware

pnpm add @talak-web3/middleware
```

## Usage

### Authentication Middleware

```typescript
import { authMiddleware } from '@talak-web3/middleware';
import express from 'express';

const app = express();

app.use(authMiddleware({
  secret: process.env.JWT_SECRET,
  issuer: 'myapp.com',
}));

app.get('/protected', (req, res) => {
  res.json({ address: req.user.address });
});
```

### Authorization Middleware

```typescript
import { requireRole } from '@talak-web3/middleware';

app.post('/admin', requireRole('admin'), (req, res) => {

});

app.post('/holder', requireNFT('0x1111111111111111111111111111111111111111'), (req, res) => {

});
```

### Rate Limiting

```typescript
import { rateLimit } from '@talak-web3/middleware';

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
}));
```

## License

MIT
