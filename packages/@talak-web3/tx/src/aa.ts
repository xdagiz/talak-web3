import { TalakWeb3Error } from "@talak-web3/errors";
import type { TalakWeb3Context, Address, Hex } from "@talak-web3/types";
import { encodeFunctionData, keccak256, encodeAbiParameters, parseAbiParameters } from "viem";

import type { UserOperation, PartialUserOp, GasEstimate, UserOperationReceipt } from "./index.js";

export const ENTRY_POINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Address;

class BundlerRpc {
  constructor(private readonly url: string) {}

  async call<T>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    if (!res.ok) throw new Error(`Bundler HTTP ${res.status}`);
    const data = (await res.json()) as { result?: T; error?: { message: string } };
    if (data.error) throw new Error(data.error.message);
    if (data.result === undefined) throw new Error("No result from bundler");
    return data.result;
  }
}

export interface AaClientOptions {
  bundlerUrl: string;

  paymasterUrl?: string;

  sign: (hash: Hex) => Promise<Hex>;

  sender: Address;

  chainId: number;

  entryPoint?: Address;
}

export class AccountAbstractionClient {
  private readonly bundler: BundlerRpc;
  private readonly paymaster: BundlerRpc | undefined;
  private readonly entryPoint: Address;

  constructor(private readonly opts: AaClientOptions) {
    this.bundler = new BundlerRpc(opts.bundlerUrl);
    this.paymaster = opts.paymasterUrl ? new BundlerRpc(opts.paymasterUrl) : undefined;
    this.entryPoint = opts.entryPoint ?? ENTRY_POINT_V06;
  }

  buildCallData(to: Address, value: bigint, data: Hex): Hex {
    return encodeFunctionData({
      abi: [
        {
          name: "execute",
          type: "function",
          inputs: [{ type: "address" }, { type: "uint256" }, { type: "bytes" }],
          outputs: [],
        },
      ],
      functionName: "execute",
      args: [to, value, data],
    });
  }

  async estimateGas(partial: PartialUserOp): Promise<GasEstimate> {
    return this.bundler.call<GasEstimate>("eth_estimateUserOperationGas", [
      partial,
      this.entryPoint,
    ]);
  }

  async getNonce(): Promise<Hex> {
    const methods = [
      { method: "eth_getAccountNonce", params: [this.opts.sender, "latest"] },
      {
        method: "eth_call",
        params: [
          {
            to: this.entryPoint,
            data: encodeFunctionData({
              abi: [
                {
                  name: "getNonce",
                  type: "function",
                  inputs: [{ type: "address" }, { type: "uint192" }],
                  outputs: [{ type: "uint256" }],
                },
              ],
              functionName: "getNonce",
              args: [this.opts.sender, 0n],
            }),
          },
          "latest",
        ],
      },
    ];

    let lastError: Error | undefined;
    for (const { method, params } of methods) {
      try {
        return await this.bundler.call<Hex>(method, params);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new TalakWeb3Error("Failed to fetch smart account nonce via any supported method", {
      code: "AA_NONCE_FAILED",
      status: 502,
      cause: lastError,
    });
  }

  async sendGasless(to: Address, data: Hex, value = 0n): Promise<Hex> {
    const callData = this.buildCallData(to, value, data);

    let partial: PartialUserOp = {
      sender: this.opts.sender,
      callData,
      nonce: await this.getNonce(),
      initCode: "0x",
    };

    if (this.paymaster) {
      const sponsored = await this.paymaster.call<{
        paymasterAndData: Hex;
        callGasLimit: Hex;
        verificationGasLimit: Hex;
        preVerificationGas: Hex;
      }>("pm_sponsorUserOperation", [partial, this.entryPoint]);

      partial = { ...partial, ...sponsored };
    } else {
      const [gas, fees] = await Promise.all([
        this.estimateGas(partial),
        this.bundler.call<{ maxFeePerGas: Hex; maxPriorityFeePerGas: Hex }>(
          "eth_maxPriorityFeePerGas",
          [],
        ),
      ]);
      partial = {
        ...partial,
        ...gas,
        paymasterAndData: "0x",
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      };
    }

    const op = partial as UserOperation;

    const opHash = this.hashUserOp(op);
    op.signature = await this.opts.sign(opHash);

    const { hash } = await this.bundler.call<{ hash: Hex }>("eth_sendUserOperation", [
      op,
      this.entryPoint,
    ]);
    return hash;
  }

  async waitForReceipt(userOpHash: Hex, timeoutMs = 120_000): Promise<UserOperationReceipt> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const receipt = await this.bundler.call<UserOperationReceipt | null>(
        "eth_getUserOperationReceipt",
        [userOpHash],
      );
      if (receipt !== null) return receipt;
      await new Promise((r) => setTimeout(r, 2_000));
    }
    throw new TalakWeb3Error(`UserOperation ${userOpHash} not mined within ${timeoutMs}ms`, {
      code: "TX_RECEIPT_TIMEOUT",
      status: 504,
    });
  }

  private hashUserOp(op: UserOperation): Hex {
    const packed = encodeAbiParameters(
      parseAbiParameters(
        "address,uint256,bytes32,bytes32,uint256,uint256,uint256,uint256,uint256,bytes32",
      ),
      [
        op.sender,
        BigInt(op.nonce),
        keccak256(op.initCode),
        keccak256(op.callData),
        BigInt(op.callGasLimit),
        BigInt(op.verificationGasLimit),
        BigInt(op.preVerificationGas),
        BigInt(op.maxFeePerGas),
        BigInt(op.maxPriorityFeePerGas),
        keccak256(op.paymasterAndData),
      ],
    );
    const innerHash = keccak256(packed);
    const outer = encodeAbiParameters(parseAbiParameters("bytes32,address,uint256"), [
      innerHash,
      this.entryPoint,
      BigInt(this.opts.chainId),
    ]);
    return keccak256(outer);
  }
}

export interface AccountAbstractionPluginOptions {
  bundlerUrl: string;
  paymasterUrl?: string;
  sender: Address;
  sign: (hash: Hex) => Promise<Hex>;
}

export class AccountAbstractionPlugin {
  readonly client: AccountAbstractionClient;

  constructor(
    private readonly ctx: TalakWeb3Context,
    opts: AccountAbstractionPluginOptions,
  ) {
    const chainId = ctx.config.chains[0]?.id ?? 1;
    this.client = new AccountAbstractionClient({
      ...opts,
      chainId,
    });
  }

  async sendGasless(to: Address, data: Hex, value?: bigint): Promise<Hex> {
    this.ctx.hooks.emit("tx:gasless-start", { to, data });
    try {
      const hash = await this.client.sendGasless(to, data, value);
      this.ctx.hooks.emit("tx:gasless-success", { hash });
      this.ctx.logger.info(`Gasless TX sent: ${hash}`);
      return hash;
    } catch (error) {
      this.ctx.hooks.emit("tx:gasless-error", { error });
      throw error;
    }
  }

  static setup(
    ctx: TalakWeb3Context,
    opts: AccountAbstractionPluginOptions,
  ): AccountAbstractionPlugin {
    const plugin = new AccountAbstractionPlugin(ctx, opts);
    ctx.adapters = { ...ctx.adapters, aa: plugin };
    return plugin;
  }
}
