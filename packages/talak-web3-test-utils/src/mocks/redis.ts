/**
 * Mock Redis implementation for testing
 */

import type { MockRedisOperations } from '../types.js';

/**
 * Mock Redis store for testing
 * Simulates Redis operations in memory
 */
export class MockRedis implements MockRedisOperations {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private luaScripts = new Map<string, (keys: string[], args: string[]) => unknown>();

  /**
   * Get a value from the store
   */
  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Set a value in the store with optional TTL
   */
  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    const entry = expiresAt === undefined ? { value } : { value, expiresAt };
    this.store.set(key, entry);
  }

  /**
   * Delete a key from the store
   */
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Execute a Lua script
   * Supports atomic nonce consumption pattern
   */
  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    // Check for nonce consumption pattern
    if (script.includes('nonce') && script.includes('del')) {
      return this.executeNonceConsumption(keys[0] ?? '', args[0] ?? '');
    }
    
    // Default: return 0 (failure)
    return 0;
  }

  /**
   * Execute atomic nonce consumption
   * Returns 1 if nonce existed and was deleted, 0 otherwise
   */
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

  /**
   * Register a custom Lua script handler
   */
  registerLuaScript(name: string, handler: (keys: string[], args: string[]) => unknown): void {
    this.luaScripts.set(name, handler);
  }

  /**
   * Clear all data from the store
   */
  async flushall(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return 0;
    }
    
    return 1;
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  /**
   * Get the number of keys in the store
   */
  async dbsize(): Promise<number> {
    return this.store.size;
  }

  /**
   * Simulate Redis being down
   */
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

/**
 * Create a new MockRedis instance
 */
export function createMockRedis(): MockRedis {
  return new MockRedis();
}
