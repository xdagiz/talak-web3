import {
  validateConfig,
  validateConfigWithDns,
  ConfigManager,
  MainnetPreset,
  isPrivateOrLoopbackHost,
} from "@talak-web3/config";
import { describe, it, expect, vi } from "vitest";

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

  it("should reject expanded-form loopback and unspecified IPv6", () => {
    expect(isPrivateOrLoopbackHost("0:0:0:0:0:0:0:1")).toBe(true);
    expect(isPrivateOrLoopbackHost("0:0:0:0:0:0:0:0")).toBe(true);
    expect(isPrivateOrLoopbackHost("2001:db8::1")).toBe(false);
    expect(isPrivateOrLoopbackHost("::ffff:7f00:1")).toBe(true);
  });

  it("should reject RPC URLs pointing at private/loopback/link-local hosts", () => {
    const reject = (rpcUrl: string) => {
      expect(() =>
        validateConfig({
          chains: [
            {
              id: 1,
              name: "test",
              rpcUrls: [rpcUrl],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            },
          ],
        }),
      ).toThrow();
    };

    reject("http://localhost:8545");
    reject("https://127.0.0.1");
    reject("https://10.0.0.1");
    reject("https://192.168.1.1");
    reject("https://169.254.169.254");
    reject("https://100.64.0.1"); // CGNAT
    reject("https://[::1]");
    reject("https://[::ffff:7f00:1]"); // IPv4-mapped loopback (hex form)
    reject("https://[fe80::1]"); // link-local IPv6
    reject("https://[::ffff:127.0.0.1]"); // IPv4-mapped loopback
    reject("http://127.0.0.1"); // non-TLS
  });

  it("should accept public HTTPS RPC URLs", () => {
    const config = validateConfig({
      chains: [
        {
          id: 1,
          name: "test",
          rpcUrls: ["https://rpc.example.com"],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        },
      ],
    });
    expect(config.chains?.[0]?.rpcUrls?.[0]).toBe("https://rpc.example.com");
  });

  it("validateConfigWithDns should reject hostnames resolving to private IPs", async () => {
    const dns = await import("node:dns");
    const originalLookup = dns.promises.lookup;
    dns.promises.lookup = vi
      .fn()
      .mockResolvedValue([{ address: "192.168.1.1", family: 4 }]) as typeof dns.promises.lookup;

    try {
      await expect(
        validateConfigWithDns({
          chains: [
            {
              id: 1,
              name: "test",
              rpcUrls: ["https://rpc.example.com"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            },
          ],
        }),
      ).rejects.toThrow(/DNS rebinding detected/);
    } finally {
      dns.promises.lookup = originalLookup;
    }
  });

  it("validateConfigWithDns should accept hostnames resolving to public IPs", async () => {
    const dns = await import("node:dns");
    const originalLookup = dns.promises.lookup;
    dns.promises.lookup = vi
      .fn()
      .mockResolvedValue([{ address: "8.8.8.8", family: 4 }]) as typeof dns.promises.lookup;

    try {
      const config = await validateConfigWithDns({
        chains: [
          {
            id: 1,
            name: "test",
            rpcUrls: ["https://rpc.example.com"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          },
        ],
      });
      expect(config.chains?.[0]?.rpcUrls?.[0]).toBe("https://rpc.example.com");
    } finally {
      dns.promises.lookup = originalLookup;
    }
  });
});
