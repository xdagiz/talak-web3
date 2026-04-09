import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TalakWeb3Auth, InMemoryNonceStore, InMemoryRefreshStore } from './index.js';

// ---------------------------------------------------------------------------
// Mock viem.verifyMessage so tests don't need a real wallet
// ---------------------------------------------------------------------------

vi.mock('viem', () => ({
  verifyMessage: vi.fn(),
}));

import { verifyMessage } from 'viem';
const mockVerify = vi.mocked(verifyMessage);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOMAIN = 'localhost';
const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const CHAIN_ID = 1;

function buildSiweMessage(nonce: string, domain = DOMAIN, address = ADDRESS, expiry?: Date): string {
  const expiryLine = expiry
    ? `\nExpiration Time: ${expiry.toISOString()}`
    : '';
  return (
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${address}\n` +
    `\nURI: http://${domain}\n` +
    `Version: 1\n` +
    `Chain ID: ${CHAIN_ID}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${new Date().toISOString()}` +
    expiryLine
  );
}

// ---------------------------------------------------------------------------
// InMemoryNonceStore
// ---------------------------------------------------------------------------

describe('InMemoryNonceStore', () => {
  let store: InMemoryNonceStore;

  beforeEach(() => {
    vi.useFakeTimers();
    // Suppress the production-warning console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    store = new InMemoryNonceStore({ ttlMs: 5 * 60_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates a nonce that can be consumed once', async () => {
    const nonce = await store.create(ADDRESS);
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
    expect(await store.consume(ADDRESS, nonce)).toBe(true);
  });

  it('nonce reuse → second consume returns false', async () => {
    const nonce = await store.create(ADDRESS);
    await store.consume(ADDRESS, nonce);
    expect(await store.consume(ADDRESS, nonce)).toBe(false);
  });

  it('expired nonce → consume returns false', async () => {
    const nonce = await store.create(ADDRESS);
    // Advance time past TTL
    vi.advanceTimersByTime(5 * 60_000 + 1);
    expect(await store.consume(ADDRESS, nonce)).toBe(false);
  });

  it('unknown nonce → consume returns false', async () => {
    expect(await store.consume(ADDRESS, 'deadbeef')).toBe(false);
  });

  it('concurrent consume → exactly one succeeds', async () => {
    const nonce = await store.create(ADDRESS);
    // Run multiple concurrent consumes — only one should win
    const results = await Promise.all(
      Array.from({ length: 8 }, () => store.consume(ADDRESS, nonce)),
    );
    const successes = results.filter(Boolean);
    expect(successes).toHaveLength(1);
  });

  it('constructor hard-caps TTL at 5 minutes', () => {
    // Creating with TTL > 5 min should be clamped
    const s = new InMemoryNonceStore({ ttlMs: 20 * 60_000 });
    // Access private field via type cast for verification
    expect((s as unknown as { ttlMs: number }).ttlMs).toBe(5 * 60_000);
  });
});

// ---------------------------------------------------------------------------
// InMemoryRefreshStore
// ---------------------------------------------------------------------------

