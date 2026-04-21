import { TalakWeb3Error } from '@talak-web3/errors';
import type Redis from 'ioredis';

export interface TimeSource {

  getTime(): Promise<number>;
}

export class HttpTimeSource implements TimeSource {
  private urls: string[];
  private timeoutMs: number;

  constructor(opts: { urls?: string[]; timeoutMs?: number } = {}) {
    this.urls = opts.urls ?? [
      'https://time.cloudflare.com/cdn-cgi/trace',
      'https://www.google.com/',
    ];
    this.timeoutMs = opts.timeoutMs ?? 3000;
  }

  async getTime(): Promise<number> {
    const errors: Error[] = [];

    for (const url of this.urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          return new Date(dateHeader).getTime();
        }

        if (url.includes('cloudflare.com')) {
          const text = await response.text();
          const tsMatch = text.match(/ts=(\d+)/);
          if (tsMatch && tsMatch[1]) {
            return parseInt(tsMatch[1], 10) * 1000;
          }
        }
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));

      }
    }

    throw new TalakWeb3Error(
      `All time sources failed: ${errors.map(e => e.message).join(', ')}`,
      {
        code: 'AUTH_TIME_SOURCE_UNAVAILABLE',
        status: 503,
      }
    );
  }
}

export class AuthoritativeTime {
  private offsetMs: number = 0;
  private lastSyncAt: number = 0;
  private syncIntervalMs: number;
  private maxDriftMs: number;
  private timeSource: TimeSource;
  private syncInProgress: boolean = false;

  private lastObservedTime: number = 0;
  private maxForwardJumpMs: number;

  private redisClient: Redis | null = null;
  private readonly monotonicFloorKey: string;
  private initialized = false;

  private readonly lastDriftKey: string;
  private maxHistoricalDriftMs: number = 0;

  constructor(opts: {
    timeSource?: TimeSource;
    syncIntervalMs?: number;
    maxDriftMs?: number;
    maxForwardJumpMs?: number;
    redis?: Redis | null;
    monotonicFloorKey?: string;
    lastDriftKey?: string;
  } = {}) {
    this.timeSource = opts.timeSource ?? new HttpTimeSource();
    this.syncIntervalMs = opts.syncIntervalMs ?? 60_000;
    this.maxDriftMs = opts.maxDriftMs ?? 5_000;
    this.maxForwardJumpMs = opts.maxForwardJumpMs ?? 60_000;
    this.redisClient = opts.redis ?? null;
    this.monotonicFloorKey = opts.monotonicFloorKey ?? 'talak:time:monotonic_floor';
    this.lastDriftKey = opts.lastDriftKey ?? 'talak:time:last_drift';

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {

      if (this.redisClient) {
        const floorStr = await this.redisClient.get(this.monotonicFloorKey);
        if (floorStr) {
          this.lastObservedTime = parseInt(floorStr, 10);
        }

        const driftStr = await this.redisClient.get(this.lastDriftKey);
        if (driftStr) {
          this.maxHistoricalDriftMs = parseInt(driftStr, 10);

          if (this.maxHistoricalDriftMs > this.maxDriftMs) {
            throw new TalakWeb3Error(
              `Historical time drift exceeded bound: ${this.maxHistoricalDriftMs}ms > ${this.maxDriftMs}ms — possible clock attack or misconfiguration`,
              { code: 'AUTH_TIME_HISTORICAL_DRIFT', status: 503 }
            );
          }
        }
      }

      await this.sync();
      this.initialized = true;
    } catch (err) {

      console.error('[AUTH] CRITICAL: Time initialization failed:', err);
      throw err;
    }
  }

  now(): number {
    const localNow = Date.now();
    const correctedTime = localNow + this.offsetMs;

    if (correctedTime < this.lastObservedTime) {
      throw new TalakWeb3Error(
        `Time regression detected: ${correctedTime} < ${this.lastObservedTime} — possible clock manipulation`,
        {
          code: 'AUTH_TIME_REGRESSION',
          status: 503,
        }
      );
    }

    if (correctedTime - this.lastObservedTime > this.maxForwardJumpMs) {
      throw new TalakWeb3Error(
        `Time jump exceeds bound: ${correctedTime - this.lastObservedTime}ms > ${this.maxForwardJumpMs}ms — possible clock attack`,
        {
          code: 'AUTH_TIME_JUMP',
          status: 503,
        }
      );
    }

    this.lastObservedTime = correctedTime;

    if (this.redisClient) {
      this.redisClient.set(
        this.monotonicFloorKey,
        correctedTime.toString(),
        'EX',
        86400
      ).catch(err => {
        console.warn('[AUTH] Failed to persist monotonic floor:', err);
      });

      const currentDrift = Math.abs(this.offsetMs);
      this.redisClient.set(
        this.lastDriftKey,
        currentDrift.toString(),
        'EX',
        86400
      ).catch(err => {
        console.warn('[AUTH] Failed to persist time drift:', err);
      });

      if (currentDrift > this.maxHistoricalDriftMs) {
        this.maxHistoricalDriftMs = currentDrift;
      }
    }

    if (localNow - this.lastSyncAt > this.syncIntervalMs && !this.syncInProgress) {
      this.sync().catch(err => {
        console.warn('[AUTH] Time synchronization failed:', err);
      });
    }

    return correctedTime;
  }

  async sync(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      const localBefore = Date.now();
      const remoteTime = await this.timeSource.getTime();
      const localAfter = Date.now();

      const roundTripMs = localAfter - localBefore;
      const estimatedLocalTime = localBefore + (roundTripMs / 2);
      const newOffset = remoteTime - estimatedLocalTime;

      if (Math.abs(newOffset) > this.maxDriftMs) {
        throw new TalakWeb3Error(
          `Clock drift exceeds threshold: ${newOffset}ms (max: ${this.maxDriftMs}ms) - possible time attack`,
          {
            code: 'AUTH_CLOCK_DRIFT',
            status: 503,
          }
        );
      }

      this.offsetMs = newOffset;
      this.lastSyncAt = Date.now();
    } finally {
      this.syncInProgress = false;
    }
  }

  getOffset(): number {
    return this.offsetMs;
  }

  getLastSyncAt(): number {
    return this.lastSyncAt;
  }

  getLastObservedTime(): number {
    return this.lastObservedTime;
  }
}

let globalAuthoritativeTime: AuthoritativeTime | null = null;

export function getAuthoritativeTime(): AuthoritativeTime {
  if (!globalAuthoritativeTime) {
    globalAuthoritativeTime = new AuthoritativeTime();
  }
  return globalAuthoritativeTime;
}

export function setAuthoritativeTime(instance: AuthoritativeTime): void {
  globalAuthoritativeTime = instance;
}
