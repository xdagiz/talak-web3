import { TalakWeb3Error, AA_ERROR_CODES, TX_ERROR_CODES } from "@talak-web3/errors";
import type { TalakWeb3Context, Address, Hex } from "@talak-web3/types";
import { encodeFunctionData } from "viem";
import { formatUserOperation, getUserOperationHash } from "viem/account-abstraction";

import type { UserOperation, PartialUserOp, GasEstimate, UserOperationReceipt } from "./index.js";

/** Entry point contract address for ERC-4337 v0.6. */
export const ENTRY_POINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as Address;

/** Entry point contract address for ERC-4337 v0.7. */
export const ENTRY_POINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address;

export type EntryPointVersion = "v0.6" | "v0.7";

/**
 * Decode a v0.7-packed paymasterAndData into discrete fields for viem's hash.
 * Layout: address(20) || verificationGasLimit(16) || postOpGasLimit(16) || paymasterData
 */
function decodePaymasterAndData(pm: Hex): {
  paymaster: Hex;
  paymasterVerificationGasLimit: bigint;
  paymasterPostOpGasLimit: bigint;
  paymasterData: Hex;
} {
  if (pm.length < 2 + 40 + 32 + 32) {
    throw new TalakWeb3Error(
      `v0.7 paymasterAndData too short: expected at least 106 hex chars (with 0x), got ${pm.length}`,
      { code: AA_ERROR_CODES.PAYMASTER_INVALID_RESPONSE, status: 502 },
    );
  }
  const paymaster = ("0x" + pm.slice(2, 2 + 40)) as Hex;
  const paymasterVerificationGasLimit = BigInt("0x" + pm.slice(2 + 40, 2 + 40 + 32));
  const paymasterPostOpGasLimit = BigInt("0x" + pm.slice(2 + 40 + 32, 2 + 40 + 32 + 32));
  const paymasterData = ("0x" + pm.slice(2 + 40 + 32 + 32)) as Hex;
  return {
    paymaster,
    paymasterVerificationGasLimit,
    paymasterPostOpGasLimit,
    paymasterData,
  };
}

class BundlerRpc {
  constructor(
    private readonly url: string,
    private readonly timeoutMs = 30_000,
  ) {}

  async call<T>(method: string, params: unknown[], signal?: AbortSignal): Promise<T> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);

    let effectiveSignal: AbortSignal;
    let onAbort: (() => void) | undefined;
    if (signal && typeof AbortSignal.any !== "undefined") {
      effectiveSignal = AbortSignal.any([signal, timeoutSignal]);
    } else {
      effectiveSignal = timeoutSignal;
      if (signal) {
        const controller = new AbortController();
        onAbort = () => controller.abort();
        signal.addEventListener("abort", onAbort, { once: true });
        timeoutSignal.addEventListener("abort", () => controller.abort(), { once: true });
        effectiveSignal = controller.signal;
      }
    }

    let res: Response;
    try {
      res = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        signal: effectiveSignal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (timeoutSignal.aborted) {
          throw new TalakWeb3Error(`Bundler RPC timed out after ${this.timeoutMs}ms`, {
            code: AA_ERROR_CODES.BUNDLER_RPC_ERROR,
            status: 504,
          });
        }
        throw new TalakWeb3Error("Bundler RPC aborted by caller", {
          code: AA_ERROR_CODES.BUNDLER_RPC_ERROR,
          status: 499,
        });
      }
      throw new TalakWeb3Error(
        `Bundler RPC network error: ${(err as Error).message ?? String(err)}`,
        {
          code: AA_ERROR_CODES.BUNDLER_RPC_ERROR,
          status: 502,
        },
      );
    } finally {
      if (onAbort && signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }

    if (!res.ok) {
      throw new TalakWeb3Error(`Bundler RPC HTTP error: ${res.status}`, {
        code: AA_ERROR_CODES.BUNDLER_RPC_ERROR,
        status: 502,
      });
    }
    const data = (await res.json()) as { result?: T; error?: { message: string } };

    if (data.error) {
      throw new TalakWeb3Error(`Bundler RPC error: ${data.error.message}`, {
        code: AA_ERROR_CODES.BUNDLER_RPC_ERROR,
        status: 502,
      });
    }

    if (data.result === undefined) {
      throw new TalakWeb3Error("Bundler RPC returned no result", {
        code: AA_ERROR_CODES.BUNDLER_RPC_ERROR,
        status: 502,
      });
    }

    return data.result;
  }
}

/** Configuration for creating an Account Abstraction client. */
export interface AaClientOptions {
  bundlerUrl: string;
  paymasterUrl?: string;
  sign: (hash: Hex) => Promise<Hex>;
  sender: Address;
  chainId: number;
  entryPoint?: Address;
  version?: EntryPointVersion;
  simulationTimeoutMs?: number;
}

/** Client for interacting with ERC-4337 account abstraction bundlers and paymasters. */
export class AccountAbstractionClient {
  private readonly bundler: BundlerRpc;
  private readonly paymaster: BundlerRpc | undefined;
  private readonly entryPoint: Address;
  private readonly version: EntryPointVersion;
  private readonly simulationTimeoutMs: number;

