import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { TalakWeb3Error } from '@talak-web3/errors';
import { talakWeb3 } from '@talak-web3/core';
import type { TalakWeb3Instance } from '@talak-web3/types';
import { createClient } from 'redis';
import { strictCors } from './security/cors.js';
import { RedisAuthStorage } from './security/storage.js';
import { TalakWeb3Auth } from '@talak-web3/auth';
import { logger, requestLogger, getLogger } from './logger.js';
import { createHardenedRedisClient, RedisSecurityAuditor, RedisDatabaseSelector } from './security/redis-hardening.js';
import { secureHeaders } from 'hono/secure-headers';
import { csrfProtection } from './security/csrf.js';
import { authMiddleware } from './security/authMiddleware.js';
import { PriorityRequestQueue, RequestPriority } from './security/priority-queue.js';
import { PolicyEngine } from './security/policy-engine.js';
import { ImmutableAuditLogger } from './security/audit-logger.js';
import { validateEnv } from './security/env.js';
import { AdaptiveRateLimiter, DEFAULT_ADAPTIVE_CONFIG } from './security/adaptive-rate-limit.js';
import { PrometheusMetrics, createMetricsMiddleware } from './security/prometheus-metrics.js';
import { ElasticsearchSink, SplunkSink, HttpSiemSink } from './security/security-events.js';
import { IncidentResponseManager } from './security/incident-response.js';
import { createJwksEndpoint } from './security/jwks-endpoint.js';

try {
  validateEnv();
} catch (err) {
  console.error('[CRITICAL] Startup failed: Environment validation error');
  console.error(err);
  process.exit(1);
}

const app = new Hono();

const redisUrl = process.env['REDIS_URL']!;
const redisConfig = createHardenedRedisClient(redisUrl, {
  auth: {
    enabled: process.env['REDIS_AUTH_ENABLED'] !== 'false',
    password: process.env['REDIS_PASSWORD'],
  },
  tls: {
    enabled: process.env['REDIS_TLS_ENABLED'] !== 'false',
    certPath: process.env['REDIS_TLS_CERT_PATH'],
    keyPath: process.env['REDIS_TLS_KEY_PATH'],
    caPath: process.env['REDIS_TLS_CA_PATH'],
  },
  connectionLimits: {
    maxConnections: parseInt(process.env['REDIS_MAX_CONNECTIONS'] ?? '100'),
    maxRetriesPerRequest: parseInt(process.env['REDIS_MAX_RETRIES'] ?? '3'),
    retryDelayOnFailover: parseInt(process.env['REDIS_RETRY_DELAY'] ?? '100'),
    enableOfflineQueue: false,
  },
  databases: {
    nonceDb: parseInt(process.env['REDIS_DB_NONCE'] ?? '0'),
    sessionDb: parseInt(process.env['REDIS_DB_SESSION'] ?? '1'),
    rateLimitDb: parseInt(process.env['REDIS_DB_RATELIMIT'] ?? '2'),
    auditDb: parseInt(process.env['REDIS_DB_AUDIT'] ?? '3'),
  },
});

const redis = createClient(redisConfig);

const redisAuthUrl = process.env['REDIS_AUTH_URL'] ?? redisUrl;
const redisRateLimitUrl = process.env['REDIS_RATELIMIT_URL'] ?? redisUrl;
const redisAuditUrl = process.env['REDIS_AUDIT_URL'] ?? redisUrl;

const redisAuth = createClient(createHardenedRedisClient(redisAuthUrl, redisConfig));
const redisRateLimit = createClient(createHardenedRedisClient(redisRateLimitUrl, redisConfig));
const redisAudit = createClient(createHardenedRedisClient(redisAuditUrl, redisConfig));

[redis, redisAuth, redisRateLimit, redisAudit].forEach((client, idx) => {
  client.on('error', (err) => {
    logger.error({ err, clientIdx: idx }, 'redis cluster error');
    process.exit(1);
  });
});

