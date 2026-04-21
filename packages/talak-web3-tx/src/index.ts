import type { Address, Hex } from '@talak-web3/types';

export type { Address, Hex };

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

export type PartialUserOp = Pick<UserOperation, 'sender' | 'callData'> &
  Partial<Omit<UserOperation, 'sender' | 'callData' | 'signature'>>;

export interface BundlerClient {
  sendUserOperation(op: UserOperation, entryPoint: Address): Promise<{ hash: Hex }>;
  waitForReceipt(userOpHash: Hex, timeoutMs?: number): Promise<UserOperationReceipt>;
  estimateGas(op: PartialUserOp, entryPoint: Address): Promise<GasEstimate>;
}

export interface PaymasterClient {
  sponsorUserOperation(
    op: PartialUserOp,
    entryPoint: Address,
  ): Promise<{ paymasterAndData: Hex; callGasLimit: Hex; verificationGasLimit: Hex; preVerificationGas: Hex }>;
}

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

export interface GasEstimate {
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
}

export * from './aa.js';
