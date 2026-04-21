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

// ---------------------------------------------------------------------------
// 1. BOOTSTRAP: Strict Environment Validation (Fail-Fast)
// ---------------------------------------------------------------------------
try {
  validateEnv();
} catch (err) {
  console.error('[CRITICAL] Startup failed: Environment validation error');
  console.error(err);
  process.exit(1);
}

const app = new Hono();

// ---------------------------------------------------------------------------
// 2. BOOTSTRAP: Mandatory Infrastructure (Hardened Redis)
// ---------------------------------------------------------------------------
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

// Separate clusters for isolation (blast radius containment)
const redisAuthUrl = process.env['REDIS_AUTH_URL'] ?? redisUrl;
const redisRateLimitUrl = process.env['REDIS_RATELIMIT_URL'] ?? redisUrl;
const redisAuditUrl = process.env['REDIS_AUDIT_URL'] ?? redisUrl;

const redisAuth = createClient(createHardenedRedisClient(redisAuthUrl, redisConfig));
const redisRateLimit = createClient(createHardenedRedisClient(redisRateLimitUrl, redisConfig));
const redisAudit = createClient(createHardenedRedisClient(redisAuditUrl, redisConfig));

// Error handling for all clusters
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
  
  // Run Redis security audit on the primary cluster
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
  
  // Apply security hardening in production to all clusters
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

// ---------------------------------------------------------------------------
// 2.5 BOOTSTRAP: Security Infrastructure (Intelligence, Metrics, SIEM)
// ---------------------------------------------------------------------------
const metrics = new PrometheusMetrics();
const incidentResponse = new IncidentResponseManager();
const rateLimiter = new AdaptiveRateLimiter(redisRateLimit as any, DEFAULT_ADAPTIVE_CONFIG);