try {
  await Promise.all([
    redis.connect(),
    redisAuth.connect(),
    redisRateLimit.connect(),
    redisAudit.connect(),
  ]);
  console.log('[BOOTSTRAP] All Redis clusters connected: OK');

  const auditor = new RedisSecurityAuditor(redis);
  const audit = await auditor.auditSecurity();

  if (audit.status === 'critical') {
    console.error('[CRITICAL] Redis security issues detected:', audit.issues);
    console.error('[CRITICAL] Recommendations:', audit.recommendations);
    process.exit(1);
  } else if (audit.status === 'warning') {
    console.warn('[WARNING] Redis security warnings:', audit.issues);
    console.warn('[WARNING] Recommendations:', audit.recommendations);
  }

  if (process.env['NODE_ENV'] === 'production') {
    await Promise.all([
      auditor.applySecurityHardening(),
      new RedisSecurityAuditor(redisAuth).applySecurityHardening(),
      new RedisSecurityAuditor(redisRateLimit).applySecurityHardening(),
      new RedisSecurityAuditor(redisAudit).applySecurityHardening(),
    ]);
  }

} catch (err) {
  console.error('[CRITICAL] Could not connect to Redis clusters at startup. Exiting.');
  process.exit(1);
}

const metrics = new PrometheusMetrics();
const incidentResponse = new IncidentResponseManager();
const rateLimiter = new AdaptiveRateLimiter(redisRateLimit as any, DEFAULT_ADAPTIVE_CONFIG);

async function broadcastSecurityEvent(event: Omit<any, 'id' | 'timestamp' | 'metadata'> & { ip?: string, wallet?: string, sessionId?: string }) {
  const fullEvent = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...event,
    metadata: {
      ip: event.ip,
      wallet: event.wallet,
      sessionId: event.sessionId,
      environment: process.env['NODE_ENV'] ?? 'development',
    }
  };

  logger.info({ securityEvent: fullEvent }, 'Security event generated');

  metrics.recordSecurityEvent(fullEvent.type, fullEvent.severity);

  Promise.allSettled(securityEventSinks.map(sink => sink.send(fullEvent))).catch(err => {
    logger.error({ err }, 'Failed to forward security events to some sinks');
  });

  if (fullEvent.severity === 'critical') {
    await incidentResponse.createIncident({
      type: 'security_misconfiguration',
      severity: 'critical',
      description: `Automated security event trigger: ${fullEvent.type}`,
      affectedSystems: ['hono-backend'],
      containmentActions: [],
      recoveryActions: [],
      postMortemRequired: true,
      metadata: fullEvent.metadata
    });
  }
}

const securityEventSinks = [];
if (process.env['ELASTICSEARCH_URL']) {
  securityEventSinks.push(new ElasticsearchSink({
    url: process.env['ELASTICSEARCH_URL']!,
    index: process.env['ELASTICSEARCH_INDEX'] ?? 'security-events',
    apiKey: process.env['ELASTICSEARCH_API_KEY'],
  }));
}
if (process.env['SPLUNK_URL']) {
  securityEventSinks.push(new SplunkSink({
    url: process.env['SPLUNK_URL']!,
    token: process.env['SPLUNK_TOKEN']!,
  }));
}

const storage = new RedisAuthStorage(redisAuth as any, true);

const keyProviderType = (process.env['KEY_PROVIDER_TYPE'] ?? 'environment') as any;
const keyProviderOptions = {
  keyId: process.env['AWS_KMS_KEY_ID'],
  region: process.env['AWS_REGION'],
  vaultUrl: process.env['VAULT_URL'],
  secretPath: process.env['VAULT_SECRET_PATH'],
  token: process.env['VAULT_TOKEN'],
};

const auth = new TalakWeb3Auth({
  expectedDomain: process.env['SIWE_DOMAIN']!,
  nonceStore: storage.nonceStore,
  refreshStore: storage.refreshStore,
  revocationStore: storage.revocationStore,
  keyProviderType,
  keyProviderOptions,
  keyRotationConfig: {
    maxKeys: parseInt(process.env['JWT_MAX_KEYS'] ?? '5'),
    gracePeriodMs: parseInt(process.env['JWT_GRACE_PERIOD_MS'] ?? '604800000'),
    rotationIntervalMs: parseInt(process.env['JWT_ROTATION_INTERVAL_MS'] ?? '2592000000'),
  }
});

const configuredChains = (process.env['SUPPORTED_CHAINS'] ?? '1')
  .split(',')
  .map(id => parseInt(id.trim(), 10))
  .filter(id => !isNaN(id));

const talak = talakWeb3({
  auth,
  chains: configuredChains.map(id => ({
    id,
    rpcUrls: (process.env[`RPC_URL_${id}`] ?? '').split(',').map(s => s.trim()).filter(Boolean),
  }))
});

const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  logger.warn('ALLOWED_ORIGINS is not set — all cross-origin requests will be rejected');
}

