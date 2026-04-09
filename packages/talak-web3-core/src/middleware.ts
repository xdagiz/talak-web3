import type { TalakWeb3Context, IMiddlewareChain, MiddlewareHandler } from '@talak-web3/types';

export class MiddlewareChain<T = unknown, R = unknown> implements IMiddlewareChain<T, R> {
  private readonly middlewares: MiddlewareHandler<T, R>[] = [];

  use(handler: MiddlewareHandler<T, R>): void {
    this.middlewares.push(handler);
  }

  async execute(req: T, ctx: TalakWeb3Context, finalHandler: () => Promise<R>): Promise<R> {
    let index = -1;

    const dispatch = async (i: number): Promise<R> => {
      if (i <= index) throw new Error('next() called multiple times');
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