  constructor(private readonly opts: AaClientOptions) {
    this.version = opts.version ?? "v0.7";
    this.entryPoint =
      opts.entryPoint ?? (this.version === "v0.7" ? ENTRY_POINT_V07 : ENTRY_POINT_V06);
    this.simulationTimeoutMs = opts.simulationTimeoutMs ?? 10_000;
    this.bundler = new BundlerRpc(opts.bundlerUrl);
    this.paymaster = opts.paymasterUrl ? new BundlerRpc(opts.paymasterUrl) : undefined;
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

  async estimateGas(partial: PartialUserOp, signal?: AbortSignal): Promise<GasEstimate> {
    return this.bundler.call<GasEstimate>(
      "eth_estimateUserOperationGas",
      [partial, this.entryPoint],
      signal,
    );
  }

  async getNonce(): Promise<Hex> {
    const methods = [
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
      { method: "eth_getAccountNonce", params: [this.opts.sender, "latest"] },
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
      code: AA_ERROR_CODES.NONCE_FAILED,
      status: 502,
      cause: lastError,
    });
  }

  private async simulate(op: PartialUserOp): Promise<GasEstimate> {
    if (this.simulationTimeoutMs <= 0) {
      return this.estimateGas(op);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.simulationTimeoutMs);
    try {
      return await this.estimateGas(op, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) {
        throw new TalakWeb3Error(
          `UserOp simulation timed out after ${this.simulationTimeoutMs}ms`,
          {
            code: AA_ERROR_CODES.SIMULATION_FAILED,
            status: 504,
            cause: err,
          },
        );
      }
      if (err instanceof TalakWeb3Error) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new TalakWeb3Error(`UserOp simulation failed: ${msg}`, {
        code: AA_ERROR_CODES.SIMULATION_FAILED,
        status: 422,
        cause: err,
      });
    } finally {
      clearTimeout(timer);
    }
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
      // https://docs.pimlico.io/references/paymaster/erc20-paymaster/endpoints/pm_sponsorUserOperation
      const [sponsored, fees] = await Promise.all([
        this.paymaster.call<{
          paymasterAndData: Hex;
          callGasLimit: Hex;
          verificationGasLimit: Hex;
          preVerificationGas: Hex;
          maxFeePerGas?: Hex;
          maxPriorityFeePerGas?: Hex;
        }>("pm_sponsorUserOperation", [partial, this.entryPoint]),
        this.bundler.call<{ maxFeePerGas: Hex; maxPriorityFeePerGas: Hex }>(
          "eth_maxPriorityFeePerGas",
          [],
        ),
      ]);

      if (
        !sponsored.paymasterAndData ||
        sponsored.paymasterAndData === "0x" ||
        !sponsored.callGasLimit ||
        !sponsored.verificationGasLimit ||
        !sponsored.preVerificationGas
      ) {
        throw new TalakWeb3Error(
          "Paymaster response missing required gas or paymasterAndData fields",
          {
            code: AA_ERROR_CODES.PAYMASTER_INVALID_RESPONSE,
            status: 502,
          },
        );
      }

      partial = {
        ...partial,
        ...sponsored,
        maxFeePerGas: sponsored.maxFeePerGas ?? fees.maxFeePerGas,
        maxPriorityFeePerGas: sponsored.maxPriorityFeePerGas ?? fees.maxPriorityFeePerGas,
      };
    } else {
      const [gas, fees] = await Promise.all([
        this.simulate(partial),
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
      code: TX_ERROR_CODES.RECEIPT_TIMEOUT,
      status: 504,
    });
  }

  private hashUserOp(op: UserOperation): Hex {
    if (this.version === "v0.7") {
      const initCode = op.initCode ?? "0x";
      const factory: Address | undefined =
        initCode !== "0x" && initCode.length >= 42 ? (initCode.slice(0, 42) as Address) : undefined;
      const factoryData: Hex | undefined =
        factory !== undefined
          ? initCode.length > 42
            ? (initCode.slice(42) as Hex)
            : ("0x" as Hex)
          : undefined;

      if (op.paymasterAndData && op.paymasterAndData !== "0x") {
        const decoded = decodePaymasterAndData(op.paymasterAndData);
        return getUserOperationHash({
          chainId: this.opts.chainId,
          entryPointAddress: this.entryPoint,
          entryPointVersion: "0.7",
          userOperation: {
            ...formatUserOperation(op),
            factory,
            factoryData,
            paymaster: decoded.paymaster,
            paymasterData: decoded.paymasterData,
            paymasterVerificationGasLimit: decoded.paymasterVerificationGasLimit,
            paymasterPostOpGasLimit: decoded.paymasterPostOpGasLimit,
          },
        });
      }
      return getUserOperationHash({
        chainId: this.opts.chainId,
        entryPointAddress: this.entryPoint,
        entryPointVersion: "0.7",
        userOperation: {
          ...formatUserOperation(op),
          factory,
          factoryData,
        },
      });
    }

    return getUserOperationHash({
      chainId: this.opts.chainId,
      entryPointAddress: this.entryPoint,
      entryPointVersion: "0.6",
      userOperation: formatUserOperation(op),
    });
  }
}

export interface AccountAbstractionPluginOptions {
  bundlerUrl: string;
  paymasterUrl?: string;
  sender: Address;
  sign: (hash: Hex) => Promise<Hex>;
  version?: EntryPointVersion;
  entryPoint?: Address;
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
