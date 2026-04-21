import type Redis from 'ioredis';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { RevocationStore } from '../contracts.js';

export interface RevocationMessage {
  type: 'jti_revoked' | 'global_invalidation' | 'key_revoked';
  jti?: string;
  kid?: string;
  timestamp: number;
  sequence: number;
}

export interface RedisRevocationStoreOptions {
  redis: Redis;

  keyPrefix?: string;

  enablePubSub?: boolean;

  cacheMaxSize?: number;

  pubSubDisconnectTimeoutMs?: number;

  strictMode?: boolean;

  waitReplicas?: number;

  waitTimeoutMs?: number;

  readFromPrimary?: boolean;
}

export class RedisRevocationStore implements RevocationStore {
  private readonly redis: Redis;
  private readonly prefix: string;
  private readonly enablePubSub: boolean;
  private readonly cacheMaxSize: number;
  private readonly pubSubDisconnectTimeoutMs: number;

  private readonly revokedCache: Map<string, number> = new Map();
  private globalInvalidationTime: number = 0;
  private lastPubSubMessageAt: number = Date.now();
  private sequenceCounter: number = 0;
  private subscriber: Redis | null = null;

  private readonly strictMode: boolean;

  private readonly waitReplicas: number;
  private readonly waitTimeoutMs: number;
  private readonly readFromPrimary: boolean;

  constructor(opts: RedisRevocationStoreOptions) {
    this.redis = opts.redis;
    this.prefix = opts.keyPrefix ?? 'talak:jti:';
    this.enablePubSub = opts.enablePubSub ?? true;
    this.cacheMaxSize = opts.cacheMaxSize ?? 10000;
    this.pubSubDisconnectTimeoutMs = opts.pubSubDisconnectTimeoutMs ?? 5000;
    this.strictMode = opts.strictMode ?? true;
    this.waitReplicas = opts.waitReplicas ?? 1;
    this.waitTimeoutMs = opts.waitTimeoutMs ?? 100;
    this.readFromPrimary = opts.readFromPrimary ?? true;

    if (this.enablePubSub) {
      this.initializePubSub();
    }
  }

  private key(jti: string): string {
    return `${this.prefix}${jti}`;
  }

  private globalKey(): string {
    return `${this.prefix}global_invalidation`;
  }

  private broadcastChannel(): string {
    return `${this.prefix}broadcast`;
  }

  private initializePubSub(): void {
    try {

      this.subscriber = this.redis.duplicate();

      this.subscriber.on('message', (_channel: string, message: string) => {
        try {
          const revocationMsg: RevocationMessage = JSON.parse(message);
          this.handleRevocationMessage(revocationMsg);
        } catch (err) {
          console.warn('[AUTH] Failed to parse revocation message:', err);
        }
      });

      this.subscriber.subscribe(this.broadcastChannel()).catch(err => {
        console.error('[AUTH] Failed to subscribe to revocation channel:', err);
      });

      this.lastPubSubMessageAt = Date.now();
    } catch (err) {
      console.error('[AUTH] Failed to initialize Pub/Sub:', err);

    }
  }

  private handleRevocationMessage(msg: RevocationMessage): void {
    this.lastPubSubMessageAt = Date.now();

    switch (msg.type) {
      case 'jti_revoked':
        if (msg.jti) {
          this.revokedCache.set(msg.jti, msg.timestamp);
          this.enforceCacheSize();
        }
        break;
      case 'global_invalidation':
        this.globalInvalidationTime = Math.max(this.globalInvalidationTime, msg.timestamp);
        break;
      case 'key_revoked':

        break;
    }
  }

  private enforceCacheSize(): void {
    if (this.revokedCache.size > this.cacheMaxSize) {

      const entries = Array.from(this.revokedCache.entries());
      entries.sort((a, b) => a[1] - b[1]);
      const toRemove = Math.floor(this.cacheMaxSize * 0.2);
      for (let i = 0; i < toRemove; i++) {
        const entry = entries[i];
        if (entry) {
          this.revokedCache.delete(entry[0]);
        }
      }
    }
  }

