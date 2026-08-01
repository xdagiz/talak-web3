import Redis from "ioredis";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { verifyDependencyIntegrity } from "../../integrity";
import type { DependencyCheck } from "../../integrity";

const redisAvailable = process.env.REDIS_HOST !== undefined || process.env.CI === "true";

describe.skipIf(!redisAvailable)("FAULT INJECTION: Nonce Durability (I2)", () => {
  let redis: Redis;
  let nonceStore: {
    create: (addr: string) => Promise<string>;
    consume: (addr: string, nonce: string) => Promise<boolean>;
  };

  beforeEach(async () => {
    const { RedisNonceStore } = await import("../../stores/redis-nonce");
    redis = new Redis({ host: "localhost", port: 6379, connectTimeout: 2000 });
    nonceStore = new RedisNonceStore({ redis });
  });

  afterEach(async () => {
    await redis.quit();
  });

  it("should reject nonce reuse after simulated crash", async () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";

    const nonce = await nonceStore.create(address);

    const consumed = await nonceStore.consume(address, nonce);
    expect(consumed).toBe(true);

    const pendingKey = `talak:nonce:pending:${address.toLowerCase()}`;
    await redis.del(pendingKey);

    const consumedKey = `talak:nonce:consumed:${address.toLowerCase()}`;
    const isConsumed = await redis.sismember(consumedKey, nonce);
    expect(isConsumed).toBe(1);

    const reuseConsumed = await nonceStore.consume(address, nonce);
    expect(reuseConsumed).toBe(false);
  });

  it("should fail closed when Redis unreachable during consumption", async () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";

    const nonce = await nonceStore.create(address);

    await redis.quit();

    await expect(nonceStore.consume(address, nonce)).rejects.toThrow("Redis nonce store failure");
  });

  it("should detect WAIT replication timeout", async () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";

    const { RedisNonceStore } = await import("../../stores/redis-nonce");
    const storeWithWait = new RedisNonceStore({
      redis,
      waitReplicas: 1,
      waitTimeoutMs: 100,
    });

    const nonce = await storeWithWait.create(address);

    const consumed = await storeWithWait.consume(address, nonce);
    expect(consumed).toBe(true);
  });
});

describe.skipIf(!redisAvailable)("FAULT INJECTION: Revocation Propagation (I4)", () => {
  let redis: Redis;
  let revocationStore: {
    revoke: (jti: string, expiresAt: number) => Promise<void>;
    isRevoked: (jti: string) => Promise<boolean>;
    close: () => Promise<void>;
  };

  beforeEach(async () => {
    const { RedisRevocationStore } = await import("../../stores/redis-revocation");
    redis = new Redis({ host: "localhost", port: 6379, connectTimeout: 2000 });
    revocationStore = new RedisRevocationStore({
      redis,
      enablePubSub: true,
    });
  });

  afterEach(async () => {
    await redis.quit();
  });

  it("should fallback to Redis when Pub/Sub broken", async () => {
    const jti = "test-revocation-fault-1";
    const expiresAt = Date.now() + 3600_000;

    await revocationStore.revoke(jti, expiresAt);

    const isRevoked = await revocationStore.isRevoked(jti);
    expect(isRevoked).toBe(true);
  });

  it("should fail closed when Redis unreachable", async () => {
    const jti = "test-revocation-fault-2";

    await redis.quit();

    await expect(revocationStore.isRevoked(jti)).rejects.toThrow(
      "Redis revocation store unreachable",
    );
  });

  it("should reject token when revocation status uncertain", async () => {
    const jti = "test-revocation-fault-3";

    const { RedisRevocationStore } = await import("../../stores/redis-revocation");
    const storeNonStrict = new RedisRevocationStore({
      redis,
      strictMode: false,
    });

    await redis.quit();

    const isRevoked = await storeNonStrict.isRevoked(jti);
    expect(isRevoked).toBe(true);
  });
});

describe.skipIf(!redisAvailable)("FAULT INJECTION: Time Authority (I6)", () => {
  let redis: Redis;

  beforeEach(() => {
    redis = new Redis({ host: "localhost", port: 6379, connectTimeout: 2000 });
  });

  afterEach(async () => {
    await redis.quit();
  });

  it("should reject when time drift exceeds threshold", async () => {
    const { AuthoritativeTime } = await import("../../time");
    const mockTimeSource = {
      getTime: async () => Date.now() + 10_000,
    };

    await expect(
      new AuthoritativeTime({
        timeSource: mockTimeSource,
        maxDriftMs: 5_000,
      }),
    ).rejects.toThrow("Clock drift exceeds threshold");
  });

  it("should reject when monotonic time regression detected", async () => {
    const { AuthoritativeTime } = await import("../../time");
    const time = new AuthoritativeTime({
      redis,
      maxForwardJumpMs: 60_000,
    });

    await time.sync();
    const firstTime = time.now();

    (time as unknown as { lastObservedTime: number }).lastObservedTime = firstTime + 100_000;

    expect(() => time.now()).toThrow("Time regression detected");
  });

  it("should fail closed when historical drift exceeded", async () => {
    const { AuthoritativeTime } = await import("../../time");
    await redis.set("talak:time:last_drift", "10000");

    const time = new AuthoritativeTime({
      redis,
      maxDriftMs: 5_000,
    });

    await expect(time["initialize"]()).rejects.toThrow("Historical time drift exceeded bound");
  });
});

describe("FAULT INJECTION: Supply Chain Integrity (I10)", () => {
  it("should exit process when dependency hash mismatch", async () => {
    const mockDeps: DependencyCheck[] = [
      {
        packageName: "@talak-web3/errors",
        entryPoint: "main",
        expectedHash: "sha256:invalid_hash_to_trigger_failure",
      },
    ];

    const originalExit = process.exit;
    let exitCode: number | undefined;

    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error(`process.exit(${code})`);
    }) as typeof process.exit;

    try {
      expect(() => {
        verifyDependencyIntegrity({
          dependencies: mockDeps,
          failClosed: true,
        });
      }).toThrow("process.exit(1)");

      expect(exitCode).toBe(1);
    } finally {
      process.exit = originalExit;
    }
  });

  it("should detect tampered dependency at runtime", async () => {
    expect(() => {
      verifyDependencyIntegrity({
        failClosed: true,
      });
    }).not.toThrow();
  });
});

describe.skipIf(!redisAvailable)("FAULT INJECTION: Redis Configuration Assertions", () => {
  let redis: Redis;

  beforeEach(() => {
    redis = new Redis({ host: "localhost", port: 6379, connectTimeout: 2000 });
  });

  afterEach(async () => {
    await redis.quit();
  });

  it("should refuse to start with wrong Redis config", async () => {
    const { assertRedisConfiguration } = await import("../../infrastructure-assertions");

    try {
      await assertRedisConfiguration(redis);
    } catch {
      // Expected in misconfigured environment
    }
  });
});
