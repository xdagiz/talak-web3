/**
 * Unit tests for TalakWeb3Auth core functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TalakWeb3Auth, InMemoryNonceStore, InMemoryRefreshStore, InMemoryRevocationStore } from '../../index.js';

describe('TalakWeb3Auth', () => {
  let auth: TalakWeb3Auth;

  beforeEach(() => {
    auth = new TalakWeb3Auth({
      accessTtlSeconds: 15 * 60, // 15 minutes
      refreshTtlSeconds: 7 * 24 * 60 * 60, // 7 days
    });
  });

  describe('initialization', () => {
    it('should initialize with default options', async () => {
      const defaultAuth = new TalakWeb3Auth();
      await expect(defaultAuth.coldStart()).resolves.not.toThrow();
    });

    it('should initialize with custom stores', async () => {
      const customAuth = new TalakWeb3Auth({
        nonceStore: new InMemoryNonceStore(),
        refreshStore: new InMemoryRefreshStore(),
        revocationStore: new InMemoryRevocationStore(),
      });

      await expect(customAuth.coldStart()).resolves.not.toThrow();
    });

    it('should use environment variables when available', () => {
      const originalSecret = process.env.JWT_SECRET;
      const originalDomain = process.env.SIWE_DOMAIN;

      process.env.JWT_SECRET = 'test-secret-from-env';
      process.env.SIWE_DOMAIN = 'test.example.com';

      const envAuth = new TalakWeb3Auth();

      // Should not throw warning about default secret
      expect(envAuth).toBeDefined();

      process.env.JWT_SECRET = originalSecret;
      process.env.SIWE_DOMAIN = originalDomain;
    });
  });

  describe('nonce generation', () => {
    it('should generate a cryptographically secure nonce', () => {
      const nonce = auth.generateNonce();

      expect(nonce).toBeDefined();
      expect(nonce).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate unique nonces', () => {
      const nonce1 = auth.generateNonce();
      const nonce2 = auth.generateNonce();
      const nonce3 = auth.generateNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce2).not.toBe(nonce3);
      expect(nonce1).not.toBe(nonce3);
    });
  });

  describe('createNonce', () => {
    it('should create a nonce via the nonce store', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      const nonce = await auth.createNonce(address);

      expect(nonce).toBeDefined();
      expect(nonce).toHaveLength(32);
    });

    it('should accept optional metadata', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const meta = { ip: '127.0.0.1', ua: 'Test Browser' };

      const nonce = await auth.createNonce(address, meta);

      expect(nonce).toBeDefined();
    });
  });

  describe('createSession', () => {
    it('should create a session and return access token', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);

      expect(accessToken).toBeDefined();
      expect(accessToken.split('.')).toHaveLength(3); // JWT format
    });

    it('should create valid JWT that can be verified', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      const isValid = await auth.validateJwt(accessToken);

      expect(isValid).toBe(true);
    });
  });

  describe('verifySession', () => {
    it('should verify a valid session token', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      const session = await auth.verifySession(accessToken);

      expect(session.address).toBe(address.toLowerCase());
      expect(session.chainId).toBe(chainId);
    });

    it('should throw for invalid token', async () => {
      await expect(auth.verifySession('invalid-token')).rejects.toThrow('Invalid or expired session token');
    });

    it('should throw for malformed token', async () => {
      await expect(auth.verifySession('malformed.token')).rejects.toThrow();
    });
  });

  describe('validateJwt', () => {
    it('should return true for valid JWT', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      const isValid = await auth.validateJwt(accessToken);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid JWT', async () => {
      const isValid = await auth.validateJwt('invalid-token');

      expect(isValid).toBe(false);
    });

    it('should return false for empty string', async () => {
      const isValid = await auth.validateJwt('');

      expect(isValid).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('should revoke an access token', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      await auth.revokeSession(accessToken);

      // Token should no longer be valid
      const isValid = await auth.validateJwt(accessToken);
      expect(isValid).toBe(false);
    });

    it('should handle invalid tokens gracefully', async () => {
      await expect(auth.revokeSession('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('refresh token flow', () => {
    it('should rotate refresh token and issue new tokens', async () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const chainId = 1;

      // Create initial session with refresh token
      const customAuth = new TalakWeb3Auth({
        refreshStore: new InMemoryRefreshStore(),
      });

      // Use internal method to create token pair
      const { token: refreshToken } = await customAuth['refreshStore'].create(address, chainId, 7 * 24 * 60 * 60 * 1000);

      // Rotate the token
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await customAuth.refresh(refreshToken);

      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toBe(refreshToken);

      // New access token should be valid
      const isValid = await customAuth.validateJwt(newAccessToken);
      expect(isValid).toBe(true);
    });

    it('should throw for invalid refresh token', async () => {
      await expect(auth.refresh('invalid-refresh-token')).rejects.toThrow();
    });
  });
});
