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
        httpOnly: true, // Should be httpOnly for better security; client reads from response header or it's handled via double-submit if needed, but per requirements we set httpOnly: true
        sameSite: 'None', // Required for cross-subdomain/cross-site
        domain: '.talak.io', // Enable cross-subdomain access
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
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
      
      // Additional security: rotating token on every mutating request (optional but recommended)
      // For simplicity, we'll keep the current one but ensure it's validated correctly.
    }

    await next();
  };
}
