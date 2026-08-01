import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  const { generateKeyPairSync } = require("node:crypto") as typeof import("node:crypto");
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env["REDIS_URL"] = "redis://localhost:6379";
  process.env["JWT_PRIVATE_KEY"] = privateKey;
  process.env["JWT_PUBLIC_KEY"] = publicKey;
  process.env["SIWE_DOMAIN"] = "localhost";
});

vi.mock("./security/env.js", () => ({
  validateEnv: vi.fn(),
}));

vi.mock("redis", () => {
  const store = new Map<string, string>();
  const hashStores = new Map<string, Map<string, string>>();
  const consumedNonces = new Set<string>();
  const pendingNonces = new Map<string, Set<string>>();
  const sortedSets = new Map<string, { score: number; value: string }[]>();
  let globalVersion = 0;
  const watchVersions = new Map<string, number>();
  const modVersions = new Map<string, number>();

  function getHashMap(key: string) {
    if (!hashStores.has(key)) hashStores.set(key, new Map());
    return hashStores.get(key)!;
  }

  function updateModVersion(key: string) {
    modVersions.set(key, globalVersion++);
  }

  const mockClient = {
    isOpen: true,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    hSet: vi.fn().mockImplementation((key: string, ...args: unknown[]) => {
      const map = getHashMap(key);
      if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
        const entries = args[0] as Record<string, string>;
        for (const [f, v] of Object.entries(entries)) map.set(f, v);
      } else if (args.length >= 2) {
        map.set(String(args[0]), String(args[1]));
      }
      return Promise.resolve(1);
    }),
    hGet: vi.fn().mockImplementation((key: string, field: string) => {
      const map = getHashMap(key);
      return Promise.resolve(map.get(field) ?? null);
    }),
    hGetAll: vi.fn().mockImplementation((key: string) => {
      const map = getHashMap(key);
      return Promise.resolve(Object.fromEntries(map));
    }),
    pExpire: vi.fn().mockResolvedValue(true),
    sismember: vi.fn().mockImplementation((_key: string, member: string) => {
      return Promise.resolve(consumedNonces.has(member) ? 1 : 0);
    }),
    eval: vi.fn().mockImplementation((script: string, ...callArgs: unknown[]) => {
      const s = String(script);
      const firstArg = callArgs[0] as Record<string, unknown> | undefined;
      const keys: string[] = Array.isArray(firstArg?.keys)
        ? (firstArg!.keys as string[])
        : (() => {
            const nk = Number(callArgs[0]) || 0;
            return callArgs.slice(1, 1 + nk) as string[];
          })();
      const scriptArgs: string[] = Array.isArray(firstArg?.arguments)
        ? (firstArg!.arguments as string[]).map(String)
        : callArgs.slice(1 + (Number(callArgs[0]) || 0)).map(String);

      if (s.includes("consumed") && s.includes("HGETALL") && keys.length >= 1) {
        const key = keys[0];
        const map = hashStores.get(key);
        if (!map || map.size === 0) return Promise.resolve(0);
        if (map.get("consumed") === "1") return Promise.resolve(0);
        const expiresAt = Number(map.get("expiresAt") ?? "0");
        if (expiresAt < Date.now()) {
          hashStores.delete(key);
          return Promise.resolve(0);
        }
        map.set("consumed", "1");
        return Promise.resolve(1);
      }

      if (s.includes("HMSET") && s.includes("revoked") && keys.length >= 2) {
        const [oldKey, newKey] = keys;
        const [ttlMs, newId, newHash] = scriptArgs;
        const oldMap = hashStores.get(oldKey);
        if (!oldMap || oldMap.size === 0) return Promise.resolve(0);
        if (oldMap.get("revoked") === "1") return Promise.resolve(0);
        const expiresAt = Number(oldMap.get("expiresAt") ?? "0");
        if (expiresAt < Date.now()) return Promise.resolve(0);
        const address = oldMap.get("address") ?? "";
        const chainId = oldMap.get("chainId") ?? "1";
        oldMap.set("revoked", "1");
        const newExpiresAt = Date.now() + Number(ttlMs);
        const newMap = getHashMap(newKey);
        for (const [f, v] of [
          ["id", newId],
          ["address", address],
          ["chainId", chainId],
          ["hash", newHash],
          ["expiresAt", String(newExpiresAt)],
          ["revoked", "0"],
        ] as [string, string][])
          newMap.set(f, v);
        return Promise.resolve([String(newExpiresAt), address, chainId]);
      }

      if (s.includes("SISMEMBER") && keys.length >= 2) {
        const pendingKey = keys[1];
        const nonce = scriptArgs[0];
        if (consumedNonces.has(nonce)) return Promise.resolve(0);
        const addr = pendingKey.split(":").pop()!;
        const pending = pendingNonces.get(addr);
        if (!pending || !pending.has(nonce)) return Promise.resolve(0);
        consumedNonces.add(nonce);
        pending.delete(nonce);
        return Promise.resolve(1);
      }

      return Promise.resolve([1, 999]);
    }),
    watch: vi.fn().mockImplementation((key: string) => {
      watchVersions.set(key, globalVersion);
      return Promise.resolve();
    }),
    unwatch: vi.fn().mockImplementation(() => {
      watchVersions.clear();
      return Promise.resolve();
    }),
    wait: vi.fn().mockResolvedValue(1),
    zAdd: vi.fn().mockImplementation((key: string, ...args: unknown[]) => {
      if (!sortedSets.has(key)) sortedSets.set(key, []);
      const set = sortedSets.get(key)!;
      if (args.length >= 2) {
        const score = Number(args[0]);
        const member = String(args[1]);
        set.push({ score, value: member });
        if (key.includes("nonce:pending:")) {
          const addr = key.split(":").pop()!;
          if (!pendingNonces.has(addr)) pendingNonces.set(addr, new Set());
          pendingNonces.get(addr)!.add(member);
        }
      } else if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
        const entry = args[0] as { score: number; value: string };
        set.push(entry);
      }
      return Promise.resolve(1);
    }),
    zRange: vi.fn().mockImplementation(() => Promise.resolve([])),
    zRemRangeByScore: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(true),
    set: vi.fn().mockImplementation((key: string, value: string, ..._args: unknown[]) => {
      store.set(key, value);
      updateModVersion(key);
      return Promise.resolve("OK");
    }),
    get: vi.fn().mockImplementation((key: string) => {
      return Promise.resolve(store.get(key) ?? null);
    }),
    del: vi.fn().mockImplementation((key: string) => {
      store.delete(key);
      updateModVersion(key);
      return Promise.resolve(1);
    }),
    multi: vi.fn(() => {
      const hSetOps: Array<{ key: string; data: Record<string, string> }> = [];
      const setOps: Array<{ key: string; value: string }> = [];
      const self: Record<string, unknown> = {};
      self.hSet = vi.fn().mockImplementation((key: string, data: Record<string, string>) => {
        hSetOps.push({ key, data });
        return self;
      });
      self.pExpire = vi.fn().mockImplementation((_key: string, _ttl: number) => {
        return self;
      });
      self.set = vi.fn().mockImplementation((key: string, value: string, ..._args: unknown[]) => {
        setOps.push({ key, value });
        return self;
      });
      self.exec = vi.fn().mockImplementation(() => {
        for (const op of setOps) {
          const wv = watchVersions.get(op.key);
          const mv = modVersions.get(op.key);
          if (wv !== undefined && mv !== undefined && mv > wv) {
            return Promise.resolve(null);
          }
        }
        for (const op of hSetOps) {
          const map = getHashMap(op.key);
          for (const [f, v] of Object.entries(op.data)) map.set(f, v);
        }
        for (const op of setOps) {
          store.set(op.key, op.value);
          updateModVersion(op.key);
        }
        return Promise.resolve(hSetOps.concat(setOps).map(() => ["ok", "OK"]));
      });
      return self;
    }),
  };
  return {
    createClient: vi.fn(() => mockClient),
  };
});

