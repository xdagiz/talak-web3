import type { RevocationStore } from "@talak-web3/auth";
import type { RedisClientType } from "redis";

const DEFAULT_PREFIX = "talak:jti:";

export class RedisRevocationStore implements RevocationStore {
  private prefix: string;

  constructor(
    private redis: RedisClientType,
    options?: { keyPrefix?: string },
  ) {
    this.prefix = options?.keyPrefix ?? DEFAULT_PREFIX;
  }

  private key(jti: string): string {
    return `${this.prefix}${jti}`;
  }

  private globalKey(): string {
    return `${this.prefix}global_invalidation`;
  }

  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    const key = this.key(jti);
    const multi = this.redis.multi();
    multi.set(key, "1");
    multi.expireAt(key, Math.ceil(expiresAtMs / 1000));
    await multi.exec();
  }

  async isRevoked(jti: string): Promise<boolean> {
    const result = await this.redis.exists(this.key(jti));
    return result === 1;
  }

  async setGlobalInvalidationTime(timestampSeconds: number): Promise<void> {
    await this.redis.set(this.globalKey(), String(timestampSeconds));
  }

  async getGlobalInvalidationTime(): Promise<number> {
    const result = await this.redis.get(this.globalKey());
    return result ? Number(result) : 0;
  }
}
