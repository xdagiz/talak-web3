import type { Hex } from "@talak-web3/types";

export function assertUnreachable(x: never): never {
  throw new Error(`Unreachable: ${String(x)}`);
}

export function isHex(value: string): value is Hex {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

export function validateAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export function isValidHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

export function shortenAddress(address: string, chars = 4): string {
  if (!validateAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}

export function nowMs(): number {
  return Date.now();
}

export * from './migration';