describe('InMemoryRefreshStore', () => {
  let store: InMemoryRefreshStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new InMemoryRefreshStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const TTL = 7 * 24 * 60 * 60_000;

  it('creates a refresh token that can be looked up', async () => {
    const { token, session } = await store.create(ADDRESS, CHAIN_ID, TTL);
    expect(typeof token).toBe('string');
    expect(session.address).toBe(ADDRESS.toLowerCase());
    expect(session.chainId).toBe(CHAIN_ID);
    expect(session.revoked).toBe(false);
    const found = await store.lookup(token);
    expect(found?.address).toBe(ADDRESS.toLowerCase());
  });

  it('rotate returns a new token and revokes old', async () => {
    const { token: t1 } = await store.create(ADDRESS, CHAIN_ID, TTL);
    const { token: t2, session } = await store.rotate(t1, TTL);
    expect(t2).not.toBe(t1);
    expect(session.chainId).toBe(CHAIN_ID);
    // Old token now revoked
    const old = await store.lookup(t1);
    expect(old?.revoked).toBe(true);
  });

  it('refresh reuse → second rotate throws', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.rotate(token, TTL);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });

  it('expired refresh → rotate throws', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, 1000); // 1s TTL
    vi.advanceTimersByTime(2000);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });

  it('explicit revoke → revoked is true', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.revoke(token);
    const session = await store.lookup(token);
    expect(session?.revoked).toBe(true);
  });

  it('lookup of unknown token returns null', async () => {
    expect(await store.lookup('notarealtoken')).toBeNull();
  });

  it('rotate on explicitly-revoked session throws', async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.revoke(token);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// TalakWeb3Auth
// ---------------------------------------------------------------------------

describe('TalakWeb3Auth', () => {
  let nonceStore: InMemoryNonceStore;
  let refreshStore: InMemoryRefreshStore;
  let auth: TalakWeb3Auth;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    nonceStore = new InMemoryNonceStore({ ttlMs: 5 * 60_000 });
    refreshStore = new InMemoryRefreshStore();
    auth = new TalakWeb3Auth({
      expectedDomain: DOMAIN,
      nonceStore,
      refreshStore,
    });
    // Default: sig is valid
    mockVerify.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // --- loginWithSiwe ---

  it('valid SIWE flow → returns accessToken and refreshToken', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce);
    const result = await auth.loginWithSiwe(message, '0xdeadbeef');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    // Access token is a JWT (3 dot-separated segments)
    expect(result.accessToken.split('.').length).toBe(3);
    // Refresh token is opaque (NOT a JWT)
    expect(result.refreshToken.split('.').length).not.toBe(3);
  });

  it('wrong domain → throws AUTH_SIWE_DOMAIN_MISMATCH', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce, 'evil.com');
    await expect(auth.loginWithSiwe(message, '0xdeadbeef')).rejects.toMatchObject({ code: 'AUTH_SIWE_DOMAIN_MISMATCH' });
  });

  it('invalid signature → throws AUTH_SIWE_INVALID_SIG', async () => {
    mockVerify.mockResolvedValue(false);
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce);
    await expect(auth.loginWithSiwe(message, '0xbad')).rejects.toMatchObject({ code: 'AUTH_SIWE_INVALID_SIG' });
  });

  it('expired SIWE message → throws AUTH_SIWE_EXPIRED', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const past = new Date(Date.now() - 1000);
    const message = buildSiweMessage(nonce, DOMAIN, ADDRESS, past);
    await expect(auth.loginWithSiwe(message, '0xdeadbeef')).rejects.toMatchObject({ code: 'AUTH_SIWE_EXPIRED' });
  });

  it('nonce reuse → second login throws AUTH_SIWE_NONCE_REPLAY', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce);
    await auth.loginWithSiwe(message, '0xdeadbeef');
    // Second attempt with the same nonce
    await expect(auth.loginWithSiwe(message, '0xdeadbeef')).rejects.toMatchObject({ code: 'AUTH_SIWE_NONCE_REPLAY' });
  });

  it('expired nonce → throws AUTH_SIWE_NONCE_REPLAY', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce);
    vi.advanceTimersByTime(5 * 60_000 + 1);
    await expect(auth.loginWithSiwe(message, '0xdeadbeef')).rejects.toMatchObject({ code: 'AUTH_SIWE_NONCE_REPLAY' });
  });

  // --- verifySession ---

  it('verifySession on valid access token returns payload', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { accessToken } = await auth.loginWithSiwe(buildSiweMessage(nonce), '0xdeadbeef');
    const payload = await auth.verifySession(accessToken);
    expect(payload.address).toBe(ADDRESS);
    expect(payload.chainId).toBe(CHAIN_ID);
  });

  it('verifySession on tampered token throws', async () => {
    await expect(auth.verifySession('header.payload.invalidsig')).rejects.toMatchObject({ code: 'AUTH_TOKEN_INVALID' });
  });

  // --- refresh ---

  it('refresh rotates tokens correctly', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { refreshToken: rt1 } = await auth.loginWithSiwe(buildSiweMessage(nonce), '0xdeadbeef');
    const { accessToken: at2, refreshToken: rt2 } = await auth.refresh(rt1);
    expect(rt2).not.toBe(rt1);
    expect(at2.split('.').length).toBe(3); // valid JWT
  });

  it('refresh reuse → throws (revoked)', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { refreshToken } = await auth.loginWithSiwe(buildSiweMessage(nonce), '0xdeadbeef');
    await auth.refresh(refreshToken);
    await expect(auth.refresh(refreshToken)).rejects.toThrow();
  });

  it('expired refresh token → rotate throws', async () => {
    // HACK: use a short-lived refresh store TTL for this test
    const shortStore = new InMemoryRefreshStore();
    const auth2 = new TalakWeb3Auth({
      expectedDomain: DOMAIN,
      nonceStore,
      refreshStore: shortStore,
      refreshTtlSeconds: 1, // 1 second
    });
    const nonce = await auth2.createNonce(ADDRESS);
    const { refreshToken } = await auth2.loginWithSiwe(buildSiweMessage(nonce), '0xdeadbeef');
    vi.advanceTimersByTime(2000);
    await expect(auth2.refresh(refreshToken)).rejects.toThrow();
  });

  // --- revokeSession ---

  it('revokeSession with refresh token revokes both', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { accessToken, refreshToken } = await auth.loginWithSiwe(buildSiweMessage(nonce), '0xdeadbeef');
    await auth.revokeSession(accessToken, refreshToken);
    // Access token now invalid
    await expect(auth.verifySession(accessToken)).rejects.toMatchObject({ code: 'AUTH_TOKEN_REVOKED' });
    // Refresh token now revoked
    await expect(auth.refresh(refreshToken)).rejects.toThrow();
  });

  // --- validateJwt ---

  it('validateJwt on valid token returns true', async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { accessToken } = await auth.loginWithSiwe(buildSiweMessage(nonce), '0xdeadbeef');
    expect(await auth.validateJwt(accessToken)).toBe(true);
  });

  it('validateJwt on garbage returns false', async () => {
    expect(await auth.validateJwt('garbage')).toBe(false);
  });
});
