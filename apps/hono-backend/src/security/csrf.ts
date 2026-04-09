import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { TalakWeb3Error } from '@talak-web3/errors';
import { randomBytes } from 'node:crypto';

/**
 * Double-submit CSRF protection middleware.
 * 
 * 1. Ensures a 'csrf_token' cookie exists. If not, sets one.
 * 2. For mutating methods (POST, PUT, DELETE), verifies 'x-csrf-token' header matches cookie.
 */
export function csrfProtection(): MiddlewareHandler {
  return async (c, next) => {
    let token = getCookie(c, 'csrf_token');
    
    // Ensure cookie exists
    if (!token) {
      token = randomBytes(16).toString('hex');
      setCookie(c, 'csrf_token', token, {
        path: '/',
        secure: true,
        httpOnly: false, // Must be readable by client JS to send in header
        sameSite: 'Strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    const method = c.req.method;
    const path = c.req.path;
    const isMutating = ['POST', 'PUT', 'DELETE'].includes(method);
    const isSafePath = path.endsWith('/auth/nonce');

    if (isMutating && !isSafePath) {
      const headerToken = c.req.header('x-csrf-token');
      
      if (!headerToken || headerToken !== token) {
        throw new TalakWeb3Error('CSRF token mismatch or missing', {
          code: 'CSRF_INVALID',
          status: 403,
        });
      }
    }

    await next();
  };
}
