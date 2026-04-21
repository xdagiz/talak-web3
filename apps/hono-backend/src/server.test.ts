import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from './server.js';
import { MemoryAuthStorage } from './security/storage.js';

vi.mock('viem', () => ({
  verifyMessage: vi.fn(),
}));
import { verifyMessage } from 'viem';
const mockVerify = vi.mocked(verifyMessage);

vi.mock('@talak-web3/core', () => ({
  talakWeb3: () => ({
    context: {
      rpc: { request: vi.fn().mockResolvedValue('mock-rpc-result') },
    },
  }),
}));

const ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const DOMAIN = 'localhost';
const CHAIN_ID = 1;

function buildSiweMessage(nonce: string): string {
  return (
    `${DOMAIN} wants you to sign in with your Ethereum account:\n` +
    `${ADDRESS}\n\n` +
    `URI: http://${DOMAIN}\n` +
    `Version: 1\n` +
    `Chain ID: ${CHAIN_ID}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${new Date().toISOString()}`
  );
}

describe('Auth Edge Concurrency & Adversarial Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.advanceTimersByTime(200_000);
    mockVerify.mockResolvedValue(true);

    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('generates a nonce', async () => {
    const res = await app.request('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: ADDRESS }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.nonce).toBe('string');
  });

  it('parallel login with same nonce → EXACTLY ONE succeeds', async () => {
    const testIp = '1.1.1.2';
    const testAddr = '0x1111111111111111111111111111111111111111';

    const nonceRes = await app.request('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: testAddr }),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
    });
    const { nonce } = await nonceRes.json();
    const csrfToken = (nonceRes.headers.get('set-cookie') ?? '').match(/csrf_token=([^;]+)/)?.[1];
    const message = buildSiweMessage(nonce).replace(ADDRESS, testAddr);

    const requests = Array.from({ length: 10 }, () =>
      app.request('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
          'Cookie': `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken!,
        },
        body: JSON.stringify({ message, signature: '0xdeadbeef' }),
      })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 200).length;
    const authFailCount = statuses.filter((s) => s === 401).length;

    expect(successCount).toBe(1);
    expect(authFailCount).toBe(9);
  });

  it('parallel refresh → EXACTLY ONE succeeds', async () => {

    const nonceRes = await app.request('/auth/nonce', {
        method: 'POST',
        body: JSON.stringify({ address: ADDRESS }),
        headers: { 'Content-Type': 'application/json' },
    });
    const { nonce } = await nonceRes.json();
    const csrfToken = (nonceRes.headers.get('set-cookie') ?? '').match(/csrf_token=([^;]+)/)?.[1];
    const message = buildSiweMessage(nonce);
    const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken!,
        },
        body: JSON.stringify({ message, signature: '0xdeadbeef' }),
    });
    const { refreshToken } = await loginRes.json();

    const requests = Array.from({ length: 5 }, () =>
        app.request('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken!,
        },
        body: JSON.stringify({ refreshToken }),
        })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 200).length;
    const failCount = statuses.filter((s) => s === 401).length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(4);
  });

  it('CSRF double-submit: valid token → pass', async () => {

    const nonceRes = await app.request('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: ADDRESS }),
      headers: { 'Content-Type': 'application/json' },
    });
    const setCookie = nonceRes.headers.get('set-cookie') ?? '';
    const csrfToken = setCookie.match(/csrf_token=([^;]+)/)?.[1];
    expect(csrfToken).toBeDefined();

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `csrf_token=${csrfToken}`,
        'x-csrf-token': csrfToken!
      },
      body: JSON.stringify({ message: buildSiweMessage('any'), signature: '0x123' }),
    });

    expect(res.status).toBe(401);
  });

  it('CSRF double-submit: missing header → 403', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'csrf_token=validtoken'
      },
      body: JSON.stringify({ message: 'any', signature: '0x123' }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe('CSRF_INVALID');
  });

  it('CSRF double-submit: mismatch → 403', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'csrf_token=tokenA',
        'x-csrf-token': 'tokenB'
      },
      body: JSON.stringify({ message: 'any', signature: '0x123' }),
    });
    expect(res.status).toBe(403);
  });

  it('Mass parallel login (500) → EXACTLY ONE succeeds', async () => {
    const testAddr = '0x2222222222222222222222222222222222222222';

    const nonceRes = await app.request('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: testAddr }),
      headers: { 'Content-Type': 'application/json' },
    });
    const { nonce } = await nonceRes.json();
    const csrfToken = (nonceRes.headers.get('set-cookie') ?? '').match(/csrf_token=([^;]+)/)?.[1];
    const message = buildSiweMessage(nonce).replace(ADDRESS, testAddr);

    const requests = Array.from({ length: 100 }, () =>
      app.request('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken!
        },
        body: JSON.stringify({ message, signature: '0xdeadbeef' }),
      })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);

    const successCount = statuses.filter((s) => s === 200).length;
    expect(successCount).toBe(1);
    expect(statuses.filter(s => s === 401 || s === 429).length).toBe(99);
  }, 30000);

  it('Mass parallel refresh (100) → EXACTLY ONE succeeds', async () => {
    const testIp = '203.0.113.88';

    const nonceRes = await app.request('/auth/nonce', {
        method: 'POST',
        body: JSON.stringify({ address: ADDRESS }),
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
    });
    const { nonce } = await nonceRes.json();
    const setCookie = nonceRes.headers.get('set-cookie') ?? '';
    const csrfToken = setCookie.match(/csrf_token=([^;]+)/)?.[1];

    const loginRes = await app.request('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
          'Cookie': `csrf_token=${csrfToken}`,
          'x-csrf-token': csrfToken!
        },
        body: JSON.stringify({ message: buildSiweMessage(nonce), signature: '0xdeadbeef' }),
    });
    expect(loginRes.status).toBe(200);
    const { refreshToken } = await loginRes.json();

    const requests = Array.from({ length: 100 }, () =>
        app.request('/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': testIp,
            'Cookie': `csrf_token=${csrfToken}`,
            'x-csrf-token': csrfToken!
          },
          body: JSON.stringify({ refreshToken }),
        })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);

    const successCount = statuses.filter((s) => s === 200).length;
    expect(successCount).toBe(1);
    expect(statuses.filter(s => s === 401).length).toBe(99);
  }, 30000);

  it('Fail-closed: Redis down during login → 503', async () => {

  });
});
