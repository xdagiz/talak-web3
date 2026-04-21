import type Redis from 'ioredis';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { RefreshSession, RefreshStore } from '../contracts.js';
import { randomId, randomToken, sha256Hex } from './crypto.js';

export interface RedisRefreshStoreOptions {
  redis: Redis;
  keyPrefix?: string;

  maxRotateAttempts?: number;
}

export class RedisRefreshStore implements RefreshStore {
  private readonly redis: Redis;
  private readonly prefix: string;
  private readonly maxRotateAttempts: number;

  constructor(opts: RedisRefreshStoreOptions) {
    this.redis = opts.redis;
    this.prefix = opts.keyPrefix ?? 'talak:rt:';
    this.maxRotateAttempts = opts.maxRotateAttempts ?? 8;
  }

  private keyFromHash(hash: string): string {
    return `${this.prefix}${hash}`;
  }

  async create(
    address: string,
    chainId: number,
    ttlMs: number,
  ): Promise<{ token: string; session: RefreshSession }> {
    const addr = address.toLowerCase();
    const token = randomToken();
    const hash = sha256Hex(token);
    const id = randomId();
    const session: RefreshSession = {
      id,
      address: addr,
      chainId,
      hash,
      expiresAt: Date.now() + ttlMs,
      revoked: false,
    };
    await this.redis.set(this.keyFromHash(hash), JSON.stringify(session), 'PX', ttlMs);
    return { token, session };
  }

  async lookup(token: string): Promise<RefreshSession | null> {
    const hash = sha256Hex(token);
    const raw = await this.redis.get(this.keyFromHash(hash));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RefreshSession;
    } catch {
      return null;
    }
  }

  async rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }> {
    const oldHash = sha256Hex(token);
    const oldKey = this.keyFromHash(oldHash);

    for (let attempt = 0; attempt < this.maxRotateAttempts; attempt++) {
      await this.redis.watch(oldKey);
      const raw = await this.redis.get(oldKey);
      if (!raw) {
        await this.redis.unwatch();
        throw new TalakWeb3Error('Refresh session not found', { code: 'AUTH_REFRESH_NOT_FOUND', status: 401 });
      }
      let old: RefreshSession;
      try {
        old = JSON.parse(raw) as RefreshSession;
      } catch {
        await this.redis.unwatch();
        throw new TalakWeb3Error('Refresh session not found', { code: 'AUTH_REFRESH_NOT_FOUND', status: 401 });
      }
      if (old.revoked) {
        await this.redis.unwatch();
        throw new TalakWeb3Error('Refresh token already used or revoked', { code: 'AUTH_REFRESH_REVOKED', status: 401 });
      }
      if (Date.now() > old.expiresAt) {
        await this.redis.unwatch();
        throw new TalakWeb3Error('Refresh token expired', { code: 'AUTH_REFRESH_EXPIRED', status: 401 });
      }

      const newToken = randomToken();
      const newHash = sha256Hex(newToken);
      const newKey = this.keyFromHash(newHash);
      const id = randomId();
      const newSession: RefreshSession = {
        id,
        address: old.address,
        chainId: old.chainId,
        hash: newHash,
        expiresAt: Date.now() + ttlMs,
        revoked: false,
      };

      const remainingOld = Math.max(1, old.expiresAt - Date.now());
      const multi = this.redis.multi();
      multi.set(oldKey, JSON.stringify({ ...old, revoked: true }), 'PX', Math.min(remainingOld, 60_000));
      multi.set(newKey, JSON.stringify(newSession), 'PX', ttlMs);
      const res = await multi.exec();
      if (res !== null) {
        return { token: newToken, session: newSession };
      }
    }

    throw new TalakWeb3Error('Refresh rotation conflict — retry', { code: 'AUTH_REFRESH_CONFLICT', status: 409 });
  }

  async revoke(token: string): Promise<void> {
    const hash = sha256Hex(token);
    const key = this.keyFromHash(hash);
    const raw = await this.redis.get(key);
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as RefreshSession;
      const remaining = Math.max(1, session.expiresAt - Date.now());
      await this.redis.set(key, JSON.stringify({ ...session, revoked: true }), 'PX', remaining);
    } catch {

    }
  }
}
