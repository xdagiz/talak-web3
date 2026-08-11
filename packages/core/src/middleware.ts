import { TalakWeb3Error, INTERNAL_ERROR_CODES } from "@talak-web3/errors";
import type { TalakWeb3Context, IMiddlewareChain, MiddlewareHandler } from "@talak-web3/types";

import { randomHex } from "./random.js";

const requestIdMap = new WeakMap<TalakWeb3Context, string>();

export function setRequestId(ctx: TalakWeb3Context, id: string): void {
  requestIdMap.set(ctx, id);
}

export function getRequestId(ctx: TalakWeb3Context): string | undefined {
  return requestIdMap.get(ctx);
}

export const requestIdMiddleware: MiddlewareHandler = async (req, next, ctx) => {
  const id = randomHex(16);
  setRequestId(ctx, id);
  return next();
};

export const errorHandlingMiddleware: MiddlewareHandler = async (req, next, ctx) => {
  try {
    return await next();
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const isPublicError = err instanceof TalakWeb3Error;
    const requestId = getRequestId(ctx) ?? "unknown";
    const isProduction =
      typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production";
    const shouldLogStack = !isProduction;

    ctx.logger.error(`[Request ${requestId}] Unhandled error:`, {
      message: error.message,
      ...(shouldLogStack ? { stack: error.stack } : {}),
      code: err instanceof TalakWeb3Error ? err.code : undefined,
      data: err instanceof TalakWeb3Error ? err.data : undefined,
    });

    if (isPublicError) {
      throw err;
    }

    throw new TalakWeb3Error("An internal server error occurred. Please contact support.", {
      code: INTERNAL_ERROR_CODES.SERVER_ERROR,
      status: 500,
    });
  }
};

export const requestLoggingMiddleware: MiddlewareHandler = async (req, next, ctx) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;
  ctx.logger.info(`[${getRequestId(ctx) ?? "unknown"}] ${duration}ms`);
  return response;
};

export class MiddlewareChain<T = unknown, R = unknown> implements IMiddlewareChain<T, R> {
  private readonly middlewares: MiddlewareHandler<T, R>[] = [];

  use(handler: MiddlewareHandler<T, R>): void {
    this.middlewares.push(handler);
  }

  async execute(req: T, ctx: TalakWeb3Context, finalHandler: () => Promise<R>): Promise<R> {
    let index = -1;

    const dispatch = async (i: number): Promise<R> => {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      if (i === this.middlewares.length) {
        return finalHandler();
      }
      const handler = this.middlewares[i];
      if (!handler) throw new Error(`No middleware at index ${i}`);
      return handler(req, () => dispatch(i + 1), ctx);
    };

    return dispatch(0);
  }
}
