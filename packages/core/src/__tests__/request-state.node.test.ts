import { describe, it, expect } from "vitest";

import {
  defineRequestState,
  runWithRequestState,
  runWithRequestStateAsync,
} from "../request-state.js";

describe("request-state (node:async_hooks)", () => {
  it("scopes state per run — values do not leak between requests", async () => {
    const state = defineRequestState<string>(() => "default");

    await runWithRequestStateAsync(() => {
      state.set("request A");
      expect(state.get()).toBe("request A");
      return Promise.resolve();
    });

    await runWithRequestStateAsync(() => {
      expect(state.get()).toBe("default");
      return Promise.resolve();
    });
  });

  it("initializes state per request scope, not once globally", async () => {
    let initCount = 0;
    const state = defineRequestState<number>(() => {
      initCount += 1;
      return 0;
    });

    await runWithRequestState(() => {
      expect(state.get()).toBe(0);
      expect(initCount).toBe(1);
      state.set(initCount);
    });
    await runWithRequestState(() => {
      expect(state.get()).toBe(0);
      expect(initCount).toBe(2);
    });
  });

  it("thows when accessed outside a run", async () => {
    const state = defineRequestState(() => false);

    await runWithRequestState(() => {
      state.set(true);
    });

    expect(() => state.get()).toThrow(/No request state found/);
    expect(() => state.set(true)).toThrow(/No request state found/);
  });

  it("propagates state across async gaps inside a run", async () => {
    const state = defineRequestState<number>(() => 0);

    await runWithRequestStateAsync(async () => {
      state.set(1);
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(state.get()).toBe(1);
    });
  });
});
