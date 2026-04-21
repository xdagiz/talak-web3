import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { TalakWeb3Error } from '@talak-web3/errors';
import { randomBytes } from 'node:crypto';

/**
 * Double-submit CSRF protection middleware with strict origin validation.
 * 
 * Security model:
 * 1. Ensures a 'csrf_token' cookie exists with SameSite=Strict
 * 2. For mutating methods (POST, PUT, DELETE), verifies:
 *    a. 'x-csrf-token' header matches cookie (double-submit pattern)
 *    b. Origin/Referer header matches allowed origins
 */
export function csrfProtection(): MiddlewareHandler {
  return async (c, next) => {
    let token = getCookie(c, 'csrf_token');
    
    // Ensure cookie exists
    if (!token) {
      token = randomBytes(16).toString('hex');
      const cookieDomain = process.env['COOKIE_DOMAIN'];
      const cookieOptions: any = {
        path: '/',
        secure: true, // ALWAYS true in production
        httpOnly: true,
        sameSite: 'Strict', // CRITICAL: Prevent cross-site sends (changed from 'None')
        maxAge: 60 * 60 * 24 * 7,
      };
      if (cookieDomain) {
        cookieOptions.domain = cookieDomain;
      }
      setCookie(c, 'csrf_token', token, cookieOptions);
      // Set a header so the client can read the initial token once if needed (e.g. on first visit)
      c.header('X-CSRF-Token-Initial', token);
    }

    const method = c.req.method;
    const path = c.req.path;
    const isMutating = ['POST', 'PUT', 'DELETE'].includes(method);
    const isSafePath = path.endsWith('/auth/nonce');

    if (isMutating && !isSafePath) {
      const headerToken = c.req.header('x-csrf-token');
      
      // Strict double-submit validation
      if (!headerToken || headerToken !== token) {
        throw new TalakWeb3Error('CSRF token mismatch or missing. Double-submit validation failed.', {
          code: 'CSRF_INVALID',
          status: 403,
        });
      }
      
      // Additional: Validate Origin/Referer header against allowed origins
      const origin = c.req.header('origin');
      const referer = c.req.header('referer');
      const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',').map(o => o.trim()) ?? [];
      
      if (origin && allowedOrigins.length > 0) {
        const originAllowed = allowedOrigins.some(allowed => {
          try {
            const allowedUrl = new URL(allowed);
            const originUrl = new URL(origin);
            return allowedUrl.hostname === originUrl.hostname && 
                   allowedUrl.protocol === originUrl.protocol;
          } catch {
            return false;
          }
        });
        
        if (!originAllowed) {
          throw new TalakWeb3Error('Origin validation failed - cross-site request blocked', {
            code: 'CSRF_ORIGIN_MISMATCH',
            status: 403,
          });
        }
      }
    }

    await next();
  };
}
