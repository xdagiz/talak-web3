import { describe, it, expect, beforeEach } from "vitest";

import { talakWeb3, __resetTalakWeb3 } from "../index";

describe("talakWeb3 security", () => {
  beforeEach(() => {
    __resetTalakWeb3();
  });

  it("should throw error if private key is leaked in config", () => {
    const leakedConfig = {
      apiKey: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    };

    expect(() => talakWeb3(leakedConfig)).toThrow("Potential private key leak detected in config");
  });

  it("should allow valid addresses", () => {
    const validConfig = {
      chains: [
        {
          id: 1,
          name: "Mainnet",
          rpcUrls: ["https://mainnet.infura.io/v3/demo-project-id"],
          nativeCurrency: { name: "Ether", symbol: "ETH" },
        },
      ],
    };

    expect(() => talakWeb3(validConfig)).not.toThrow();
  });
});
