import type { Context } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';

/**
 * JWKS endpoint for key distribution
 * Provides public keys for JWT verification with key rotation support
 */
export function createJwksEndpoint(auth: any) {
  return async (c: Context) => {
    try {
      // Get JWKS from the auth instance
      const jwks = await auth.jwtManager.getJwks();
      
      // Add cache headers for faster rotation propagation (60s instead of 300s)
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
