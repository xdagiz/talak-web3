import type { Address } from 'viem';
import type { SessionPayload } from '@talak-web3/auth';

export interface MockWallet {
  address: Address;
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
}

export interface MockSession {
  address: string;
  chainId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface TestContext {

  testId: string;

  startTime: number;

  cleanup: (() => Promise<void> | void)[];

  addCleanup: (fn: () => Promise<void> | void) => void;

  runCleanup: () => Promise<void>;
}

export interface SiweMessageFields {
  domain: string;
  address: Address;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  statement?: string;
  uri?: string;
  version?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface MockRedisOperations {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}
