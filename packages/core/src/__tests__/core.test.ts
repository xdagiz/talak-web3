import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { MainnetPreset } from "@talak-web3/config";
import { describe, it, expect, vi } from "vitest";

import { talakWeb3 } from "../index";

const stores = () => ({
  nonceStore: new InMemoryNonceStore(),
  refreshStore: new InMemoryRefreshStore(),
  revocationStore: new InMemoryRevocationStore(),
});

describe("talakWeb3", () => {
  it("initializes with preset name", () => {
    const instance = talakWeb3({ preset: "mainnet", auth: stores() });
    expect(instance.config).toBeDefined();
    expect(instance.config.chains[0].id).toBe(1);
  });

  it("throws on unknown preset name", () => {
    expect(() => talakWeb3({ preset: "moonbeam" as any, auth: stores() })).toThrow(
      "Unknown preset",
    );
  });

  it("preset with overridden chain works end-to-end", () => {
    const instance = talakWeb3({
      preset: "mainnet",
      chains: [{ id: 1, rpcUrls: ["https://custom-rpc.com"] }],
      auth: stores(),
    });
    expect(instance.config.chains).toHaveLength(1);
    expect(instance.config.chains[0].rpcUrls[0]).toBe("https://custom-rpc.com");
  });

  it("backward compat: spread preset still works", () => {
    const instance = talakWeb3({ ...MainnetPreset, auth: stores() });
    expect(instance.config.chains[0].id).toBe(1);
  });

  it("should initialize with default config", () => {
    const instance = talakWeb3({ auth: stores() });
    expect(instance.config).toBeDefined();
    expect(instance.hooks).toBeDefined();
    expect(instance.context).toBeDefined();
  });

  it("should create independent instances", () => {
    const instance1 = talakWeb3({ key: "1", auth: stores() });
    const instance2 = talakWeb3({ key: "2", auth: stores() });
    expect(instance1).not.toBe(instance2);
  });

  it("should setup plugins during init", async () => {
    const setup = vi.fn();
    const plugin = {
      name: "test-plugin",
      version: "1.0.0",
      setup,
    };

    const instance = talakWeb3({ plugins: [plugin], auth: stores() });
    await instance.init();

    expect(setup).toHaveBeenCalledWith(instance.context);
    expect(instance.context.plugins.get("test-plugin")).toMatchObject({
      name: plugin.name,
      version: plugin.version,
    });
  });

  it("healthCheck reports ok when plugins have no health probe", async () => {
    const instance = talakWeb3({
      plugins: [{ name: "test-plugin", version: "1.0.0", setup: vi.fn() }],
      auth: stores(),
    });
    await instance.init();

    const result = instance.healthCheck();
    expect(result.checks.plugins).toBe(true);
    expect(result.status).toBe("ok");
  });

  it("healthCheck reports degraded when a plugin health probe fails", async () => {
    const instance = talakWeb3({
      plugins: [
        {
          name: "unhealthy-plugin",
          version: "1.0.0",
          setup: vi.fn(),
          health: () => false,
        },
      ],
      auth: stores(),
    });
    await instance.init();

    const result = instance.healthCheck();
    expect(result.checks.plugins).toBe(false);
    expect(result.status).toBe("degraded");
  });
});
