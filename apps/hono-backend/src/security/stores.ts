import type { RedisClientType } from 'redis';
import { createHash, randomBytes } from 'node:crypto';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { NonceStore, RefreshStore, RefreshSession } from '@talak-web3/auth';

export type { NonceStore, RefreshStore, RefreshSession };

export interface NonceRecord {
  address: string;
  nonce: string;
  expiresAt: number;
  consumed: boolean;
  ip?: string;
  ua?: string;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export class RedisNonceStore implements NonceStore {
  constructor(
    private readonly redis: RedisClientType,
    private readonly ttlMs: number,
  ) {
    if (ttlMs > 5 * 60_000) {
      console.warn('[RedisNonceStore] ttlMs exceeds 5 minutes — clamping to 5 minutes for security.');
      this.ttlMs = 5 * 60_000;
    }
  }

  async create(address: string, meta?: { ip?: string; ua?: string }): Promise<string> {
    try {
      if (!this.redis.isOpen) throw new Error('Redis not open');
      const nonce = randomBytes(16).toString('hex');
      const now = Date.now();
      const expiresAt = now + this.ttlMs;
      const key = `nonce:${address.toLowerCase()}:${nonce}`;

      await this.redis.multi()
        .hSet(key, {
          address: address.toLowerCase(),
          nonce,
          expiresAt: String(expiresAt),
          consumed: '0',
          ip: meta?.ip ?? '',
          ua: meta?.ua ?? '',
        })
        .pExpire(key, this.ttlMs)
        .exec();
      return nonce;
    } catch (err) {
      throw new TalakWeb3Error('INFRA_UNAVAILABLE: Failed to create nonce', {
        code: 'INFRA_UNAVAILABLE',
        status: 503,
        cause: err,
      });
    }
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    try {
      if (!this.redis.isOpen) throw new Error('Redis not open');
      const key = `nonce:${address.toLowerCase()}:${nonce}`;

      const lua = `
        local time = redis.call('TIME')
        local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

        local data = redis.call('HGETALL', KEYS[1])
        if next(data) == nil then return 0 end

        local expiresAt = tonumber(redis.call('HGET', KEYS[1], 'expiresAt'))
        local consumed = redis.call('HGET', KEYS[1], 'consumed')

        if consumed == '1' then return 0 end
        if expiresAt < now then
          redis.call('DEL', KEYS[1])
          return 0
        end

        redis.call('HSET', KEYS[1], 'consumed', '1')
        return 1
      `;

      const res = await this.redis.eval(lua, { keys: [key] }) as unknown;
      return Number(res) === 1;
    } catch (err) {
      throw new TalakWeb3Error('INFRA_UNAVAILABLE: Failed to consume nonce', {
        code: 'INFRA_UNAVAILABLE',
        status: 503,
        cause: err,
      });
    }
  }
}

export class RedisRefreshStore implements RefreshStore {
  constructor(private readonly redis: RedisClientType) {}

  private makeToken(): string {
    return randomBytes(32).toString('base64url');
  }

  async create(address: string, chainId: number, ttlMs: number): Promise<{ token: string; session: RefreshSession }> {
    try {
      if (!this.redis.isOpen) throw new Error('Redis not open');
      const token = this.makeToken();
      const hash = sha256Hex(token);
      const id = randomBytes(16).toString('hex');
      const expiresAt = Date.now() + ttlMs;
      const key = `refresh:${hash}`;

      const session: RefreshSession = {
        id,
        address: address.toLowerCase(),
        chainId,
        hash,
        expiresAt,
        revoked: false,
      };

      await this.redis.multi()
        .hSet(key, {
          id,
          address: session.address,
          chainId: String(chainId),
          hash,
          expiresAt: String(expiresAt),
          revoked: '0',
        })
        .pExpire(key, ttlMs)
        .exec();
      return { token, session };
    } catch (err) {
      throw new TalakWeb3Error('INFRA_UNAVAILABLE: Failed to create refresh token', {
        code: 'INFRA_UNAVAILABLE',
        status: 503,
        cause: err,
      });
    }
  }

