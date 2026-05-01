import type { Context } from "hono";
import type { RedisClientType } from "redis";

export interface AuditLoggerConfig {
  storage: {
    type: "redis";
    redis: RedisClientType;
  };
}

export class ImmutableAuditLogger {
  constructor(private config: AuditLoggerConfig) {}

  createMiddleware() {
    return async (_c: Context, next: () => Promise<void>) => {
      await next();
    };
  }

  getAnchoringStatus() {
    return { enabled: false };
  }

  getMode() {
    return "async";
  }
}
