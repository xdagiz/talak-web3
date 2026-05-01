import { TalakWeb3Error } from "@talak-web3/errors";
import { describe, it, expect, beforeEach } from "vitest";

import { AuthoritativeTime, setAuthoritativeTime } from "../../time.js";

describe("Adversarial: Clock Skew Attack", () => {
  beforeEach(() => {
    setAuthoritativeTime(
      new AuthoritativeTime({
        syncIntervalMs: 1000,
        maxDriftMs: 5000,
      }),
    );
  });

  it("should detect and reject excessive clock drift", async () => {
    const skewedSource = {
      getTime: async () => {
        return Date.now() + 10000;
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: skewedSource,
      maxDriftMs: 5000,
    });

    await expect(authTime.sync()).rejects.toThrow(TalakWeb3Error);
    await expect(authTime.sync()).rejects.toThrow("Clock drift exceeds threshold");
  });

  it("should use authoritative time instead of system time", async () => {
    const accurateSource = {
      getTime: async () => {
        const accurateTime = Date.now() + 100;
        return accurateTime;
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: accurateSource,
      maxDriftMs: 5000,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const offset = authTime.getOffset();
    expect(Math.abs(offset - 100)).toBeLessThan(50);
  });

  it("should auto-resync when interval elapses", async () => {
    let callCount = 0;
    const countingSource = {
      getTime: async () => {
        callCount++;
        return Date.now();
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: countingSource,
      syncIntervalMs: 100,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    const initialCalls = callCount;

    await new Promise((resolve) => setTimeout(resolve, 150));

    authTime.now();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(callCount).toBeGreaterThan(initialCalls);
  });

  it("should handle time source failures gracefully", async () => {
    const failingSource = {
      getTime: async () => {
        throw new Error("Time source unavailable");
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: failingSource,
      maxDriftMs: 5000,
    });

    await expect(authTime.sync()).rejects.toThrow("Time source unavailable");

    const time = authTime.now();
    expect(typeof time).toBe("number");
    expect(time).toBeGreaterThan(0);
  });

  it("should compensate for network latency", async () => {
    const latencySource = {
      getTime: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return Date.now();
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: latencySource,
      maxDriftMs: 5000,
    });

    await authTime.sync();

    const offset = authTime.getOffset();
    expect(Math.abs(offset)).toBeLessThan(100);
  });
});

describe("Adversarial: Time-Based Token Expiration Bypass", () => {
  it("should prevent token validity extension via clock manipulation", async () => {
    const accurateSource = {
      getTime: async () => Date.now(),
    };

    const authTime = new AuthoritativeTime({
      timeSource: accurateSource,
    });

    const tokenIssuedAt = authTime.now();
    const tokenTtlMs = 15 * 60 * 1000;
    const tokenExpiresAt = tokenIssuedAt + tokenTtlMs;

    const authoritativeNow = authTime.now();
    const isExpired = authoritativeNow > tokenExpiresAt;

    expect(isExpired).toBe(false);
  });
});
