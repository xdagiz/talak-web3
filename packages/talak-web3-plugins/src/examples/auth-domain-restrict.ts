import type { TalakWeb3Plugin, TalakWeb3Context, MiddlewareHandler } from '@talak-web3/types';

/**
 * [SECURITY] Auth-Domain-Restrict Plugin
 * 
 * Demonstrates how to inject middleware into the request chain to 
 * enforce additional security invariants beyond the core CORS logic.
 */
export const domainRestrictPlugin = (options: { allowedDomains: string[] }): TalakWeb3Plugin => {
  return {
    name: 'auth-domain-restrict',
    version: '1.0.0',

    async setup(ctx: TalakWeb3Context) {
      ctx.logger.info(`[SECURITY] ${this.name} active. Enforcing: ${options.allowedDomains.join(', ')}`);

      const restrictMiddleware: MiddlewareHandler = async (req: any, next: () => Promise<any>, context: TalakWeb3Context) => {
        const origin = (req.headers && (req.headers.origin || req.headers.Origin)) as string | undefined;

        if (!origin) {
          context.logger.warn(`[WARNING] Request missing Origin header. Rejecting.`);
          throw new Error('AUTH_DOMAIN_MISSING_ORIGIN');
        }

        const isAllowed = options.allowedDomains.some(domain => origin.includes(domain));

        if (!isAllowed) {
          context.logger.error(`[SECURITY] Unauthorized domain origin: ${origin}`);
          throw new Error('AUTH_DOMAIN_RESTRICTED');
        }

        return next();
      };

      // Inject into the start of the request chain
      ctx.requestChain.use(restrictMiddleware);
    }
  };
};
