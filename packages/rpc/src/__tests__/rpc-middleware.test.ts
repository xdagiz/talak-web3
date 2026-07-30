import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { talakWeb3 } from "@talak-web3/core";
import { describe, expect, it } from "vitest";

import { UnifiedRpc } from "../index";

describe("UnifiedRpc middleware integration", () => {
  it("executes request middleware before performing the RPC call", async () => {
    const b3 = talakWeb3({
      chains: [
        {
          id: 1,
          name: "Test",
          rpcUrls: ["https://rpc.example.com:443"],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          testnet: true,
        },
      ],
      debug: false,
      auth: {
        nonceStore: new InMemoryNonceStore(),
        refreshStore: new InMemoryRefreshStore(),
        revocationStore: new InMemoryRevocationStore(),
      },
    });

    const ctx = b3.context;

    let seen = false;
    ctx.requestChain.use(async (req: unknown, next: () => Promise<unknown>) => {
      const rec = req as { method: string };
      if (rec.method === "eth_chainId") seen = true;
      return next();
    });

    const rpc = new UnifiedRpc(ctx, new Map());
    (rpc as unknown as { fetchWithRetry: (...args: unknown[]) => Promise<string> }).fetchWithRetry =
      async () => "0x1";

    const result = await rpc.request(1, "eth_chainId");
    expect(result).toBe("0x1");
    expect(seen).toBe(true);
  });
});
