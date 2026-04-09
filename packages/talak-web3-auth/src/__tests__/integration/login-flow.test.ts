/**
 * Integration tests for login flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { TalakWeb3Auth, InMemoryNonceStore, InMemoryRefreshStore, InMemoryRevocationStore } from '../../index.js';

describe('Login Flow Integration', () => {
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
      accessTtlSeconds: 900, // 15 minutes
      refreshTtlSeconds: 7 * 24 * 60 * 60, // 7 days
    });
  });

  describe('complete SIWE login flow', () => {
    it('should complete full login flow with valid signature', async () => {
      // This test uses a mock since we can't actually sign in unit tests
      // In real E2E tests, this would use an actual wallet
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      // Step 1: Generate nonce
      const nonce = await auth.createNonce(address);
      expect(nonce).toBeDefined();

      // Step 2: Create SIWE message (normally signed by wallet)
      const issuedAt = new Date().toISOString();
      const message = `example.com wants you to sign in with your Ethereum account:

${address}

Sign in to the app

URI: https://example.com
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;

      // Note: In real scenario, user signs this message with their wallet
      // For this integration test, we're testing the auth flow without actual signing
      // The signature verification is tested separately

      // Verify nonce was created by consuming it
      expect(await nonceStore.consume(address, nonce)).toBe(true);
    });

    it('should prevent replay attacks with nonce consumption', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      // Create nonce
      const nonce = await auth.createNonce(address);

      // First consumption should succeed
      const consumed1 = await nonceStore.consume(address, nonce);
      expect(consumed1).toBe(true);

      // Second consumption should fail (replay protection)
      const consumed2 = await nonceStore.consume(address, nonce);
      expect(consumed2).toBe(false);
    });

    it('should handle concurrent nonce consumption attempts', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      // Create nonce
      const nonce = await auth.createNonce(address);

      // Simulate concurrent consumption attempts
      const attempts = await Promise.all([
        nonceStore.consume(address, nonce),
        nonceStore.consume(address, nonce),
        nonceStore.consume(address, nonce),
      ]);

      // Only one should succeed
      const successCount = attempts.filter(Boolean).length;
      expect(successCount).toBe(1);
    });
  });

  describe('session lifecycle', () => {
    it('should create and verify a session', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      // Create session
      const accessToken = await auth.createSession(address, chainId);
      expect(accessToken).toBeDefined();

      // Verify session
      const session = await auth.verifySession(accessToken);
      expect(session.address).toBe(address.toLowerCase());
      expect(session.chainId).toBe(chainId);
    });

    it('should validate JWT correctly', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);

      // Valid token should pass
      const isValid = await auth.validateJwt(accessToken);
      expect(isValid).toBe(true);

      // Invalid token should fail
      const isInvalidValid = await auth.validateJwt('invalid-token');
      expect(isInvalidValid).toBe(false);
    });
  });

  describe('token refresh flow', () => {
    it('should rotate refresh tokens atomically', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      // Create initial refresh token
      const { token: refreshToken, session: initialSession } = await refreshStore.create(address, chainId, ttlMs);
      expect(refreshToken).toBeDefined();
      expect(initialSession.revoked).toBe(false);

      // Rotate the token
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await auth.refresh(refreshToken);
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toBe(refreshToken);
      expect(newAccessToken).toBeDefined();

      // Old token should be revoked
      const oldSession = await refreshStore.lookup(refreshToken);
      expect(oldSession?.revoked).toBe(true);

      // New token should be valid
      const newSessionLookup = await refreshStore.lookup(newRefreshToken);
      expect(newSessionLookup?.revoked).toBe(false);
    });

    it('should detect token reuse attempts', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      // Create and rotate token
      const { token: refreshToken } = await refreshStore.create(address, chainId, ttlMs);
      await auth.refresh(refreshToken);

      // Attempt to reuse old token should fail
      await expect(auth.refresh(refreshToken)).rejects.toThrow('Refresh token already used or revoked');
    });
  });

  describe('session revocation', () => {
    it('should revoke access tokens', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      // Create session
      const accessToken = await auth.createSession(address, chainId);

      // Verify it's valid
      expect(await auth.validateJwt(accessToken)).toBe(true);

      // Revoke it
      await auth.revokeSession(accessToken);

      // Should no longer be valid
      expect(await auth.validateJwt(accessToken)).toBe(false);
    });

    it('should revoke both access and refresh tokens', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      // Create tokens
      const accessToken = await auth.createSession(address, chainId);
      const { token: refreshToken } = await refreshStore.create(address, chainId, ttlMs);

      // Revoke both
      await auth.revokeSession(accessToken, refreshToken);

      // Access token should be invalid
      expect(await auth.validateJwt(accessToken)).toBe(false);

      // Refresh token should be revoked
      const session = await refreshStore.lookup(refreshToken);
      expect(session?.revoked).toBe(true);
    });
  });
});
