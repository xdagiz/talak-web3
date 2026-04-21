export class MiddlewareChain {
    middlewares = [];
    use(handler) {
        this.middlewares.push(handler);
    }
    async execute(req, ctx, finalHandler) {
        let index = -1;
        const dispatch = async (i) => {
            if (i <= index)
                throw new Error('next() called multiple times');
            index = i;
            if (i === this.middlewares.length) {
                return finalHandler();
            }
            const handler = this.middlewares[i];
            if (!handler)
                throw new Error(`No middleware at index ${i}`);
            return handler(req, () => dispatch(i + 1), ctx);
        };
        return dispatch(0);
    }
}
