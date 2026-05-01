import { describe, it, expect, vi, beforeEach } from "vitest";

import { talakWeb3, __resetTalakWeb3 } from "../index";

describe("talakWeb3", () => {
  beforeEach(() => {
    __resetTalakWeb3();
  });

  it("should initialize with default config", () => {
    const instance = talakWeb3();
    expect(instance.config).toBeDefined();
    expect(instance.hooks).toBeDefined();
    expect(instance.context).toBeDefined();
  });

  it("should be a singleton", () => {
    const instance1 = talakWeb3({ key: "1" });
    const instance2 = talakWeb3({ key: "2" });
    expect(instance1).toBe(instance2);
  });

  it("should setup plugins during init", async () => {
    const setup = vi.fn();
    const plugin = {
      name: "test-plugin",
      version: "1.0.0",
      setup,
    };

    const instance = talakWeb3({ plugins: [plugin] });
    await instance.init();

    expect(setup).toHaveBeenCalledWith(instance.context);
    expect(instance.context.plugins.get("test-plugin")).toBe(plugin);
  });
});
