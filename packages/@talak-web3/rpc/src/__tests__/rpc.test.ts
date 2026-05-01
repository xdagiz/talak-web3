import type { TalakWeb3Context } from "@talak-web3/types";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { UnifiedRpc } from "../index";

describe("UnifiedRpc", () => {
  let mockContext: TalakWeb3Context;

  beforeEach(() => {
    mockContext = {
      config: { rpc: { retries: 2, timeout: 5000 } },
      hooks: { emit: vi.fn() },
      plugins: new Map(),
      rpc: {},
      auth: {},
      cache: { get: vi.fn(), set: vi.fn() },
      logger: console,
      requestChain: { use: vi.fn(), execute: vi.fn() },
      responseChain: { use: vi.fn(), execute: vi.fn() },
    } as TalakWeb3Context;

    global.fetch = vi.fn();
  });

  it("should retry and failover on error", async () => {
    const endpoints = [
      { url: "https://rpc1.com", priority: 1 },
      { url: "https://rpc2.com", priority: 2 },
    ] as const;
    const rpc = new UnifiedRpc(mockContext, endpoints);

    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: "2.0", id: 1, result: "0x123" }),
      });

    const result = await rpc.request("eth_blockNumber");

    expect(result).toBe("0x123");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(mockContext.hooks.emit).toHaveBeenCalledWith("rpc-error", expect.any(Object));
    expect(
      (endpoints[0] as { url: string; priority: number; health?: { status: string } }).health
        ?.status,
    ).toBe("down");
  });

  it("should throw error after max retries", async () => {
    const endpoints = [{ url: "https://rpc1.com" }];
    const rpc = new UnifiedRpc(mockContext, endpoints);

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    await expect(rpc.request("eth_blockNumber", [], { retries: 2 })).rejects.toThrow(
      "RPC request failed after 3 attempts",
    );

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("should perform health checks", async () => {
    const endpoints = [{ url: "https://rpc1.com" }] as const;
    const rpc = new UnifiedRpc(mockContext, endpoints);

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: "2.0", id: 1, result: "0x1" }),
    });

    await rpc.checkAllHealth();

    expect(
      (endpoints[0] as { url: string; health?: { status: string; latency: number } }).health
        ?.status,
    ).toBe("up");
    expect(
      (endpoints[0] as { url: string; health?: { status: string; latency: number } }).health
        ?.latency,
    ).toBeLessThan(Infinity);
  });
});
