import type { RevocationStore } from '@talak-web3/auth';

export class MockRevocationStore implements RevocationStore {
  private revokedTokens = new Map<string, number>();
  private globalInvalidationAt = 0;
  private operationLog: Array<{
    operation: 'revoke' | 'check';
    jti: string;
    wasRevoked: boolean;
    timestamp: number;
  }> = [];

  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    this.revokedTokens.set(jti, expiresAtMs);

    this.operationLog.push({
      operation: 'revoke',
      jti,
      wasRevoked: true,
      timestamp: Date.now(),
    });
  }

  async isRevoked(jti: string): Promise<boolean> {
    const exp = this.revokedTokens.get(jti);

    let isRevoked: boolean;

    if (exp === undefined) {
      isRevoked = false;
    } else if (Date.now() > exp) {

      this.revokedTokens.delete(jti);
      isRevoked = false;
    } else {
      isRevoked = true;
    }

    this.operationLog.push({
      operation: 'check',
      jti,
      wasRevoked: isRevoked,
      timestamp: Date.now(),
    });

    return isRevoked;
  }

  getRevokedTokens(): Map<string, number> {
    return new Map(this.revokedTokens);
  }

  getOperationLog(): Array<{
    operation: 'revoke' | 'check';
    jti: string;
    wasRevoked: boolean;
    timestamp: number;
  }> {
    return [...this.operationLog];
  }

  clear(): void {
    this.revokedTokens.clear();
    this.operationLog = [];
  }

  getRevocationCount(): number {
    return this.revokedTokens.size;
  }

  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [jti, expiresAt] of this.revokedTokens.entries()) {
      if (now > expiresAt) {
        this.revokedTokens.delete(jti);
        cleaned++;
      }
    }

    return cleaned;
  }

  async setGlobalInvalidationTime(timestampSeconds: number): Promise<void> {
    this.globalInvalidationAt = timestampSeconds;
  }

  async getGlobalInvalidationTime(): Promise<number> {
    return this.globalInvalidationAt;
  }
}
