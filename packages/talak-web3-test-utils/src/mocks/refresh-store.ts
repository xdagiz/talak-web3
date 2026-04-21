import { createHash, randomBytes } from 'node:crypto';
import type { RefreshStore, RefreshSession } from '@talak-web3/auth';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export class MockRefreshStore implements RefreshStore {
  private sessions = new Map<string, RefreshSession>();
  private operationLog: Array<{
    operation: 'create' | 'rotate' | 'revoke' | 'lookup';
    address?: string;
    sessionId?: string;
    success: boolean;
    timestamp: number;
  }> = [];

  async create(address: string, chainId: number, ttlMs: number): Promise<{ token: string; session: RefreshSession }> {
    const addr = address.toLowerCase();
    const token = randomBytes(32).toString('base64url');
    const hash = sha256Hex(token);
    const id = randomBytes(16).toString('hex');

    const session: RefreshSession = {
      id,
      address: addr,
      chainId,
      hash,
      expiresAt: Date.now() + ttlMs,
      revoked: false,
    };

    this.sessions.set(hash, session);

    this.operationLog.push({
      operation: 'create',
      address: addr,
      sessionId: id,
      success: true,
      timestamp: Date.now(),
    });

    return { token, session };
  }

  async lookup(token: string): Promise<RefreshSession | null> {
    const session = this.sessions.get(sha256Hex(token)) ?? null;

    const lookupEntry: {
      operation: 'lookup';
      address?: string;
      sessionId?: string;
      success: boolean;
      timestamp: number;
    } = {
      operation: 'lookup',
      success: session !== null,
      timestamp: Date.now(),
    };
    if (session) {
      lookupEntry.address = session.address;
      lookupEntry.sessionId = session.id;
    }
    this.operationLog.push(lookupEntry);

    return session;
  }

  async rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }> {
    const hash = sha256Hex(token);
    const old = this.sessions.get(hash);

    if (!old) {
      this.operationLog.push({
        operation: 'rotate',
        success: false,
        timestamp: Date.now(),
      });
      throw new Error('Refresh session not found');
    }

    if (old.revoked) {
      this.operationLog.push({
        operation: 'rotate',
        address: old.address,
        sessionId: old.id,
        success: false,
        timestamp: Date.now(),
      });
      throw new Error('Refresh token already used or revoked');
    }

    if (Date.now() > old.expiresAt) {
      this.operationLog.push({
        operation: 'rotate',
        address: old.address,
        sessionId: old.id,
        success: false,
        timestamp: Date.now(),
      });
      throw new Error('Refresh token expired');
    }

    this.sessions.set(hash, { ...old, revoked: true });

    const result = await this.create(old.address, old.chainId, ttlMs);

    this.operationLog.push({
      operation: 'rotate',
      address: old.address,
      sessionId: result.session.id,
      success: true,
      timestamp: Date.now(),
    });

    return result;
  }

  async revoke(token: string): Promise<void> {
    const hash = sha256Hex(token);
    const session = this.sessions.get(hash);

    if (session) {
      this.sessions.set(hash, { ...session, revoked: true });

      this.operationLog.push({
        operation: 'revoke',
        address: session.address,
        sessionId: session.id,
        success: true,
        timestamp: Date.now(),
      });
    } else {
      this.operationLog.push({
        operation: 'revoke',
        success: false,
        timestamp: Date.now(),
      });
    }
  }

  getSessionsForAddress(address: string): RefreshSession[] {
    const addr = address.toLowerCase();
    return Array.from(this.sessions.values()).filter(s => s.address === addr);
  }

  getOperationLog(): Array<{
    operation: 'create' | 'rotate' | 'revoke' | 'lookup';
    address?: string;
    sessionId?: string;
    success: boolean;
    timestamp: number;
  }> {
    return [...this.operationLog];
  }

  clear(): void {
    this.sessions.clear();
    this.operationLog = [];
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  wasTokenReused(token: string): boolean {
    const hash = sha256Hex(token);
    const session = this.sessions.get(hash);
    return session?.revoked ?? false;
  }
}
