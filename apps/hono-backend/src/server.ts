import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { z } from 'zod';
import { TalakWeb3Error } from '@talak-web3/errors';
import { talakWeb3 } from '@talak-web3/core';
import type { TalakWeb3Context } from '@talak-web3/types';
import { createClient } from 'redis';
import { strictCors } from './security/cors.js';
import { RedisAuthStorage, MemoryAuthStorage } from './security/storage.js';
import type { AuthStorage } from './security/storage.js';
import { TalakWeb3Auth } from '@talak-web3/auth';
import { logger, requestLogger, getLogger } from './logger.js';
import { secureHeaders } from 'hono/secure-headers';
import { csrfProtection } from './security/csrf.js';
import { metricsMiddleware, metrics } from './metrics.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// Context configuration tracking
// ---------------------------------------------------------------------------

const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  logger.warn('ALLOWED_ORIGINS is not set — all cross-origin requests will be rejected');
}

// ---------------------------------------------------------------------------
// Storage & Core Init (Strict Fail-Closed Production Model)
// ---------------------------------------------------------------------------

let storage: AuthStorage;

const redisUrl = process.env['REDIS_URL'];
if (redisUrl) {
  const redis = createClient({ url: redisUrl });
  redis.on('error', (err) => logger.error({ err }, 'redis error'));
  void redis.connect();
  storage = new RedisAuthStorage(redis as any, true);
} else {
  storage = new MemoryAuthStorage();
}

const auth = new TalakWeb3Auth({
  ...(process.env['SIWE_DOMAIN'] ? { expectedDomain: process.env['SIWE_DOMAIN'] } : {}),
  ...(storage.nonceStore ? { nonceStore: storage.nonceStore } : {}),
  ...(storage.refreshStore ? { refreshStore: storage.refreshStore } : {}),
});

// ---------------------------------------------------------------------------
// Middleware: Security, Logging, Parsing
// ---------------------------------------------------------------------------

// Inject structured logger with unique x-request-id
app.use('*', requestLogger());

// Standard security headers (HSTS, NoSniff, Frame-Options, XSS)
app.use('*', secureHeaders());

// Metrics collection
app.use('*', metricsMiddleware());

// Double-submit CSRF enforcement (sets cookie on every request, verifies header on POST/PUT/DELETE)
app.use('*', csrfProtection());

// Strict exact-match CORS (explicitly disables credentials)
app.use('*', strictCors({ allowedOrigins }));

// Body-size guard
app.use('*', async (c, next) => {
  const len = c.req.header('content-length');
  if (len && Number(len) > 1_000_000) {
    return c.json({ error: 'Request body too large' }, 413);
  }
  await next();
});

// Global error handler
app.onError((err, c) => {
  const log = getLogger(c);
  if (err instanceof TalakWeb3Error) {
    return c.json({ error: err.message, code: err.code }, err.status as any);
  }
  log.error({ err }, 'unhandled error');
  return c.json({ error: 'Internal Server Error' }, 500);
});

import type { Context } from 'hono';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getIp(c: Context): string {
  return (c.req.header('x-forwarded-for') ?? c.req.raw.headers.get('cf-connecting-ip') ?? 'unknown').split(',')[0]?.trim() ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/health', (c) => c.json({ ok: true, now: Date.now() }));

app.get('/metrics', (c) => {
  // Simple console export for this phase as per requirements
  return c.text('Metrics are being collected in the backend logs. Prometheus sink pending.');
});

const NonceBody = z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) });

app.post('/auth/nonce', async (c) => {
  const log = getLogger(c);
  const ip = getIp(c);
  const m = c.get('metrics');

  try {
    const rl = await storage.checkRateLimit(`rl:nonce:ip:${ip}`, 10, 10 / 60);
    if (!rl.allowed) {
      log.warn({ ip }, 'rate limit hit on /auth/nonce');
      m.increment('rate_limit.hit', { endpoint: '/auth/nonce', ip });
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
  } catch (err) {
    log.error({ err }, 'auth storage failure during /auth/nonce rate limit');
    return c.json({ error: 'Service Unavailable' }, 503);
  }

  const bodyResult = NonceBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: 'Invalid address' }, 400);

  try {
    const ua = c.req.header('user-agent') ?? undefined;
    
    const opts: { ip?: string; ua?: string } = {};
    if (ip) opts.ip = ip;
    if (ua) opts.ua = ua;
    
    const nonce = await auth.createNonce(bodyResult.data.address, Object.keys(opts).length > 0 ? opts : undefined);
    log.info({ address: bodyResult.data.address, ip }, 'nonce created');
    return c.json({ nonce });
  } catch (err) {
    log.error({ err }, 'failed to create nonce');
    return c.json({ error: 'Service Unavailable' }, 503);
  }
});

const RpcBody = z.object({
  jsonrpc: z.literal('2.0').optional(),
  id: z.number().optional(),
  method: z.string().min(1),
  params: z.array(z.unknown()).optional(),
});

