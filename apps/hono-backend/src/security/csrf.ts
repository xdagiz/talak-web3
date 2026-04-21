import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { TalakWeb3Error } from '@talak-web3/errors';
import { randomBytes } from 'node:crypto';

export function csrfProtection(): MiddlewareHandler {
  return async (c, next) => {
    let token = getCookie(c, 'csrf_token');

    if (!token) {
      token = randomBytes(16).toString('hex');
      setCookie(c, 'csrf_token', token, {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'None',
        domain: '.talak.io',
        maxAge: 60 * 60 * 24 * 7,
      });

      c.header('X-CSRF-Token-Initial', token);
    }

    const method = c.req.method;
    const path = c.req.path;
    const isMutating = ['POST', 'PUT', 'DELETE'].includes(method);
    const isSafePath = path.endsWith('/auth/nonce');

    if (isMutating && !isSafePath) {
      const headerToken = c.req.header('x-csrf-token');

      if (!headerToken || headerToken !== token) {
        throw new TalakWeb3Error('CSRF token mismatch or missing. Double-submit validation failed.', {
          code: 'CSRF_INVALID',
          status: 403,
        });
      }

    }

    await next();
  };
}