app.use('*', async (c, next) => {
  const ip = getIp(c);
  const log = getLogger(c);
  const path = c.req.path;

  let type: any = 'global';
  if (path.includes('/auth')) type = 'auth';
  if (path.includes('/rpc')) type = 'rpc';
  if (path.includes('/nonce')) type = 'nonce';

  const result = await rateLimiter.checkRateLimit({
    type,
    ip,
    userAgent: c.req.header('User-Agent'),
  });

  if (!result.allowed) {
    log.warn({ ip, path, penalties: result.penalties }, 'adaptive rate limit hit');
    metrics.recordRateLimitHit(type, result.penalties?.[0] ?? 'unknown');

    if (result.riskScore && result.riskScore > 0.5) {
      await broadcastSecurityEvent({
        type: 'rate_limit_hit',
        severity: result.riskScore > 0.8 ? 'high' : 'medium',
        source: 'middleware/ratelimit',
        details: { path, penalties: result.penalties, riskScore: result.riskScore },
        ip
      });
    }

    return c.json({
      error: 'Too many requests',
      retryAfter: result.resetTime,
      riskScore: result.riskScore
    }, 429);
  }

  await next();
});

app.use('*', async (c, next) => {
  c.set('talak', talak);
  await next();
});

app.use('*', requestLogger());

app.use('*', secureHeaders());

app.use('*', createMetricsMiddleware(metrics));

app.use('*', csrfProtection());

app.use('*', strictCors({ allowedOrigins }));

const priorityQueue = new PriorityRequestQueue({
  concurrency: {
    [RequestPriority.CRITICAL]: 200,
    [RequestPriority.HIGH]: 100,
    [RequestPriority.NORMAL]: 50,
    [RequestPriority.LOW]: 20,
    [RequestPriority.BACKGROUND]: 10
  },
  maxQueueSize: 500,
  timeout: 30000
});

app.use('*', priorityQueue.createMiddleware());

const policyEngine = new PolicyEngine();
app.use('*', policyEngine.createMiddleware());

const auditLogger = new ImmutableAuditLogger({
  storage: {
    type: 'redis',
    redis: redisAudit
  }
});
app.use('*', auditLogger.createMiddleware());

app.use('*', async (c, next) => {
  const len = c.req.header('content-length');
  if (len && Number(len) > 1_000_000) {
    return c.json({ error: 'Request body too large' }, 413);
  }
  await next();
});

app.onError((err, c) => {
  const log = getLogger(c);
  if (err instanceof TalakWeb3Error) {
    return c.json({ error: err.message, code: err.code }, err.status as any);
  }
  log.error({ err }, 'unhandled error');
  return c.json({ error: 'Internal Server Error' }, 500);
});

import type { Context } from 'hono';

function getIp(c: Context): string {
  return (c.req.header('x-forwarded-for') ?? c.req.raw.headers.get('cf-connecting-ip') ?? 'unknown').split(',')[0]?.trim() ?? 'unknown';
}

app.get('/health', (c) => c.json({ ok: true, now: Date.now() }));

app.get('/.well-known/jwks.json', createJwksEndpoint(auth));

app.get('/security/status', (c) => {
  const anchoring = auditLogger.getAnchoringStatus();
  const mode = auditLogger.getMode();
  return c.json({
    auth: {
      storage: redisUrl ? 'redis' : 'memory',
    },
    audit: {
      mode,
      anchoring,
    },
    rateLimit: {
      backend: redisUrl ? 'redis' : 'memory',
    },
  });
});

app.get('/metrics', async (c) => {
  const data = await metrics.getMetrics();
  return c.text(data, 200, { 'Content-Type': 'text/plain; version=0.0.4' });
});

const NonceBody = z.object({ address: z.string().regex(/^0x[a-fA-F0-9]{40}$/) });

app.post('/auth/nonce', async (c) => {
  const log = getLogger(c);
  const ip = getIp(c);

  const bodyResult = NonceBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: 'Invalid address' }, 400);

  const address = bodyResult.data.address;

  try {
    const ua = c.req.header('user-agent') ?? undefined;

    const nonce = await auth.createNonce(address, { ip, ua });
    log.info({ address, ip }, 'nonce created');

    metrics.recordSecurityEvent('nonce_created', 'low');

    return c.json({ nonce });
  } catch (err) {
    log.error({ err, address, ip }, 'failed to create nonce');

    await broadcastSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      source: 'auth/nonce',
      details: { address, error: (err as any).message },
      ip
    });

    return c.json({ error: 'Service Unavailable' }, 503);
  }
});

