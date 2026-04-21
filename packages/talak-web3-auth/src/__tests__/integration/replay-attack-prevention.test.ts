import { describe, it, expect, beforeEach } from 'vitest';
import { TalakWeb3Auth, InMemoryNonceStore, InMemoryRefreshStore } from '../../index.js';

describe('Replay Attack Prevention', () => {
  let auth: TalakWeb3Auth;
  let nonceStore: InMemoryNonceStore;
  let refreshStore: InMemoryRefreshStore;

  beforeEach(() => {
    nonceStore = new InMemoryNonceStore();
    refreshStore = new InMemoryRefreshStore();

    auth = new TalakWeb3Auth({
      nonceStore,
      refreshStore,
    });
  });

  describe('nonce replay protection', () => {
    it('should prevent nonce reuse after consumption', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      const nonce = await auth.createNonce(address);

      const first = await nonceStore.consume(address, nonce);
      expect(first).toBe(true);

      for (let i = 0; i < 5; i++) {
        const result = await nonceStore.consume(address, nonce);
        expect(result).toBe(false);
      }
    });

    it('should track nonce consumption attempts', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      const nonce = await nonceStore.create(address);
      const first = await nonceStore.consume(address, nonce);
      const second = await nonceStore.consume(address, nonce);

      expect(first).toBe(true);
      expect(second).toBe(false);
    });

    it('should handle rapid concurrent consumption attempts', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const nonce = await nonceStore.create(address);

      const attempts = await Promise.all(
        Array.from({ length: 100 }, () => nonceStore.consume(address, nonce))
      );

      const successCount = attempts.filter(Boolean).length;
      expect(successCount).toBe(1);
    });

    it('should expire nonces after TTL', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const shortStore = new InMemoryNonceStore({ ttlMs: 50 });

      const nonce = await shortStore.create(address);

      expect(await shortStore.consume(address, nonce)).toBe(true);

      const nonce2 = await shortStore.create(address);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(await shortStore.consume(address, nonce2)).toBe(false);
    });
  });

  describe('refresh token replay protection', () => {
    it('should prevent refresh token reuse after rotation', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token: oldToken } = await refreshStore.create(address, chainId, ttlMs);

      await auth.refresh(oldToken);

      await expect(auth.refresh(oldToken)).rejects.toThrow('Refresh token already used or revoked');
    });

    it('should detect token reuse on subsequent attempts', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token } = await refreshStore.create(address, chainId, ttlMs);

      await auth.refresh(token);

      await expect(auth.refresh(token)).rejects.toThrow('Refresh token already used or revoked');
    });

    it('should handle concurrent rotation attempts', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const chainId = 1;
      const ttlMs = 7 * 24 * 60 * 60 * 1000;

      const { token } = await refreshStore.create(address, chainId, ttlMs);

      const attempts = await Promise.allSettled([
        auth.refresh(token),
        auth.refresh(token),
        auth.refresh(token),
      ]);

      const successCount = attempts.filter(a => a.status === 'fulfilled').length;
      expect(successCount).toBe(1);

      const failures = attempts.filter(a => a.status === 'rejected');
      expect(failures.length).toBe(2);
    });
  });

  describe('cross-address replay protection', () => {
    it('should prevent nonce from one address being used by another', async () => {
      const address1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const address2 = '0x8ba1f109551bD432803012645Hac136c82C3e8C9';

      const nonce = await nonceStore.create(address1);

      const consumed = await nonceStore.consume(address2, nonce);
      expect(consumed).toBe(false);

      const consumedByOwner = await nonceStore.consume(address1, nonce);
      expect(consumedByOwner).toBe(true);
    });
  });
});
