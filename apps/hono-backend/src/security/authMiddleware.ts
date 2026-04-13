import type { MiddlewareHandler } from 'hono';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { TalakWeb3Auth } from '@talak-web3/auth';

interface TieredAuthOptions {
  /** Enable stateless validation first with stateful fallback */
  enableTieredValidation?: boolean;
  
  /** Maximum age for stateless validation (ms) */
  statelessMaxAge?: number;
  
  /** Whether to check revocation list for all tokens */
  alwaysCheckRevocation?: boolean;
}

export function authMiddleware(auth: TalakWeb3Auth, options: TieredAuthOptions = {}): MiddlewareHandler {
  const {
    enableTieredValidation = true,
    statelessMaxAge = 5 * 60 * 1000, // 5 minutes
    alwaysCheckRevocation = false
  } = options;

  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new TalakWeb3Error('Missing or invalid Authorization header', {
        code: 'AUTH_REQUIRED',
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new TalakWeb3Error('Invalid token format', {
        code: 'AUTH_INVALID_TOKEN',
        status: 401,
      });
    }

    // Tier 1: Stateless validation (fast path)
    if (enableTieredValidation) {
      try {
        // Try stateless validation first
        const statelessValid = await auth.validateJwt(token, { 
          checkRevocation: alwaysCheckRevocation 
        });
        
        if (statelessValid) {
          // Check if token is recent enough for stateless validation
          const payload = auth.decodeJwt(token);
          if (payload && payload.iat) {
            const tokenAge = Date.now() - (payload.iat * 1000);
            if (tokenAge <= statelessMaxAge) {
              // Fast path: recent token, stateless validation succeeded
              await next();
              return;
            }
          }
        }
      } catch (error) {
        // Stateless validation failed, continue to tier 2
        console.debug('Stateless validation failed, falling back to stateful:', error);
      }
    }

    // Tier 2: Stateful validation (comprehensive check)
    try {
      const statefulValid = await auth.validateJwt(token, { 
        checkRevocation: true, // Always check revocation in stateful path
        forceRefresh: true     // Force fresh validation
      });
      
      if (!statefulValid) {
        throw new TalakWeb3Error('Invalid or expired session', {
          code: 'AUTH_SESSION_INVALID',
          status: 401,
        });
      }
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

    await next();
  };
}
