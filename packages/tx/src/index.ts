import type { Address, Hex } from "@talak-web3/types";

/** A 0x-prefixed hex string representing a blockchain address. */
export type { Address };

/** A 0x-prefixed hex string representing arbitrary data or a hash. */
export type { Hex };

/**
 * ERC-4337 User Operation representing a transaction to be executed by a smart account.
 *
 * @property sender - The account sending the user operation.
 * @property nonce - Anti-replay nonce for the sender.
 * @property initCode - Account initialization bytecode (empty if already created).
 * @property callData - Calldata to be executed by the account.
 * @property callGasLimit - Gas limit for the call.
 * @property verificationGasLimit - Gas limit for account validation.
 * @property preVerificationGas - Gas to compensate the bundler.
 * @property maxFeePerGas - Maximum fee per gas unit.
 * @property maxPriorityFeePerGas - Maximum priority fee per gas unit.
 * @property paymasterAndData - Paymaster address and data (empty if none).
 * @property signature - Cryptographic signature from the sender.
 */
export interface UserOperation {
  sender: Address;
  nonce: Hex;
  initCode: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  paymasterAndData: Hex;
  signature: Hex;
}

/**
 * Partial User Operation with only sender and callData required.
 * Used for gas estimation and paymaster sponsorship.
 */
export type PartialUserOp = Pick<UserOperation, "sender" | "callData"> &
  Partial<Omit<UserOperation, "sender" | "callData" | "signature">>;

/**
 * Client for communicating with an ERC-4337 bundler.
 *
 * @remarks
 * - `sendUserOperation` — Submit a signed user operation to the bundler.
 * - `waitForReceipt` — Wait for a user operation to be included on-chain.
 * - `estimateGas` — Estimate gas for a partial user operation.
 */
export interface BundlerClient {
  sendUserOperation(op: UserOperation, entryPoint: Address): Promise<{ hash: Hex }>;
  waitForReceipt(userOpHash: Hex, timeoutMs?: number): Promise<UserOperationReceipt>;
  estimateGas(op: PartialUserOp, entryPoint: Address): Promise<GasEstimate>;
}

/**
 * Client for requesting paymaster sponsorship of user operations.
 *
 * @remarks
 * - `sponsorUserOperation` — Request a paymaster to sponsor a user operation.
 */
export interface PaymasterClient {
  sponsorUserOperation(
    op: PartialUserOp,
    entryPoint: Address,
  ): Promise<{
    paymasterAndData: Hex;
    callGasLimit: Hex;
    verificationGasLimit: Hex;
    preVerificationGas: Hex;
    maxFeePerGas?: Hex;
    maxPriorityFeePerGas?: Hex;
  }>;
}

/**
 * Receipt for a mined user operation, including on-chain transaction details.
 *
 * @property userOpHash - Hash of the user operation.
 * @property sender - Address of the sender account.
 * @property nonce - Nonce used by the sender.
 * @property success - Whether the operation executed successfully.
 * @property actualGasCost - Total gas cost in wei.
 * @property actualGasUsed - Gas units actually consumed.
 * @property receipt - Underlying transaction receipt with hash, block, and status.
 */
export interface UserOperationReceipt {
  userOpHash: Hex;
  sender: Address;
  nonce: Hex;
  success: boolean;
  actualGasCost: Hex;
  actualGasUsed: Hex;
  receipt: {
    transactionHash: Hex;
    blockNumber: Hex;
    blockHash: Hex;
    status: Hex;
  };
}

/**
 * Gas estimate returned by a bundler for a partial user operation.
 *
 * @property callGasLimit - Estimated gas for the account call.
 * @property verificationGasLimit - Estimated gas for account validation.
 * @property preVerificationGas - Estimated extra gas for bundler overhead.
 */
export interface GasEstimate {
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
}

export * from "./aa.js";
