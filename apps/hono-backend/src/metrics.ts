import type { MiddlewareHandler } from "hono";

export interface MetricsClient {
  increment(name: string, tags?: Record<string, string>): void;
  timing(name: string, duration: number, tags?: Record<string, string>): void;
}

class ConsoleMetricsClient implements MetricsClient {
  increment(name: string, tags?: Record<string, string>): void {
    console.debug(`[metrics] increment ${name}`, tags);
  }
  timing(name: string, duration: number, tags?: Record<string, string>): void {
    console.debug(`[metrics] timing ${name} ${duration}ms`, tags);
  }
}

export const metrics = new ConsoleMetricsClient();

export function metricsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    c.set("metrics", metrics);
    await next();
  };
}

declare module "hono" {
  interface ContextVariableMap {
    metrics: MetricsClient;
    talak: import("@talak-web3/types").TalakWeb3Instance;
    session: { address?: string } | undefined;
  }
}
