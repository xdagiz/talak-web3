import { performance } from "perf_hooks";

import { TalakWeb3Auth } from "@talak-web3/auth";
import { talakWeb3 } from "@talak-web3/core";
import { describe, it, expect } from "vitest";

describe("Performance Benchmarks", () => {
  const BUDGET_COLD_START = 187;
  const BUDGET_HOT_PATH = 23;

  it("should meet Cold Start Auth budget", async () => {
    const startCold = performance.now();
    const instance = talakWeb3({
      chains: [
        {
          id: 1,
          name: "Mainnet",
          rpcUrls: ["https://mainnet.infura.io/v3/fake"],
          nativeCurrency: { name: "Ether", symbol: "ETH" },
        },
      ],
    });
    const auth = new TalakWeb3Auth(instance.context);
    await auth.coldStart();
    const endCold = performance.now();
    const coldDuration = endCold - startCold;

    console.log(`- Cold Start Auth: ${coldDuration.toFixed(2)}ms (Budget: ${BUDGET_COLD_START}ms)`);
    expect(coldDuration).toBeLessThan(BUDGET_COLD_START);
  });

  it("should meet Hot Path JWT Validation budget", async () => {
    const instance = talakWeb3();
    const auth = new TalakWeb3Auth(instance.context);

    const iterations = 1000;
    const startHot = performance.now();
    for (let i = 0; i < iterations; i++) {
      await auth.validateJwt("valid-token");
    }
    const endHot = performance.now();
    const hotDuration = (endHot - startHot) / iterations;

    console.log(
      `- Hot Path JWT Validation: ${hotDuration.toFixed(2)}ms (Budget: ${BUDGET_HOT_PATH}ms)`,
    );
    expect(hotDuration).toBeLessThan(BUDGET_HOT_PATH);
  });
});