app.post('/rpc/:chainId', async (c) => {
  const start = Date.now();
  const m = c.get('metrics');
  const bodyResult = RpcBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: 'Invalid JSON-RPC request' }, 400);
  
  try {
    const instance = talakWeb3({});
    const ctx: TalakWeb3Context = instance.context;
    const result = await ctx.rpc.request(bodyResult.data.method, bodyResult.data.params ?? []);
    m.timing('rpc.duration', Date.now() - start, { method: bodyResult.data.method });
    return c.json({ jsonrpc: '2.0', id: bodyResult.data.id ?? 1, result });
  } catch (err) {
    m.increment('rpc.error', { method: bodyResult.data.method });
    throw err;
  }
});

const LoginBody = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

app.post('/auth/login', async (c) => {
  const start = Date.now();
  const log = getLogger(c);
  const ip = getIp(c);
  const m = c.get('metrics');

  const bodyResult = LoginBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) {
    return c.json({ error: 'Invalid request body' }, 400);
  }
  const body = bodyResult.data;

  // Extract address early for per-address rate limiting and logging
  const addrMatch = body.message.match(/\n(0x[a-fA-F0-9]{40})\n/);
  const address = addrMatch?.[1]?.toLowerCase();

  try {
    // 1. IP Rate limit
    const ipRl = await storage.checkRateLimit(`rl:login:ip:${ip}`, 20, 20 / 60);
    if (!ipRl.allowed) {
      log.warn({ ip, address }, 'rate limit hit on /auth/login (IP)');
      m.increment('rate_limit.hit', { endpoint: '/auth/login', ip });
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    // 2. Address Rate limit
    if (address) {
      const addrRl = await storage.checkRateLimit(`rl:login:addr:${address}`, 10, 10 / 120);
      if (!addrRl.allowed) {
        log.warn({ address, ip }, 'rate limit hit on /auth/login (address)');
        m.increment('rate_limit.hit', { endpoint: '/auth/login', address });
        return c.json({ error: 'Rate limit exceeded' }, 429);
      }
    }
  } catch (err) {
    log.error({ err }, 'auth storage failure during /auth/login rate limit');
    return c.json({ error: 'Service Unavailable' }, 503);
  }

  try {
    const { accessToken, refreshToken } = await auth.loginWithSiwe(body.message, body.signature);
    log.info({ address, ip }, 'login success');
    m.increment('auth.login.success', { address: address ?? 'unknown' });
    m.timing('auth.login.duration', Date.now() - start);
    return c.json({ accessToken, refreshToken });
  } catch (err) {
    const code = err instanceof TalakWeb3Error ? err.code : 'AUTH_UNKNOWN';
    log.warn({ address, ip, code, err }, 'login failed');
    m.increment('auth.login.failure', { code, address: address ?? 'unknown' });
    if (err instanceof TalakWeb3Error) {
      return c.json({ error: err.message, code: err.code }, err.status as any);
    }
    return c.json({ error: 'Authentication failed' }, 401);
  }
});

const RefreshBody = z.object({ refreshToken: z.string().min(20) });

app.post('/auth/refresh', async (c) => {
  const start = Date.now();
  const log = getLogger(c);
  const m = c.get('metrics');
  const bodyResult = RefreshBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: 'Invalid request body' }, 400);

  try {
    const { accessToken, refreshToken } = await auth.refresh(bodyResult.data.refreshToken);
    const addrMatch = accessToken.split('.')[1];
    const address = addrMatch ? (() => {
      try { return JSON.parse(Buffer.from(addrMatch, 'base64url').toString()).address as string; }
      catch { return 'unknown'; }
    })() : 'unknown';
    log.info({ address }, 'refresh token rotated');
    m.increment('auth.refresh.success', { address });
    m.timing('auth.refresh.duration', Date.now() - start);
    return c.json({ accessToken, refreshToken });
  } catch (err) {
    log.warn({ err }, 'refresh failed');
    m.increment('auth.refresh.failure');
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }
});

app.post('/auth/logout', async (c) => {
  const log = getLogger(c);
  const bodyResult = RefreshBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: 'Invalid request body' }, 400);

  const authHeader = c.req.header('authorization') ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  try {
    await auth.revokeSession(accessToken, bodyResult.data.refreshToken);
    log.info({}, 'logout: session revoked');
    return c.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'storage failure during logout');
    return c.json({ error: 'Service Unavailable' }, 503);
  }
});

app.get('/auth/verify', async (c) => {
  const authHeader = c.req.header('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!token) return c.json({ ok: false }, 401);

  try {
    const payload = await auth.verifySession(token);
    return c.json({ ok: true, payload });
  } catch {
    return c.json({ ok: false }, 401);
  }
});

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const port = Number(process.env['PORT'] ?? 8787);
  serve({ fetch: app.fetch, port });
  logger.info(`[hono-backend] listening on http://localhost:${port}`);
}

export default app;