  private isPubSubHealthy(): boolean {
    if (!this.enablePubSub || !this.subscriber) return true;
    return (Date.now() - this.lastPubSubMessageAt) < this.pubSubDisconnectTimeoutMs;
  }

  private async publishRevocation(msg: RevocationMessage): Promise<void> {
    if (!this.enablePubSub) return;

    try {
      this.sequenceCounter++;
      msg.sequence = this.sequenceCounter;
      await this.redis.publish(this.broadcastChannel(), JSON.stringify(msg));
    } catch (err) {
      console.warn('[AUTH] Failed to publish revocation message:', err);
    }
  }

  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    const ttl = Math.max(1, expiresAtMs - Date.now());
    try {

      await this.redis.set(this.key(jti), '1', 'PX', ttl);

      const replicasAcknowledged = await this.redis.wait(
        this.waitReplicas,
        this.waitTimeoutMs
      ) as number;

      if (replicasAcknowledged < this.waitReplicas) {
        console.error(
          '[AUTH] CRITICAL: Revocation replication acknowledgment failed',
          { expected: this.waitReplicas, actual: replicasAcknowledged }
        );

      }

      this.revokedCache.set(jti, Date.now());
      this.enforceCacheSize();

      await this.publishRevocation({
        type: 'jti_revoked',
        jti,
        timestamp: Date.now(),
        sequence: 0,
      });
    } catch (err) {
      throw new TalakWeb3Error('Redis revocation store failure', {
        code: 'AUTH_REDIS_REVOCATION_ERROR',
        status: 503,
        cause: err,
      });
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    try {

      if (this.revokedCache.has(jti)) {
        return true;
      }

      const v = await this.redis.get(this.key(jti));
      if (v !== null) {

        this.revokedCache.set(jti, Date.now());
        return true;
      }

      return false;
    } catch (err) {

      if (this.strictMode) {
        throw new TalakWeb3Error('Redis revocation store unreachable — failing closed (CP mode)', {
          code: 'AUTH_REDIS_REVOCATION_ERROR',
          status: 503,
          cause: err,
        });
      }

      console.error('[AUTH] CRITICAL: Redis unreachable — rejecting token to be safe:', err);
      return true;
    }
  }

  async setGlobalInvalidationTime(timestampSeconds: number): Promise<void> {
    try {

      await this.redis.set(this.globalKey(), timestampSeconds.toString());

      this.globalInvalidationTime = Math.max(this.globalInvalidationTime, timestampSeconds);

      await this.publishRevocation({
        type: 'global_invalidation',
        timestamp: timestampSeconds,
        sequence: 0,
      });
    } catch (err) {
      throw new TalakWeb3Error('Redis revocation store failure', {
        code: 'AUTH_REDIS_REVOCATION_ERROR',
        status: 503,
        cause: err,
      });
    }
  }

  async getGlobalInvalidationTime(): Promise<number> {
    try {

      const v = await this.redis.get(this.globalKey());
      const timestamp = v ? parseInt(v, 10) : 0;

      if (timestamp > 0) {
        this.globalInvalidationTime = Math.max(this.globalInvalidationTime, timestamp);
      }

      return this.globalInvalidationTime;
    } catch (err) {

      if (this.strictMode) {
        throw new TalakWeb3Error('Redis revocation store unreachable — failing closed (CP mode)', {
          code: 'AUTH_REDIS_REVOCATION_ERROR',
          status: 503,
          cause: err,
        });
      }

      console.error('[AUTH] CRITICAL: Redis unreachable — assuming global invalidation:', err);
      return Math.floor(Date.now() / 1000);
    }
  }

  async close(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(this.broadcastChannel());
      this.subscriber.quit();
      this.subscriber = null;
    }
  }
}
