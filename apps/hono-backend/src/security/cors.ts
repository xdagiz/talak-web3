import type { Context, MiddlewareHandler } from 'hono';

export type CorsPolicy = {
  allowedOrigins: readonly string[];
  allowedMethods?: readonly string[];
  allowedHeaders?: readonly string[];
  maxAgeSeconds?: number;
};

function setCorsHeaders(c: Context, origin: string, policy: CorsPolicy): void {
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Vary', 'Origin');
  c.header('Access-Control-Allow-Methods', (policy.allowedMethods ?? ['GET', 'POST', 'OPTIONS']).join(', '));
  c.header('Access-Control-Allow-Headers', (policy.allowedHeaders ?? ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token']).join(', '));
  c.header('Access-Control-Max-Age', String(policy.maxAgeSeconds ?? 600));
  // Enable credentials for cross-subdomain cookie auth
  c.header('Access-Control-Allow-Credentials', 'true');
}

export function strictCors(policy: CorsPolicy): MiddlewareHandler {
  const allowed = new Set(policy.allowedOrigins);

  return async (c, next) => {
    const origin = c.req.header('origin');

    // Non-browser / same-origin requests: no Origin header, allow through.
    if (!origin) {
      await next();
      return;
    }

    // Strict exact-match validation only - no domain inference
    if (!allowed.has(origin)) {
      return c.json({ error: 'Origin not allowed' }, 403);
    }

    // Preflight
    if (c.req.method === 'OPTIONS') {
      setCorsHeaders(c, origin, policy);
      return c.body(null, 204);
    }

    setCorsHeaders(c, origin, policy);
    await next();
  };
}

