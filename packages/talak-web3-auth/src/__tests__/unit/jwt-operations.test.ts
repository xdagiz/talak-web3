/**
 * Unit tests for JWT operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';
import { TalakWeb3Auth } from '../../index.js';

describe('JWT Operations', () => {
  const testSecret = new TextEncoder().encode('test-secret-32-characters-long!!');
  let auth: TalakWeb3Auth;

  beforeEach(() => {
    auth = new TalakWeb3Auth();
  });

  describe('JWT signing and verification', () => {
    it('should sign and verify a valid JWT', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const now = Math.floor(Date.now() / 1000);

      const token = await new SignJWT({ address, chainId })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(address.toLowerCase())
        .setJti('test-jti-123')
        .setIssuedAt()
        .setExpirationTime(now + 900) // 15 minutes
        .sign(testSecret);

      const { payload } = await jwtVerify(token, testSecret, {
        requiredClaims: ['iat', 'exp', 'sub'],
      });

      expect(payload.sub).toBe(address.toLowerCase());
      expect(payload.address).toBe(address);
      expect(payload.chainId).toBe(chainId);
      expect(payload.jti).toBe('test-jti-123');
    });

    it('should reject JWT with invalid signature', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const wrongSecret = new TextEncoder().encode('wrong-secret-32-characters!!');

      const token = await new SignJWT({ address, chainId })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(address.toLowerCase())
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(testSecret);

      await expect(
        jwtVerify(token, wrongSecret, { requiredClaims: ['iat', 'exp', 'sub'] })
      ).rejects.toThrow();
    });

    it('should reject expired JWT', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const past = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      const token = await new SignJWT({ address, chainId })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(address.toLowerCase())
        .setJti('expired-jti')
        .setIssuedAt(past)
        .setExpirationTime(past + 900) // Expired 45 minutes ago
        .sign(testSecret);

      await expect(
        jwtVerify(token, testSecret, { requiredClaims: ['iat', 'exp', 'sub'] })
      ).rejects.toThrow(/exp|timestamp/i);
    });

    it('should reject JWT with missing required claims', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;

      // Token without 'sub' claim
      const token = await new SignJWT({ address, chainId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(testSecret);

      await expect(
        jwtVerify(token, testSecret, { requiredClaims: ['sub'] })
      ).rejects.toThrow();
    });
  });

  describe('JWT payload structure', () => {
    it('should include all required fields in payload', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 137;

      const token = await new SignJWT({ address, chainId })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(address.toLowerCase())
        .setJti('test-jti')
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(testSecret);

      const { payload } = await jwtVerify(token, testSecret);

      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('jti');
      expect(payload).toHaveProperty('address');
      expect(payload).toHaveProperty('chainId');
    });

    it('should store address in lowercase in subject', async () => {
      const address = '0x742D35CC6634C0532925A3B844BC9E7595F0BEB';

      const token = await new SignJWT({ address, chainId: 1 })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(address.toLowerCase())
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(testSecret);

      const { payload } = await jwtVerify(token, testSecret);

      expect(payload.sub).toBe('0x742d35cc6634c0532925a3b844bc9e7595f0beb');
    });
  });

  describe('Token validation', () => {
    it('should validate JWT format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.test';
      const invalidToken = 'not-a-valid-token';
      const malformedToken = 'header.payload';

      // Valid format (3 parts separated by dots)
      expect(validToken.split('.')).toHaveLength(3);

      // Invalid formats
      expect(invalidToken.split('.')).toHaveLength(1);
      expect(malformedToken.split('.')).toHaveLength(2);
    });
  });
});
