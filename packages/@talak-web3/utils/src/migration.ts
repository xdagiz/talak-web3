export type SDKType = "ethers" | "viem" | "web3js" | "rainbowkit" | "thirdweb";

export class MigrationTool {
  static suggestConfig(sdk: SDKType, existingConfig: unknown) {
    switch (sdk) {
      case "ethers": {
        const networks = (existingConfig as { networks?: unknown[] })?.networks || [];
        return {
          chains: networks,
          rpc: { retries: 5 },
        };
      }
      case "viem": {
        const chains = (existingConfig as { chains?: unknown[] })?.chains || [];
        return {
          chains: chains,
        };
      }
      case "thirdweb": {
        return {
          plugins: ["storage", "aa", "nft"],
        };
      }
      default: {
        return {};
      }
    }
  }

  static getMapping(sdk: SDKType) {
    const mappings: Record<SDKType, Record<string, string>> = {
      ethers: {
        "ethers.providers.JsonRpcProvider": "new TalakWeb3Rpc(ctx)",
        "signer.sendTransaction": 'ctx.rpc.request("eth_sendTransaction", [...])',
      },
      viem: {
        createPublicClient: "talakWeb3(config)",
        "client.readContract": 'ctx.rpc.request("eth_call", [...])',
      },
      web3js: {
        "new Web3(provider)": "talakWeb3({ rpc: { url: provider } })",
      },
      rainbowkit: {
        RainbowKitProvider: "TalakWeb3Provider",
      },
      thirdweb: {
        ThirdwebProvider: "TalakWeb3Provider",
        useAddress: "useAccount().address",
      },
    };
    return mappings[sdk] || {};
  }
}
