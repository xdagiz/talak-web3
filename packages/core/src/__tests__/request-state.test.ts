import { describe, it, expect, vi } from "vitest";

vi.mock("node:async_hooks", () => ({
  AsyncLocalStorage: class {
    constructor() {
      throw new Error("node:async_hooks unavailable (simulated non-Node runtime)");
    }
  },
}));

import {
  defineRequestState,
  runWithRequestState,
  runWithRequestStateAsync,
} from "../request-state.js";

describe("request-state without node:async_hooks", () => {
  it("keeps sync get/set working inside runWithRequestStateAsync", async () => {
    const state = defineRequestState<boolean>(() => false);

    await runWithRequestStateAsync(() => {
      state.set(true);
      expect(state.get()).toBe(true);
      return Promise.resolve();
    });
  });

  it("keeps sync get/set working inside runWithRequestState", async () => {
    const state = defineRequestState<number>(() => 0);

    const result = await runWithRequestState(() => {
      state.set(7);
      return state.get() * 2;
    });

    expect(result).toBe(14);
  });

  it("degrades to a shared store: state works outside runs too", () => {
    const state = defineRequestState<string>(() => "initial");

    expect(state.get()).toBe("initial");
    state.set("shared");
    expect(state.get()).toBe("shared");
  });

  it("runs the init function once per state", () => {
    let initCount = 0;
    const state = defineRequestState<number>(() => {
      initCount += 1;
      return 0;
    });

    expect(state.get()).toBe(0);
    expect(state.get()).toBe(0);
    expect(initCount).toBe(1);
  });
});
