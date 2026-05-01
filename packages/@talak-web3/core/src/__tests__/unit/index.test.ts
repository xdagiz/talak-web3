import { describe, it, expect, afterEach } from "vitest";

import { talakWeb3, __resetTalakWeb3 } from "../../index.js";

describe("talakWeb3", () => {
  afterEach(() => {
    __resetTalakWeb3();
  });

  describe("singleton behavior", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      const instance2 = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      __resetTalakWeb3();

      const instance2 = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("instance structure", () => {
    it("should have required properties", () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      expect(instance).toHaveProperty("config");
      expect(instance).toHaveProperty("hooks");
      expect(instance).toHaveProperty("context");
      expect(instance).toHaveProperty("init");
      expect(instance).toHaveProperty("destroy");
    });

    it("should have init method", () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      expect(typeof instance.init).toBe("function");
    });

    it("should have destroy method", () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      expect(typeof instance.destroy).toBe("function");
    });
  });

  describe("initialization", () => {
    it("should initialize without plugins", async () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      await expect(instance.init()).resolves.not.toThrow();
    });

    it("should initialize with empty plugins array", async () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
        plugins: [],
      });

      await expect(instance.init()).resolves.not.toThrow();
    });
  });

  describe("destroy", () => {
    it("should destroy cleanly", async () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      await instance.init();
      await expect(instance.destroy()).resolves.not.toThrow();
    });

    it("should reset singleton on destroy", async () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      await instance.init();
      await instance.destroy();

      const newInstance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      expect(newInstance).not.toBe(instance);
    });
  });

  describe("context", () => {
    it("should have context with required properties", () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      expect(instance.context).toHaveProperty("config");
      expect(instance.context).toHaveProperty("hooks");
      expect(instance.context).toHaveProperty("plugins");
      expect(instance.context).toHaveProperty("auth");
      expect(instance.context).toHaveProperty("cache");
      expect(instance.context).toHaveProperty("logger");
      expect(instance.context).toHaveProperty("requestChain");
      expect(instance.context).toHaveProperty("responseChain");
      expect(instance.context).toHaveProperty("rpc");
    });
  });

  describe("hooks", () => {
    it("should have event emitter methods", () => {
      const instance = talakWeb3({
        chains: [{ id: 1, rpcUrls: ["https://ethereum.rpc"] }],
      });

      expect(typeof instance.hooks.on).toBe("function");
      expect(typeof instance.hooks.emit).toBe("function");
      expect(typeof instance.hooks.off).toBe("function");
      expect(typeof instance.hooks.clear).toBe("function");
    });
  });
});
