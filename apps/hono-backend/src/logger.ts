import pino from 'pino';
import type { Context, MiddlewareHandler } from 'hono';

const baseLogger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
});

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  info(obj: object, message?: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  warn(obj: object, message?: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  error(obj: object, message?: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  debug(obj: object, message?: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

export const logger: Logger = baseLogger;

export function requestLogger(): MiddlewareHandler {
  return async (c: Context, next) => {
    const reqId = c.req.header('x-request-id') ?? crypto.randomUUID();
    c.set('requestId', reqId);
    c.header('x-request-id', reqId);

    const childLogger = baseLogger.child({ reqId });
    c.set('logger', childLogger);

    const start = Date.now();
    try {
      await next();
    } finally {

      childLogger.info({
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        ms: Date.now() - start,
      }, 'request');
    }
  };
}

export function getLogger(c?: Context): Logger {
  if (c) {
    const ctxLogger = c.get('logger');
    if (ctxLogger) return ctxLogger as Logger;
  }
  return logger;
}
