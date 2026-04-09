export type SDKType = 'ethers' | 'viem' | 'web3js' | 'rainbowkit' | 'thirdweb';

export class MigrationTool {
  static suggestConfig(sdk: SDKType, existingConfig: any) {
    switch (sdk) {
      case 'ethers':
        return {
          chains: existingConfig.networks || [],
          rpc: { retries: 5 },
          // Map ethers providers to Talak-Web3 RPC
        };
      case 'viem':
        return {
          chains: existingConfig.chains || [],
          // Viem is already close to our schema
        };
      case 'thirdweb':
        return {
          plugins: ['storage', 'aa', 'nft'],
          // Thirdweb features are mapped to our plugins
        };
      default:
        return {};
    }
  }

  static getMapping(sdk: SDKType) {
    const mappings: Record<SDKType, Record<string, string>> = {
      ethers: {
        'ethers.providers.JsonRpcProvider': 'new TalakWeb3Rpc(ctx)',
        'signer.sendTransaction': 'ctx.rpc.request("eth_sendTransaction", [...])',
      },
      viem: {
        'createPublicClient': 'talakWeb3(config)',
        'client.readContract': 'ctx.rpc.request("eth_call", [...])',
      },
      web3js: {
        'new Web3(provider)': 'talakWeb3({ rpc: { url: provider } })',
      },
      rainbowkit: {
        'RainbowKitProvider': 'TalakWeb3Provider',
      },
      thirdweb: {
        'ThirdwebProvider': 'TalakWeb3Provider',
        'useAddress': 'useAccount().address',
      }
    };
    return mappings[sdk] || {};
  }
}
