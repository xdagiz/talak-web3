import type { Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { MockWallet } from '../types.js';

export function generateWalletAddress(): Address {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return account.address;
}

export function createMockWallet(): MockWallet {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  return {
    address: account.address,
    privateKey,
    publicKey: account.publicKey,
  };
}

export function createMockWallets(count: number): MockWallet[] {
  return Array.from({ length: count }, () => createMockWallet());
}

export const TEST_WALLETS = {
  alice: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as Address,
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as `0x${string}`,
    publicKey: '0x04' as `0x${string}`,
  },
  bob: {
    address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72' as Address,
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as `0x${string}`,
    publicKey: '0x04' as `0x${string}`,
  },
} as const;
