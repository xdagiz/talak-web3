import type { Context } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';

export function createJwksEndpoint(auth: any) {
  return async (c: Context) => {
    try {

      const jwks = await auth.jwtManager.getJwks();

      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      c.header('Content-Type', 'application/json');
      c.header('X-Content-Type-Options', 'nosniff');

      return c.json(jwks);
    } catch (err) {
      if (err instanceof TalakWeb3Error) {
        return c.json({ error: err.message, code: err.code }, err.status as any);
      }
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  };
}
