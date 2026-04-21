import type { NonceStore } from '@talak-web3/auth';

export class MockNonceStore implements NonceStore {
  private nonces = new Map<string, Map<string, number>>();
  private operationLog: Array<{ operation: string; address: string; nonce?: string; timestamp: number }> = [];

  async create(address: string, meta?: { ip?: string; ua?: string }): Promise<string> {
    const addr = address.toLowerCase();
    const nonce = this.generateNonce();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    let addrNonces = this.nonces.get(addr);
    if (!addrNonces) {
      addrNonces = new Map();
      this.nonces.set(addr, addrNonces);
    }

    addrNonces.set(nonce, expiresAt);

    this.operationLog.push({
      operation: 'create',
      address: addr,
      nonce,
      timestamp: Date.now(),
    });

    return nonce;
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const addrNonces = this.nonces.get(addr);

    this.operationLog.push({
      operation: 'consume',
      address: addr,
      nonce,
      timestamp: Date.now(),
    });

    if (!addrNonces) {
      return false;
    }

    const expiresAt = addrNonces.get(nonce);
    if (expiresAt === undefined) {
      return false;
    }

    if (Date.now() > expiresAt) {
      addrNonces.delete(nonce);
      return false;
    }

    addrNonces.delete(nonce);

    if (addrNonces.size === 0) {
      this.nonces.delete(addr);
    }

    return true;
  }

  async exists(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const addrNonces = this.nonces.get(addr);

    if (!addrNonces) return false;

    const expiresAt = addrNonces.get(nonce);
    if (expiresAt === undefined) return false;

    if (Date.now() > expiresAt) {
      addrNonces.delete(nonce);
      return false;
    }

    return true;
  }

  getNoncesForAddress(address: string): Map<string, number> {
    return this.nonces.get(address.toLowerCase()) ?? new Map();
  }

  getOperationLog(): Array<{ operation: string; address: string; nonce?: string; timestamp: number }> {
    return [...this.operationLog];
  }

  clear(): void {
    this.nonces.clear();
    this.operationLog = [];
  }

  getNonceCount(): number {
    let count = 0;
    for (const addrNonces of this.nonces.values()) {
      count += addrNonces.size;
    }
    return count;
  }

  private generateNonce(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
