import { validateConfig, ConfigManager, MainnetPreset } from "@talak-web3/config";
import { describe, it, expect } from "vitest";

describe("Config Manager", () => {
  it("should validate valid config", () => {
    const config = validateConfig(MainnetPreset);
    expect(config.chains?.[0]?.id).toBe(1);
  });

  it("should throw on invalid config", () => {
    expect(() => validateConfig({ chains: [{ id: "invalid" }] })).toThrow();
  });

  it("should load from preset", () => {
    const config = ConfigManager.fromPreset("polygon");
    expect(config.chains?.[0]?.id).toBe(137);
  });

  it("should merge configs", () => {
    const merged = ConfigManager.merge(MainnetPreset, { debug: true });
    expect(merged.debug).toBe(true);
    expect(merged.chains?.[0]?.id).toBe(1);
  });
});