  async lookup(token: string): Promise<RefreshSession | null> {
    try {
      if (!this.redis.isOpen) throw new Error('Redis not open');
      const hash = sha256Hex(token);
      const key = `refresh:${hash}`;
      const data = await this.redis.hGetAll(key);
      if (!data || Object.keys(data).length === 0) return null;

      return {
        id: data['id'] ?? '',
        address: (data['address'] ?? '').toLowerCase(),
        chainId: Number(data['chainId'] ?? '1'),
        hash: data['hash'] ?? hash,
        expiresAt: Number(data['expiresAt'] ?? '0'),
        revoked: (data['revoked'] ?? '0') === '1',
      };
    } catch (err) {
      throw new TalakWeb3Error('INFRA_UNAVAILABLE: Failed to lookup refresh token', {
        code: 'INFRA_UNAVAILABLE',
        status: 503,
        cause: err,
      });
    }
  }

  async rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }> {
    try {
      if (!this.redis.isOpen) throw new Error('Redis not open');
      const oldHash = sha256Hex(token);
      const oldKey = `refresh:${oldHash}`;

      const newToken = this.makeToken();
      const newHash = sha256Hex(newToken);
      const newKey = `refresh:${newHash}`;
      const newId = randomBytes(16).toString('hex');

      const monolithicLua = `
        local time = redis.call('TIME')
        local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

        local oldData = redis.call('HGETALL', KEYS[1])
        if next(oldData) == nil then return 0 end

        local oldRevoked = redis.call('HGET', KEYS[1], 'revoked')
        local oldExpiresAt = tonumber(redis.call('HGET', KEYS[1], 'expiresAt'))

        if oldRevoked == '1' or oldExpiresAt < now then
          return 0
        end

        -- Fetch required data from old session
        local address = redis.call('HGET', KEYS[1], 'address')
        local chainId = redis.call('HGET', KEYS[1], 'chainId')

        -- Revoke old
        redis.call('HSET', KEYS[1], 'revoked', '1')

        -- Create new
        local newExpiresAt = now + tonumber(ARGV[1])
        redis.call('HMSET', KEYS[2],
          'id', ARGV[2],
          'address', address,
          'chainId', chainId,
          'hash', ARGV[3],
          'expiresAt', tostring(newExpiresAt),
          'revoked', '0'
        )
        redis.call('PEXPIRE', KEYS[2], ARGV[1])

        return {tostring(newExpiresAt), address, chainId}
      `;

      const res = await this.redis.eval(monolithicLua, {
        keys: [oldKey, newKey],
        arguments: [String(ttlMs), newId, newHash]
      }) as unknown;

      if (!res || res === 0) {
        throw new Error('refresh token already used, revoked, or expired');
      }

      const [newExpiresAt, address, chainId] = res as [string, string, string];

      const session: RefreshSession = {
        id: newId,
        address: address.toLowerCase(),
        chainId: Number(chainId),
        hash: newHash,
        expiresAt: Number(newExpiresAt),
        revoked: false,
      };

      return { token: newToken, session };
    } catch (err) {
      if (err instanceof TalakWeb3Error && err.status === 401) throw err;
      throw new TalakWeb3Error('INFRA_UNAVAILABLE: Failed to rotate refresh token', {
        code: 'INFRA_UNAVAILABLE',
        status: 503,
        cause: err,
      });
    }
  }

  async revoke(token: string): Promise<void> {
    try {
      if (!this.redis.isOpen) throw new Error('Redis not open');
      const hash = sha256Hex(token);
      const key = `refresh:${hash}`;
      await this.redis.hSet(key, { revoked: '1' });
    } catch (err) {
      throw new TalakWeb3Error('INFRA_UNAVAILABLE: Failed to revoke refresh token', {
        code: 'INFRA_UNAVAILABLE',
        status: 503,
        cause: err,
      });
    }
  }
}
