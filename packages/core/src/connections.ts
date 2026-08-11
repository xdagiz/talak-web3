import Redis, { type RedisOptions } from "ioredis";

function getEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

const IOREDIS = "ioredis";

async function loadRedis(): Promise<typeof import("ioredis").default> {
  const mod = (await import(/* @vite-ignore */ IOREDIS)) as typeof import("ioredis");
  return mod.default;
}

export const HARDENED_REDIS_OPTS: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
  reconnectOnError: (err: Error) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) return true;
    return false;
  },
  enableReadyCheck: true,
  maxLoadingRetryTime: 10000,
  connectTimeout: 5000,
};

function safeDbIndex(envVar: string | undefined, fallback: number): number {
  if (!envVar) return fallback;
  const n = Number(envVar);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 15) {
    throw new Error(`Invalid Redis DB index: ${envVar}. Must be integer 0-15.`);
  }
  return n;
}

export class ConnectionManager {
  private static redisInstances = new Map<string, Redis>();
  private static shutdownRegistered = false;

  /**
   * Get or create a Redis connection.
   *
   * @param purpose - The purpose label for this connection.
   * @param redisUrl - Optional Redis URL override. If not provided, falls back to REDIS_URL env var or "redis://localhost:6379".
   */
  static async getRedis(
    purpose: "sessions" | "rate-limit" | "revocation" = "sessions",
    redisUrl?: string,
  ): Promise<Redis> {
    const Redis = await loadRedis();
    const baseUrl = redisUrl || getEnv("REDIS_URL") || "redis://localhost:6379";
    const dbMap: Record<string, number> = {
      sessions: safeDbIndex(getEnv("REDIS_DB_SESSIONS"), 0),
      "rate-limit": safeDbIndex(getEnv("REDIS_DB_RATE_LIMIT"), 1),
      revocation: safeDbIndex(getEnv("REDIS_DB_REVOCATION"), 2),
    };

    const db = dbMap[purpose] ?? 0;
    const instanceKey = `${baseUrl}:${db}`;

    const existing = this.redisInstances.get(instanceKey);
    if (existing) {
      return existing;
    }

    if (!ConnectionManager.shutdownRegistered) {
      ConnectionManager.shutdownRegistered = true;
      if (typeof process !== "undefined" && typeof process.on === "function") {
        process.on("exit", () => {
          for (const r of ConnectionManager.redisInstances.values()) {
            try {
              r.disconnect();
            } catch {
              continue;
            }
          }
        });
      }
    }

    const options: RedisOptions = {
      ...HARDENED_REDIS_OPTS,
      db,
    };

    if (baseUrl.startsWith("rediss://")) {
      options.tls = {};
    }

    const client = new Redis(baseUrl, options);

    client.on("error", (err: Error) => {
      console.error(`[talak-web3] Redis error (${purpose}):`, err.message);
    });

    this.redisInstances.set(instanceKey, client);
    return client;
  }

  static async shutdown(): Promise<void> {
    if (this.redisInstances.size === 0) return;
    const closes = Array.from(this.redisInstances.values()).map((r) => r.quit());
    await Promise.all(closes);
    this.redisInstances.clear();
  }
}
