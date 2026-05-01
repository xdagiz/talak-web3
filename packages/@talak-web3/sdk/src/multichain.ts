import { UnifiedRpc } from "@talak-web3/rpc";
import type { TalakWeb3BaseConfig, TalakWeb3Context, IRpc, RpcOptions } from "@talak-web3/types";

export type ChainRef = {
  id: number;
  name: string;
  rpcUrls: readonly string[];
};

export type MultiChainRequest = {
  chainId: number;
  method: string;
  params?: unknown[];
  options?: RpcOptions;
};

export class MultiChainRouter {
  private readonly ctx: TalakWeb3Context;
  private readonly config: TalakWeb3BaseConfig;
  private readonly rpcByChainId = new Map<number, IRpc>();

  constructor(ctx: TalakWeb3Context, config: TalakWeb3BaseConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  listChains(): ChainRef[] {
    return this.config.chains.map((c) => ({ id: c.id, name: c.name, rpcUrls: c.rpcUrls }));
  }

  getRpc(chainId: number): IRpc {
    const existing = this.rpcByChainId.get(chainId);
    if (existing) return existing;

    const chain = this.config.chains.find((c) => c.id === chainId);
    if (!chain) throw new Error(`Unknown chainId: ${chainId}`);

    const endpoints = chain.rpcUrls.map((url: string, priority: number) => ({ url, priority }));
    const rpc = new UnifiedRpc(this.ctx, endpoints);
    this.rpcByChainId.set(chainId, rpc);
    return rpc;
  }

  async request<T = unknown>(req: MultiChainRequest): Promise<T> {
    const { chainId, method, params = [], options = {} } = req;
    return this.getRpc(chainId).request<T>(method, params, options);
  }
}

export type Eip1559Fees = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

export async function estimateEip1559Fees(rpc: IRpc): Promise<Eip1559Fees> {
  const baseFeeHex = await rpc.request<string>("eth_gasPrice");
  const baseFee = BigInt(baseFeeHex);
  const priority = 1_500_000_000n;
  const maxFee = baseFee * 2n + priority;
  return { maxFeePerGas: maxFee, maxPriorityFeePerGas: priority };
}
