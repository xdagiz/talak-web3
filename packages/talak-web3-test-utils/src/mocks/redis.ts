import type { MockRedisOperations } from '../types.js';

export class MockRedis implements MockRedisOperations {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private luaScripts = new Map<string, (keys: string[], args: string[]) => unknown>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    const entry = expiresAt === undefined ? { value } : { value, expiresAt };
    this.store.set(key, entry);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {

    if (script.includes('nonce') && script.includes('del')) {
      return this.executeNonceConsumption(keys[0] ?? '', args[0] ?? '');
    }

    return 0;
  }

  private executeNonceConsumption(key: string, nonce: string): number {
    const fullKey = `${key}:${nonce}`;
    const entry = this.store.get(fullKey);

    if (!entry) return 0;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(fullKey);
      return 0;
    }

    this.store.delete(fullKey);
    return 1;
  }

  registerLuaScript(name: string, handler: (keys: string[], args: string[]) => unknown): void {
    this.luaScripts.set(name, handler);
  }

  async flushall(): Promise<void> {
    this.store.clear();
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  async exists(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return 0;
    }

    return 1;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;

    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async dbsize(): Promise<number> {
    return this.store.size;
  }

  private isConnected = true;

  disconnect(): void {
    this.isConnected = false;
  }

  connect(): void {
    this.isConnected = true;
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Redis connection lost');
    }
  }
}

export function createMockRedis(): MockRedis {
  return new MockRedis();
}
