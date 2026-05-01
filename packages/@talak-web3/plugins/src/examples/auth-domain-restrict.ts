import type { TalakWeb3Plugin, TalakWeb3Context, MiddlewareHandler } from "@talak-web3/types";

export const domainRestrictPlugin = (options: { allowedDomains: string[] }): TalakWeb3Plugin => {
  return {
    name: "auth-domain-restrict",
    version: "1.0.0",

    async setup(ctx: TalakWeb3Context) {
      ctx.logger.info(
        `[SECURITY] ${this.name} active. Enforcing: ${options.allowedDomains.join(", ")}`,
      );

      const restrictMiddleware: MiddlewareHandler = async (
        req: unknown,
        next: () => Promise<unknown>,
        context: TalakWeb3Context,
      ) => {
        if (req && typeof req === "object" && "headers" in req && req.headers) {
          const headers = req.headers as Record<string, string | undefined>;
          const origin = headers.origin || headers.Origin;
          if (!origin) {
            context.logger.warn(`[WARNING] Request missing Origin header. Rejecting.`);
            throw new Error("AUTH_DOMAIN_MISSING_ORIGIN");
          }

          const isAllowed = options.allowedDomains.some((domain) => origin.includes(domain));

          if (!isAllowed) {
            context.logger.error(`[SECURITY] Unauthorized domain origin: ${origin}`);
            throw new Error("AUTH_DOMAIN_RESTRICTED");
          }

          return next();
        } else {
          context.logger.warn(`[WARNING] Invalid request object. Rejecting.`);
          throw new Error("AUTH_DOMAIN_INVALID_REQUEST");
        }
      };

      ctx.requestChain.use(restrictMiddleware);
    },
  };
};
