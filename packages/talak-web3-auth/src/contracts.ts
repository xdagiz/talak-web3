export interface NonceStore {
  create(address: string, meta?: { ip?: string; ua?: string }): Promise<string>;
  consume(address: string, nonce: string): Promise<boolean>;
}

export interface RefreshSession {
  id: string;
  address: string;
  chainId: number;
  hash: string;
  expiresAt: number;
  revoked: boolean;
}

export interface RefreshStore {
  create(address: string, chainId: number, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  revoke(token: string): Promise<void>;
  lookup(token: string): Promise<RefreshSession | null>;
}

export interface RevocationStore {
  revoke(jti: string, expiresAtMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;

  setGlobalInvalidationTime(timestampSeconds: number): Promise<void>;
  getGlobalInvalidationTime(): Promise<number>;
}