// Security Event Pipeline: Helper to broadcast events to all sinks
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

  // 1. Log locally
  logger.info({ securityEvent: fullEvent }, 'Security event generated');

  // 2. Update metrics
  metrics.recordSecurityEvent(fullEvent.type, fullEvent.severity);

  // 3. Forward to SIEM sinks (fire and forget)
  Promise.allSettled(securityEventSinks.map(sink => sink.send(fullEvent))).catch(err => {
    logger.error({ err }, 'Failed to forward security events to some sinks');
  });

  // 4. Trigger incident response if critical
  if (fullEvent.severity === 'critical') {
    await incidentResponse.createIncident({
      type: 'security_misconfiguration', // Default, should be mapped better
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

// Initialize SIEM pipeline
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

// ---------------------------------------------------------------------------
// 3. BOOTSTRAP: Storage & Auth (Strict Constructor)
// ---------------------------------------------------------------------------
const storage = new RedisAuthStorage(redisAuth as any, true);

// Configure Key Provider based on environment
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
    gracePeriodMs: parseInt(process.env['JWT_GRACE_PERIOD_MS'] ?? '604800000'), // 7 days
    rotationIntervalMs: parseInt(process.env['JWT_ROTATION_INTERVAL_MS'] ?? '2592000000'), // 30 days
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

// ---------------------------------------------------------------------------
// Middleware: Security, Logging, Parsing
// ---------------------------------------------------------------------------

// Global rate limiting with Intelligence
app.use('*', async (c, next) => {
  const ip = getIp(c);
  const log = getLogger(c);
  const path = c.req.path;
  
  // Determine request type for rate limiting
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
    
    // Broadcast security event on rate limit hit if risk score is high
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

// Inject talak instance into context
app.use('*', async (c, next) => {
  c.set('talak', talak);
  await next();
});

// Inject structured logger with unique x-request-id
app.use('*', requestLogger());

// Standard security headers with HSTS for transport security
app.use('*', secureHeaders({
  // HTTP Strict Transport Security (HSTS)
  // Enforces HTTPS for 1 year, includes subdomains, allows preload
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  // Prevent MIME type sniffing
  xContentTypeOptions: 'nosniff',
  // Prevent clickjacking
  xFrameOptions: 'DENY',
  // XSS protection
  xXssProtection: '0', // Modern browsers use CSP instead
  // Remove server header
  removeServer: true,
  // Content Security Policy (restrictive defaults)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));

// Metrics collection
app.use('*', createMetricsMiddleware(metrics));

// Double-submit CSRF enforcement (sets cookie on every request, verifies header on POST/PUT/DELETE)
app.use('*', csrfProtection());

// Strict exact-match CORS (explicitly disables credentials)
app.use('*', strictCors({ allowedOrigins }));

// Priority-based request queue
const priorityQueue = new PriorityRequestQueue({
  concurrency: {
    [RequestPriority.CRITICAL]: 200,    // High concurrency for auth
    [RequestPriority.HIGH]: 100,        // RPC calls
    [RequestPriority.NORMAL]: 50,       // Regular API
    [RequestPriority.LOW]: 20,          // Background
    [RequestPriority.BACKGROUND]: 10     // Health checks
  },
  maxQueueSize: 500,
  timeout: 30000
});

app.use('*', priorityQueue.createMiddleware());

// Global security policy enforcement
const policyEngine = new PolicyEngine();
app.use('*', policyEngine.createMiddleware());

// Immutable audit logging
const auditLogger = new ImmutableAuditLogger({
  storage: {
    type: 'redis',
    redis: redisAudit
  }
});
app.use('*', auditLogger.createMiddleware());

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

// ---------------------------------------------------------------------------
// Trusted Proxy Configuration
// ---------------------------------------------------------------------------

/**
 * Trusted proxy IP ranges (Cloudflare + localhost)
 * In production, this should be loaded from environment variables
 */
const TRUSTED_PROXY_RANGES = process.env['TRUSTED_PROXY_RANGES']
  ? process.env['TRUSTED_PROXY_RANGES'].split(',')
  : [
      // Cloudflare IP ranges (subset - expand in production)
      '173.245.48.0/20',
      '103.21.244.0/22',
      '103.22.200.0/22',
      '104.16.0.0/13',
      '104.24.0.0/14',
      '131.0.72.0/22',
      '141.101.64.0/18',
      '162.158.0.0/15',
      '172.64.0.0/13',
      '173.245.48.0/20',
      '188.114.96.0/20',
      '190.93.240.0/20',
      '197.234.240.0/22',
      '198.41.128.0/17',
      // Localhost
      '127.0.0.1',
      '::1',
    ];

/**
 * Check if an IP address is within a CIDR range
 */
function isIpInRange(ip: string, range: string): boolean {
  if (ip === range) return true; // Exact match (for single IPs)
  
  if (!range.includes('/')) {
    return ip === range;
  }
  
  const [baseIp, maskBits] = range.split('/');
  const mask = parseInt(maskBits, 10);
  
  // Simple IPv4 CIDR check
  if (ip.includes('.') && baseIp.includes('.')) {
    const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const baseNum = baseIp.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const maskNum = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
    
    return (ipNum & maskNum) === (baseNum & maskNum);
  }
  
  return false; // IPv6 not implemented for brevity
}

/**
 * Check if an IP is from a trusted proxy
 */
function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXY_RANGES.some(range => isIpInRange(ip, range));
}

/**
 * Normalize IP address by converting IPv6-mapped IPv4 addresses to IPv4
 * This prevents rate limiting bypass via IPv6 address rotation
 */
function normalizeIp(ip: string): string {
  // Convert ::ffff:1.2.3.4 to 1.2.3.4
  return ip.replace(/^::ffff:/, '');
}

/**
 * Extract client IP with strict trust boundary enforcement
 * 
 * Security model:
 * 1. Cloudflare sets cf-connecting-ip (trusted, set at edge)
 * 2. x-forwarded-for is ONLY trusted if request came from a known proxy IP
 * 3. Otherwise, use the socket remote address
 */
function getIp(c: Context): string {
  // Priority 1: Cloudflare header (most reliable when behind Cloudflare)
  const cfIp = c.req.header('cf-connecting-ip');
  if (cfIp && /^[0-9a-f.:]+$/.test(cfIp)) {
    return normalizeIp(cfIp);
  }
  
  // Priority 2: x-forwarded-for - ONLY trust if socket is a known proxy
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const socketAddr = (c.req.raw as any).socket?.remoteAddress;
    
    // Only trust forwarded header if request came from a trusted proxy
    if (socketAddr && isTrustedProxy(normalizeIp(socketAddr))) {
      // Take the first (leftmost) IP which should be the client IP
      const clientIp = forwarded.split(',')[0]?.trim() ?? 'unknown';
      return normalizeIp(clientIp);
    }
    
    // If not from trusted proxy, log warning
    if (socketAddr) {
      logger.warn({ socketAddr, forwarded }, 'x-forwarded-for received from untrusted source - ignoring');
    }
  }
  
  // Last resort: use socket remote address
  const socketAddr = (c.req.raw as any).socket?.remoteAddress;
  return socketAddr ? normalizeIp(socketAddr) : 'unknown';
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/health', (c) => c.json({ ok: true, now: Date.now() }));

// JWKS Endpoint for key discovery
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
    
    // Track nonce creation metric
    metrics.recordSecurityEvent('nonce_created', 'low');
    
    return c.json({ nonce });
  } catch (err) {
    log.error({ err, address, ip }, 'failed to create nonce');
    
    // Broadcast security event on failure
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
  
  // 1. Validate Chain ID
  if (!configuredChains.includes(chainId)) {
    return c.json({ error: `Chain ID ${chainId} is not supported` }, 400);
  }

  // 2. Per-session rate limiting (quota enforcement)
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
    
    // Circuit Breaker / Retry logic is partially handled by UnifiedRpc,
    // but we can add an extra layer or better error mapping here.
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

  // Extract address early for per-address rate limiting and logging
  const addrMatch = body.message.match(/\n(0x[a-fA-F0-9]{40})\n/);
  const address = addrMatch?.[1]?.toLowerCase();

  // CRITICAL: Validate SIWE domain against HTTP Origin/Referer header
  // This prevents cross-domain replay attacks where an attacker reuses
  // a valid SIWE message signed for a trusted domain on a malicious domain
  //
  // IMPORTANT: Domain extraction MUST match parseSiweMessage() logic exactly
  // to prevent bypass via inconsistent parsing
  const requestOrigin = c.req.header('origin') ?? c.req.header('referer');
  if (requestOrigin) {
    try {
      const originUrl = new URL(requestOrigin);
      
      // Extract domain using SAME logic as parseSiweMessage() in index.ts
      // First line: "<domain> wants you to sign in with your Ethereum account:"
      const firstLine = body.message.split('\n')[0]?.trim() ?? '';
      const domainMatch = firstLine.match(/^(.+?) wants you to sign in with your Ethereum account:/);
      const siweDomain = domainMatch?.[1]?.trim();
      
      if (!siweDomain) {
        log.warn({ ip, address }, 'Cannot extract SIWE domain from message');
        return c.json({ 
          error: 'Invalid SIWE message format', 
          code: 'AUTH_SIWE_PARSE_ERROR'
        }, 400);
      }
      
      if (originUrl.hostname !== siweDomain) {
        log.warn({ 
          origin: originUrl.hostname, 
          siweDomain, 
          ip,
          address 
        }, 'SIWE domain-origin mismatch detected');
        
        metrics.recordAuthFailure('siwe', 'domain_mismatch', Date.now() - start);
        
        return c.json({ 
          error: 'Domain-origin mismatch', 
          code: 'AUTH_DOMAIN_MISMATCH',
          message: 'The SIWE message domain does not match the request origin'
        }, 403);
      }
    } catch (err) {
      // If origin header is malformed, log but don't block (defensive)
      log.warn({ origin: requestOrigin }, 'Invalid origin header format');
    }
  }

  try {
    // Auth package handles NFC normalization internally
    // Extract context for token binding
    const userAgent = c.req.header('user-agent') ?? '';
    const context = { ip, userAgent };
    
    const result = await auth.loginWithSiwe(body.message, body.signature, context);
    
    // Success: record metrics
    metrics.recordAuthSuccess('siwe', Date.now() - start);
    
    return c.json(result);
  } catch (err) {
    log.error({ err, address, ip }, 'login failed');
    
    // Apply penalty for failed auth
    await rateLimiter.applyAuthFailurePenalty(ip, address);
    
    // Broadcast security event
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
    
    // Record metrics
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
    
    // Broadcast logout event
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

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const port = Number(process.env['PORT'] ?? 8787);
  serve({ fetch: app.fetch, port });
  logger.info(`[hono-backend] listening on http://localhost:${port}`);
}

export default app;
