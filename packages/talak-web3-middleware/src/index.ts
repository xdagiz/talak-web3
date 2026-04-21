export type MiddlewareRequest = {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  ip?: string;
};

export type MiddlewareResponse = {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
};

export type MiddlewareNext = () => Promise<MiddlewareResponse>;

export type Middleware = (req: MiddlewareRequest, next: MiddlewareNext) => Promise<MiddlewareResponse>;

export function chain(middlewares: Middleware[]): Middleware {
  return async function chained(req, next) {
    let index = -1;
    async function dispatch(i: number): Promise<MiddlewareResponse> {
      if (i <= index) return Promise.reject(new Error("Middleware recursion"));
      index = i;
      const mw = middlewares[i];
      if (!mw) return next();
      return mw(req, () => dispatch(i + 1));
    }
    return dispatch(0);
  };
}
