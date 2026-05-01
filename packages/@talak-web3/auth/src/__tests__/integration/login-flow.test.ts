import { describe, it, expect, beforeEach } from "vitest";

import {
  TalakWeb3Auth,
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "../../index.js";

describe("Login Flow Integration", () => {
  let auth: TalakWeb3Auth;
  let nonceStore: InMemoryNonceStore;
  let refreshStore: InMemoryRefreshStore;
  let revocationStore: InMemoryRevocationStore;

  beforeEach(() => {
    nonceStore = new InMemoryNonceStore();
    refreshStore = new InMemoryRefreshStore();
    revocationStore = new InMemoryRevocationStore();

    auth = new TalakWeb3Auth({
      nonceStore,
      refreshStore,
      revocationStore,
      accessTtlSeconds: 900,
      refreshTtlSeconds: 7 * 24 * 60 * 60,
    });
  });

  describe("complete SIWE login flow", () => {
    it("should complete full login flow with valid signature", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const chainId = 1;

      const nonce = await auth.createNonce(address);
      expect(nonce).toBeDefined();

      const issuedAt = new Date().toISOString();

      expect(await nonceStore.consume(address, nonce)).toBe(true);
    });

    it("should prevent replay attacks with nonce consumption", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const nonce = await auth.createNonce(address);

      const consumed1 = await nonceStore.consume(address, nonce);
      expect(consumed1).toBe(true);

      const consumed2 = await nonceStore.consume(address, nonce);
      expect(consumed2).toBe(false);
    });

    it("should handle concurrent nonce consumption attempts", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const nonce = await auth.createNonce(address);

      const attempts = await Promise.all([
        nonceStore.consume(address, nonce),
        nonceStore.consume(address, nonce),
        nonceStore.consume(address, nonce),
      ]);

      const successCount = attempts.filter(Boolean).length;
      expect(successCount).toBe(1);
    });
  });

  describe("session lifecycle", () => {
    it("should create and verify a session", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      expect(accessToken).toBeDefined();

      const session = await auth.verifySession(accessToken);
      expect(session.address).toBe(address.toLowerCase());
      expect(session.chainId).toBe(chainId);
    });

    it("should validate JWT correctly", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);

      const isValid = await auth.validateJwt(accessToken);
      expect(isValid).toBe(true);

      const isInvalidValid = await auth.validateJwt("invalid-token");
      expect(isInvalidValid).toBe(false);
    });
  });

  describe("token refresh flow", () => {
    it("should rotate refresh tokens atomically", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token: refreshToken, session: initialSession } = await refreshStore.create(
        address,
        chainId,
        ttlMs,
      );
      expect(refreshToken).toBeDefined();
      expect(initialSession.revoked).toBe(false);

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await auth.refresh(refreshToken);
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toBe(refreshToken);
      expect(newAccessToken).toBeDefined();

      const oldSession = await refreshStore.lookup(refreshToken);
      expect(oldSession?.revoked).toBe(true);

      const newSessionLookup = await refreshStore.lookup(newRefreshToken);
      expect(newSessionLookup?.revoked).toBe(false);
    });

    it("should detect token reuse attempts", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token: refreshToken } = await refreshStore.create(address, chainId, ttlMs);
      await auth.refresh(refreshToken);

      await expect(auth.refresh(refreshToken)).rejects.toThrow(
        "Refresh token already used or revoked",
      );
    });
  });

  describe("session revocation", () => {
    it("should revoke access tokens", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);

      expect(await auth.validateJwt(accessToken)).toBe(true);

      await auth.revokeSession(accessToken);

      expect(await auth.validateJwt(accessToken)).toBe(false);
    });

    it("should revoke both access and refresh tokens", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const accessToken = await auth.createSession(address, chainId);
      const { token: refreshToken } = await refreshStore.create(address, chainId, ttlMs);

      await auth.revokeSession(accessToken, refreshToken);

      expect(await auth.validateJwt(accessToken)).toBe(false);

      const session = await refreshStore.lookup(refreshToken);
      expect(session?.revoked).toBe(true);
    });
  });
});
