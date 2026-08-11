import type Redis from "ioredis";
import { describe, it, expect } from "vitest";

import { sha256Hex } from "../../stores/crypto.js";
import { RedisRefreshStore } from "../../stores/redis-refresh.js";

class FakeRedis {
  private readonly map = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<"OK"> {
    this.map.set(key, value);
    return "OK";
  }
}

describe("RedisRefreshStore", () => {
  it("create() stores the session under the hashed token key so lookup() finds it", async () => {
    const redis = new FakeRedis();
    const store = new RedisRefreshStore({ redis: redis as unknown as Redis });
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const chainId = 1;
    const ttlMs = 7 * 24 * 60 * 60 * 1000;

    const { token, session } = await store.create(address, chainId, ttlMs);

    expect(typeof session.hash).toBe("string");
    expect(session.hash).toBe(await sha256Hex(token));

    const found = await store.lookup(token);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(session.id);
    expect(found!.address).toBe(address.toLowerCase());
    expect(found!.chainId).toBe(chainId);
  });
});
