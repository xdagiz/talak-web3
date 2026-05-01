import type { TalakWeb3Context } from "@talak-web3/types";
import { describe, it, expect, beforeEach } from "vitest";

import { MiddlewareChain } from "../../middleware.js";

describe("MiddlewareChain", () => {
  let chain: MiddlewareChain;
  const mockContext = {} as TalakWeb3Context;

  beforeEach(() => {
    chain = new MiddlewareChain();
  });

  describe("use", () => {
    it("should add middleware to chain", () => {
      const middleware = async (ctx: unknown, next: () => Promise<void>) => {
        await next();
      };

      chain.use(middleware);

      expect(chain).toBeDefined();
    });

    it("should add multiple middlewares", () => {
      const middleware1 = async (ctx: unknown, next: () => Promise<void>) => {
        await next();
      };
      const middleware2 = async (ctx: unknown, next: () => Promise<void>) => {
        await next();
      };

      chain.use(middleware1);
      chain.use(middleware2);

      expect(chain).toBeDefined();
    });
  });

  describe("execute", () => {
    it("should execute middleware in order", async () => {
      const order: number[] = [];

      chain.use(async (_req, next) => {
        order.push(1);
        await next();
        order.push(4);
      });

      chain.use(async (_req, next) => {
        order.push(2);
        await next();
        order.push(3);
      });

      await chain.execute({}, mockContext, async () => undefined as unknown);

      expect(order).toEqual([1, 2, 3, 4]);
    });

    it("should pass request through middleware", async () => {
      const request = { value: 0 };

      chain.use(async (req: typeof request, next) => {
        req.value += 1;
        await next();
      });

      chain.use(async (req: typeof request, next) => {
        req.value += 10;
        await next();
      });

      await chain.execute(request, mockContext, async () => undefined as unknown);

      expect(request.value).toBe(11);
    });

    it("should handle empty chain", async () => {
      await expect(
        chain.execute({}, mockContext, async () => undefined as unknown),
      ).resolves.not.toThrow();
    });

    it("should stop chain if next is not called", async () => {
      const order: number[] = [];

      chain.use(async () => {
        order.push(1);
      });

      chain.use(async (_req, next) => {
        order.push(2);
        await next();
      });

      await chain.execute({}, mockContext, async () => undefined as unknown);

      expect(order).toEqual([1]);
    });

    it("should handle async middleware", async () => {
      const order: number[] = [];

      chain.use(async (_req, next) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        order.push(1);
        await next();
      });

      chain.use(async (_req, next) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(2);
        await next();
      });

      await chain.execute({}, mockContext, async () => undefined as unknown);

      expect(order).toEqual([1, 2]);
    });

    it("should propagate errors", async () => {
      chain.use(async () => {
        throw new Error("Middleware error");
      });

      await expect(
        chain.execute({}, mockContext, async () => undefined as unknown),
      ).rejects.toThrow("Middleware error");
    });

    it("should not continue after error", async () => {
      const order: number[] = [];

      chain.use(async () => {
        order.push(1);
        throw new Error("Stop here");
      });

      chain.use(async (_req, next) => {
        order.push(2);
        await next();
      });

      await expect(
        chain.execute({}, mockContext, async () => undefined as unknown),
      ).rejects.toThrow();
      expect(order).toEqual([1]);
    });
  });
});
