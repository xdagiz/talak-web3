import type { MiddlewareHandler } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { TalakWeb3Auth } from '@talak-web3/auth';

export function authMiddleware(auth: TalakWeb3Auth): MiddlewareHandler {
  return async (c, next) => {

    const protocol = c.req.header('X-Forwarded-Proto') || 'http';
    const isProduction = process.env['NODE_ENV'] === 'production';

    if (isProduction && protocol !== 'https') {
      throw new TalakWeb3Error('HTTPS required for authentication', {
        code: 'AUTH_INSECURE_TRANSPORT',
        status: 403,
      });
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new TalakWeb3Error('Missing or invalid Authorization header', {
        code: 'AUTH_REQUIRED',
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.length === 0) {
      throw new TalakWeb3Error('Invalid token format', {
        code: 'AUTH_INVALID_TOKEN',
        status: 401,
      });
    }

    try {

      const clientIp = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
                       c.req.header('X-Real-IP') ||
                       'unknown';
      const userAgent = c.req.header('User-Agent') || '';

      const session = await auth.verifySession(token, {
        ip: clientIp,
        userAgent,
      });

      c.set('session', session);

      await next();
    } catch (error) {
      if (error instanceof TalakWeb3Error) {
        throw error;
      }

      throw new TalakWeb3Error('Session validation failed', {
        code: 'AUTH_VALIDATION_ERROR',
        status: 401,
        cause: error,
      });
    }
  };
}

export function securityHeadersMiddleware(): MiddlewareHandler {
  return async (c, next) => {

    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    c.header('X-Content-Type-Options', 'nosniff');

    c.header('X-Frame-Options', 'DENY');

    c.header('X-XSS-Protection', '1; mode=block');

    await next();
  };
}