const RpcBody = z.object({
  jsonrpc: z.literal('2.0').optional(),
  id: z.number().optional(),
  method: z.string().min(1),
  params: z.array(z.unknown()).optional(),
});

app.post('/rpc/:chainId', authMiddleware(auth), async (c) => {
  const start = Date.now();
  const log = getLogger(c);
  const { chainId: chainIdStr } = c.req.param();
  const chainId = parseInt(chainIdStr, 10);

  if (!configuredChains.includes(chainId)) {
    return c.json({ error: `Chain ID ${chainId} is not supported` }, 400);
  }

  const authHeader = c.req.header('Authorization') ?? '';
  const token = authHeader.split(' ')[1] ?? 'anonymous';
  const ip = getIp(c);
  const session = c.get('session');
  const wallet = session?.address;

  try {
    const result = await rateLimiter.checkRateLimit({
      type: 'rpc',
      ip,
      wallet,
    });

    if (!result.allowed) {
      log.warn({ chainId, wallet, ip }, 'RPC rate limit hit');
      metrics.recordRateLimitHit('rpc', result.penalties?.[0] ?? 'quota_exceeded');
      return c.json({ error: 'RPC quota exceeded', riskScore: result.riskScore }, 429);
    }
  } catch (err) {
    log.error({ err }, 'RPC rate limit storage failure');
  }

  const bodyResult = RpcBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: 'Invalid JSON-RPC request' }, 400);

  try {
    const instance = c.get('talak') as TalakWeb3Instance;
    const ctx: TalakWeb3Context = instance.context;

    const result = await ctx.rpc.request(bodyResult.data.method, bodyResult.data.params ?? [], {
      chainId,
    });

    metrics.recordRpcRequest(String(chainId), bodyResult.data.method, 'success', Date.now() - start);
    return c.json({ jsonrpc: '2.0', id: bodyResult.data.id ?? 1, result });
  } catch (err) {
    log.error({ err, method: bodyResult.data.method, chainId }, 'RPC request failed');
    metrics.recordRpcError(String(chainId), bodyResult.data.method, (err as any).code || 'unknown');

    if (err instanceof TalakWeb3Error) {
      return c.json({ error: err.message, code: err.code }, err.status as any);
    }
    return c.json({ error: 'Upstream RPC error or timeout', code: 'RPC_ERROR' }, 502);
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

  const bodyResult = LoginBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) {
    return c.json({ error: 'Invalid request body' }, 400);
  }
  const body = bodyResult.data;

  const addrMatch = body.message.match(/\n(0x[a-fA-F0-9]{40})\n/);
  const address = addrMatch?.[1]?.toLowerCase();

  try {
    const result = await auth.loginWithSiwe(body.message, body.signature);

    metrics.recordAuthSuccess('siwe', Date.now() - start);

    return c.json(result);
  } catch (err) {
    log.error({ err, address, ip }, 'login failed');

    await rateLimiter.applyAuthFailurePenalty(ip, address);

    await broadcastSecurityEvent({
      type: 'auth_failure',
      severity: 'medium',
      source: 'auth/login',
      details: { address, error: (err as any).message },
      ip,
      wallet: address
    });

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
  const bodyResult = RefreshBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: 'Invalid request body' }, 400);

  try {
    const result = await auth.refresh(bodyResult.data.refreshToken);

    metrics.recordAuthSuccess('refresh', Date.now() - start);

    return c.json(result);
  } catch (err) {
    log.warn({ err }, 'refresh failed');
    metrics.recordAuthFailure('refresh', (err as any).code || 'unknown', Date.now() - start);
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }
});

app.post('/auth/logout', async (c) => {
  const log = getLogger(c);
  const bodyResult = RefreshBody.safeParse(await c.req.json().catch(() => ({})));
  if (!bodyResult.success) return c.json({ error: 'Invalid request body' }, 400);

  const authHeader = c.req.header('Authorization') ?? c.req.header('authorization') ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  try {
    await auth.revokeSession(accessToken, bodyResult.data.refreshToken);
    log.info({}, 'logout: session revoked');

    const ip = getIp(c);
    await broadcastSecurityEvent({
      type: 'auth_success',
      severity: 'low',
      source: 'auth/logout',
      details: { action: 'logout' },
      ip
    });

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

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const port = Number(process.env['PORT'] ?? 8787);
  serve({ fetch: app.fetch, port });
  logger.info(`[hono-backend] listening on http://localhost:${port}`);
}

export default app;
