/**
 * Unit tests for Refresh Token Store implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRefreshStore } from '../../index.js';

describe('InMemoryRefreshStore', () => {
  let store: InMemoryRefreshStore;

  beforeEach(() => {
    store = new InMemoryRefreshStore();
  });

  describe('create', () => {
    it('should create a refresh session', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

      const { token, session } = await store.create(address, chainId, ttlMs);

      expect(token).toBeDefined();
      expect(token).toHaveLength(43); // base64url of 32 bytes
      expect(session).toBeDefined();
      expect(session.address).toBe(address.toLowerCase());
      expect(session.chainId).toBe(chainId);
      expect(session.hash).toBeDefined();
      expect(session.revoked).toBe(false);
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should create unique tokens for the same address', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token: token1 } = await store.create(address, chainId, ttlMs);
      const { token: token2 } = await store.create(address, chainId, ttlMs);

      expect(token1).not.toBe(token2);
    });

    it('should store address in lowercase', async () => {
      const address = '0x742D35CC6634C0532925A3B844BC9E7595F0BEB';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { session } = await store.create(address, chainId, ttlMs);

      expect(session.address).toBe(address.toLowerCase());
    });
  });

  describe('lookup', () => {
    it('should look up a valid session', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token, session: createdSession } = await store.create(address, chainId, ttlMs);
      const lookedUpSession = await store.lookup(token);

      expect(lookedUpSession).toBeDefined();
      expect(lookedUpSession?.id).toBe(createdSession.id);
      expect(lookedUpSession?.address).toBe(createdSession.address);
    });

    it('should return null for non-existent token', async () => {
      const session = await store.lookup('nonexistent-token');

      expect(session).toBeNull();
    });

    it('should return null for invalid token format', async () => {
      const session = await store.lookup('');

      expect(session).toBeNull();
    });
  });

  describe('rotate', () => {
    it('should rotate a valid refresh token', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token: oldToken } = await store.create(address, chainId, ttlMs);
      const { token: newToken, session: newSession } = await store.rotate(oldToken, ttlMs);

      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(oldToken);
      expect(newSession.address).toBe(address.toLowerCase());
      expect(newSession.chainId).toBe(chainId);
    });

    it('should revoke the old token after rotation', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token: oldToken } = await store.create(address, chainId, ttlMs);
      await store.rotate(oldToken, ttlMs);

      // Try to rotate the old token again
      await expect(store.rotate(oldToken, ttlMs)).rejects.toThrow('Refresh token already used or revoked');
    });

    it('should throw for non-existent token', async () => {
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      await expect(store.rotate('nonexistent', ttlMs)).rejects.toThrow('Refresh session not found');
    });

    it('should throw for expired token', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const shortTtl = 1; // 1ms

      const { token } = await store.create(address, chainId, shortTtl);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(store.rotate(token, 1000)).rejects.toThrow('Refresh token expired');
    });

    it('should preserve address and chainId through rotation', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 137; // Polygon
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token: oldToken } = await store.create(address, chainId, ttlMs);
      const { session: newSession } = await store.rotate(oldToken, ttlMs);

      expect(newSession.address).toBe(address.toLowerCase());
      expect(newSession.chainId).toBe(chainId);
    });
  });

  describe('revoke', () => {
    it('should revoke a valid token', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token } = await store.create(address, chainId, ttlMs);
      await store.revoke(token);

      const session = await store.lookup(token);
      expect(session?.revoked).toBe(true);
    });

    it('should not throw for non-existent token', async () => {
      await expect(store.revoke('nonexistent')).resolves.not.toThrow();
    });

    it('should prevent rotation of revoked token', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token } = await store.create(address, chainId, ttlMs);
      await store.revoke(token);

      await expect(store.rotate(token, ttlMs)).rejects.toThrow('Refresh token already used or revoked');
    });
  });
});