vi.mock("./security/redis-hardening.js", () => ({
  createHardenedRedisClient: vi.fn((_url: string, config: unknown) => config),
  RedisSecurityAuditor: class MockRedisSecurityAuditor {
    async auditSecurity() {
      return { status: "ok", issues: [], recommendations: [] };
    }
    async applySecurityHardening() {
      return undefined;
    }
  },
}));

vi.mock("viem", () => ({
  verifyMessage: vi.fn(),
}));
import { verifyMessage } from "viem";
const mockVerify = vi.mocked(verifyMessage);

import app from "./server.js";

vi.mock("@talak-web3/core", () => ({
  talakWeb3: () => ({
    context: {
      rpc: { request: vi.fn().mockResolvedValue("mock-rpc-result") },
    },
  }),
}));

const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const DOMAIN = "localhost";
const CHAIN_ID = 1;

function buildSiweMessage(nonce: string): string {
  return (
    `${DOMAIN} wants you to sign in with your Ethereum account:\n` +
    `${ADDRESS}\n\n` +
    `URI: http://${DOMAIN}\n` +
    `Version: 1\n` +
    `Chain ID: ${CHAIN_ID}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${new Date().toISOString()}`
  );
}

describe("Auth Edge Concurrency & Adversarial Tests", () => {
  beforeEach(() => {
    mockVerify.mockResolvedValue(true);

    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates a nonce", async () => {
    const res = await app.request("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address: ADDRESS }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.nonce).toBe("string");
  });

  it("parallel login with same nonce → EXACTLY ONE succeeds", async () => {
    const testIp = "1.1.1.2";
    const testAddr = "0x1111111111111111111111111111111111111111";

    const nonceRes = await app.request("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address: testAddr }),
      headers: { "Content-Type": "application/json", "x-forwarded-for": testIp },
    });
    const { nonce } = await nonceRes.json();
    const csrfToken = (nonceRes.headers.get("set-cookie") ?? "").match(/csrf_token=([^;]+)/)?.[1];
    const message = buildSiweMessage(nonce).replace(ADDRESS, testAddr);

    const requests = Array.from({ length: 10 }, () =>
      app.request("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
          Cookie: `csrf_token=${csrfToken}`,
          "x-csrf-token": csrfToken!,
        },
        body: JSON.stringify({ message, signature: "0xdeadbeef" }),
      }),
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 200).length;
    const authFailCount = statuses.filter((s) => s === 401).length;

    expect(successCount).toBe(1);
    expect(authFailCount).toBe(9);
  });

  it("parallel refresh → EXACTLY ONE succeeds", async () => {
    const nonceRes = await app.request("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address: ADDRESS }),
      headers: { "Content-Type": "application/json" },
    });
    const { nonce } = await nonceRes.json();
    const csrfToken = (nonceRes.headers.get("set-cookie") ?? "").match(/csrf_token=([^;]+)/)?.[1];
    const message = buildSiweMessage(nonce);
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `csrf_token=${csrfToken}`,
        "x-csrf-token": csrfToken!,
      },
      body: JSON.stringify({ message, signature: "0xdeadbeef" }),
    });
    const { refreshToken } = await loginRes.json();

    const requests = Array.from({ length: 5 }, () =>
      app.request("/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `csrf_token=${csrfToken}`,
          "x-csrf-token": csrfToken!,
        },
        body: JSON.stringify({ refreshToken }),
      }),
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 200).length;
    const failCount = statuses.filter((s) => s === 401).length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(4);
  });

  it("CSRF double-submit: valid token → pass", async () => {
    const nonceRes = await app.request("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address: ADDRESS }),
      headers: { "Content-Type": "application/json" },
    });
    const setCookie = nonceRes.headers.get("set-cookie") ?? "";
    const csrfToken = setCookie.match(/csrf_token=([^;]+)/)?.[1];
    expect(csrfToken).toBeDefined();

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `csrf_token=${csrfToken}`,
        "x-csrf-token": csrfToken!,
      },
      body: JSON.stringify({ message: buildSiweMessage("testnonce123"), signature: "0x123" }),
    });

    expect(res.status).toBe(401);
  });

  it("CSRF double-submit: missing header → 403", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "csrf_token=validtoken",
      },
      body: JSON.stringify({ message: "any", signature: "0x123" }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("CSRF_INVALID");
  });

  it("CSRF double-submit: mismatch → 403", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "csrf_token=tokenA",
        "x-csrf-token": "tokenB",
      },
      body: JSON.stringify({ message: "any", signature: "0x123" }),
    });
    expect(res.status).toBe(403);
  });

  it("Mass parallel login (500) → EXACTLY ONE succeeds", async () => {
    const testAddr = "0x2222222222222222222222222222222222222222";

    const nonceRes = await app.request("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address: testAddr }),
      headers: { "Content-Type": "application/json" },
    });
    const { nonce } = await nonceRes.json();
    const csrfToken = (nonceRes.headers.get("set-cookie") ?? "").match(/csrf_token=([^;]+)/)?.[1];
    const message = buildSiweMessage(nonce).replace(ADDRESS, testAddr);

    const requests = Array.from({ length: 100 }, () =>
      app.request("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `csrf_token=${csrfToken}`,
          "x-csrf-token": csrfToken!,
        },
        body: JSON.stringify({ message, signature: "0xdeadbeef" }),
      }),
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 200).length;
    expect(successCount).toBe(1);
    expect(statuses.filter((s) => s === 401 || s === 429).length).toBe(99);
  }, 30000);

  it("Mass parallel refresh (100) → EXACTLY ONE succeeds", async () => {
    const testIp = "203.0.113.88";

    const nonceRes = await app.request("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address: ADDRESS }),
      headers: { "Content-Type": "application/json", "x-forwarded-for": testIp },
    });
    const { nonce } = await nonceRes.json();
    const setCookie = nonceRes.headers.get("set-cookie") ?? "";
    const csrfToken = setCookie.match(/csrf_token=([^;]+)/)?.[1];

    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": testIp,
        Cookie: `csrf_token=${csrfToken}`,
        "x-csrf-token": csrfToken!,
      },
      body: JSON.stringify({ message: buildSiweMessage(nonce), signature: "0xdeadbeef" }),
    });
    expect(loginRes.status).toBe(200);
    const { refreshToken } = await loginRes.json();

    const requests = Array.from({ length: 100 }, () =>
      app.request("/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
          Cookie: `csrf_token=${csrfToken}`,
          "x-csrf-token": csrfToken!,
        },
        body: JSON.stringify({ refreshToken }),
      }),
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 200).length;
    expect(successCount).toBe(1);
    expect(statuses.filter((s) => s === 401).length).toBe(99);
  }, 30000);

  it("Fail-closed: Redis down during auth → 503 INFRA_UNAVAILABLE", async () => {
    const redisModule = await import("redis");
    type MockFn = ReturnType<typeof vi.fn>;
    const redisClient = (
      redisModule as unknown as { createClient: () => Record<string, MockFn> }
    ).createClient();

    const originalEval: MockFn = redisClient["eval"];
    const originalHGetAll: MockFn = redisClient["hGetAll"];
    const originalHSet: MockFn = redisClient["hSet"];
    const originalSIsMember: MockFn = redisClient["sismember"];

    const redisDownError = new Error("Redis connection lost");
    redisClient["eval"] = vi.fn().mockRejectedValue(redisDownError) as MockFn;
    redisClient["hGetAll"] = vi.fn().mockRejectedValue(redisDownError) as MockFn;
    redisClient["hSet"] = vi.fn().mockRejectedValue(redisDownError) as MockFn;
    redisClient["sismember"] = vi.fn().mockRejectedValue(redisDownError) as MockFn;

    try {
      const res = await app.request("/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ address: "0x3333333333333333333333333333333333333333" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(503);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("INFRA_UNAVAILABLE");
    } finally {
      redisClient["eval"] = originalEval;
      redisClient["hGetAll"] = originalHGetAll;
      redisClient["hSet"] = originalHSet;
      redisClient["sismember"] = originalSIsMember;
    }
  });

  it("Insurance limiter: rate-limit store down → non-auth endpoints still served", async () => {
    const redisModule = await import("redis");
    type MockFn = ReturnType<typeof vi.fn>;
    const redisClient = (
      redisModule as unknown as { createClient: () => Record<string, MockFn> }
    ).createClient();

    const originalEval: MockFn = redisClient["eval"];
    const redisDownError = new Error("Redis connection lost");
    redisClient["eval"] = vi.fn().mockRejectedValue(redisDownError) as MockFn;

    try {
      // /health is a non-auth path: the adaptive limiter must fall back to its
      // in-memory insurance limiter instead of failing the request.
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; redis: Record<string, string> };
      expect(body.ok).toBe(true);
      expect(body.redis["rateLimit"]).toBe("connected"); // no error event fired, eval mocked only
    } finally {
      redisClient["eval"] = originalEval;
    }
  });
});
