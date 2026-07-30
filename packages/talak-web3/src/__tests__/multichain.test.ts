import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { talakWeb3 } from "@talak-web3/core";
import { describe, expect, it } from "vitest";

import { MultiChainRouter, estimateEip1559Fees } from "../multichain";

describe("multichain", () => {
  it("routes requests to chain-specific RPC instances", async () => {
    const b3 = talakWeb3({
      chains: [
        {
          id: 1,
          name: "One",
          rpcUrls: ["https://rpc.example.com:443"],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          testnet: true,
        },
        {
          id: 10,
          name: "Ten",
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

    const router = new MultiChainRouter(b3.context, b3.config);
    const rpc1 = router.getRpc(1);
    const rpc10 = router.getRpc(10);
    rpc1.request = async () => "0x1";
    rpc10.request = async () => "0xa";

    const c1 = await router.request({ chainId: 1, method: "eth_chainId" });
    const c10 = await router.request({ chainId: 10, method: "eth_chainId" });
    expect(c1).toBe("0x1");
    expect(c10).toBe("0xa");
  });

  it("computes conservative EIP-1559 fees from gasPrice", async () => {
    const rpc = {
      request: async (_chainId: number, method: string) => {
        if (method === "eth_maxPriorityFeePerGas") throw new Error("unsupported");
        return "0x3b9aca00";
      },
    } as { request: (chainId: number, method: string) => Promise<string> };
    const fees = await estimateEip1559Fees(rpc, 1);
    expect(fees.maxPriorityFeePerGas).toBe(1_500_000_000n);
    expect(fees.maxFeePerGas).toBe(2_000_000_000n + 1_500_000_000n);
  });
});
