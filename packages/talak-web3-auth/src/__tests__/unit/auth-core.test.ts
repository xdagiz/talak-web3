import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TalakWeb3Auth, InMemoryNonceStore, InMemoryRefreshStore, InMemoryRevocationStore } from '../../index.js';

const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDJ7X+Rz6+6yV9w
...
-----END PRIVATE KEY-----`;

const TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAye1/kc+vuskffc...
-----END PUBLIC KEY-----`;

describe('TalakWeb3Auth', () => {
  let auth: TalakWeb3Auth;
  let nonceStore: InMemoryNonceStore;
  let refreshStore: InMemoryRefreshStore;
  let revocationStore: InMemoryRevocationStore;

  beforeEach(async () => {
    vi.stubEnv('JWT_PRIVATE_KEY', TEST_PRIVATE_KEY);
    vi.stubEnv('JWT_PUBLIC_KEY', TEST_PUBLIC_KEY);
    vi.stubEnv('SIWE_DOMAIN', 'test.example.com');

    nonceStore = new InMemoryNonceStore();
    refreshStore = new InMemoryRefreshStore();
    revocationStore = new InMemoryRevocationStore();

    auth = new TalakWeb3Auth({
      nonceStore,
      refreshStore,
      revocationStore,
      accessTtlSeconds: 15 * 60,
      refreshTtlSeconds: 7 * 24 * 60 * 60,
    });

    await auth.coldStart();
  });

  describe('initialization', () => {
    it('should throw if mandatory stores are missing', () => {

      expect(() => new TalakWeb3Auth({})).toThrow('CRITICAL: Mandatory auth stores');
    });

    it('should initialize correctly with mandatory stores and environment keys', async () => {
      expect(auth).toBeDefined();
      await expect(auth.coldStart()).resolves.not.toThrow();
    });

    it('should fail coldStart if keys are missing from environment', async () => {
      vi.unstubAllEnvs();
      const failAuth = new TalakWeb3Auth({ nonceStore, refreshStore, revocationStore });
      await expect(failAuth.coldStart()).rejects.toThrow('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required');
    });
  });

  describe('nonce generation', () => {
    it('should generate a cryptographically secure nonce', () => {
      const nonce = auth.generateNonce();

      expect(nonce).toBeDefined();
      expect(nonce).toHaveLength(64);
      expect(nonce).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('createNonce', () => {
    it('should create a nonce via the nonce store', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const nonce = await auth.createNonce(address);

      expect(nonce).toBeDefined();
      expect(nonce).toHaveLength(32);
    });
  });

  describe('createSession', () => {
    it('should create a session and return access token', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);

      expect(accessToken).toBeDefined();
      expect(accessToken.split('.')).toHaveLength(3);
    });

    it('should create valid JWT that can be verified', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      const isValid = await auth.validateJwt(accessToken);

      expect(isValid).toBe(true);
    });
  });

  describe('verifySession', () => {
    it('should verify a valid session token', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      const session = await auth.verifySession(accessToken);

      expect(session.address).toBe(address.toLowerCase());
      expect(session.chainId).toBe(chainId);
    });

    it('should throw for invalid token', async () => {
      await expect(auth.verifySession('invalid-token')).rejects.toThrow('Invalid or expired session token');
    });
  });

  describe('validateJwt', () => {
    it('should return true for valid JWT', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      const isValid = await auth.validateJwt(accessToken);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid JWT', async () => {
      const isValid = await auth.validateJwt('invalid-token');
      expect(isValid).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('should revoke an access token', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;

      const accessToken = await auth.createSession(address, chainId);
      await auth.revokeSession(accessToken);

      const isValid = await auth.validateJwt(accessToken);
      expect(isValid).toBe(false);
    });
  });

  describe('refresh token flow', () => {
    it('should rotate refresh token and issue new tokens', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;

      const { token: refreshToken } = await refreshStore.create(address, chainId, 7 * 24 * 60 * 60 * 1000);
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await auth.refresh(refreshToken);

      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();
      expect(newRefreshToken).not.toBe(refreshToken);

      const isValid = await auth.validateJwt(newAccessToken);
      expect(isValid).toBe(true);
    });
  });
});
