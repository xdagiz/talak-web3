import { SignJWT, jwtVerify } from 'jose';
import { verifyMessage } from 'viem';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { TalakWeb3Auth as TalakWeb3AuthInterface } from '@talak-web3/types';

// ---------------------------------------------------------------------------
// SIWE message parsing (EIP-4361)
// ---------------------------------------------------------------------------

interface SiweFields {
  domain: string;
  address: `0x${string}`;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string | undefined;
}

function parseSiweMessage(message: string): SiweFields {
  const firstLine = message.split('\n')[0]?.trim() ?? '';
  const domainMatch = firstLine.match(/^(.+?) wants you to sign in with your Ethereum account:/);
  const domain = domainMatch?.[1]?.trim();

  const addressMatch = message.match(/\n(0x[a-fA-F0-9]{40})\n/);
  const chainIdMatch = message.match(/Chain ID: (\d+)/);
  const nonceMatch = message.match(/Nonce: ([A-Za-z0-9]+)/);
  const issuedAtMatch = message.match(/Issued At: (.+)/);
  const expirationMatch = message.match(/Expiration Time: (.+)/);

  if (!domain || !addressMatch?.[1] || !chainIdMatch?.[1] || !nonceMatch?.[1] || !issuedAtMatch?.[1]) {
    throw new TalakWeb3Error('Invalid SIWE message format', { code: 'AUTH_SIWE_PARSE_ERROR', status: 400 });
  }

  return {
    domain,
    address: addressMatch[1] as `0x${string}`,
    chainId: parseInt(chainIdMatch[1], 10),
    nonce: nonceMatch[1],
    issuedAt: issuedAtMatch[1],
    expirationTime: expirationMatch?.[1],
  };
}

// ---------------------------------------------------------------------------
// Nonce store (pluggable)
// ---------------------------------------------------------------------------

export interface NonceStore {
  create(address: string, meta?: { ip?: string; ua?: string }): Promise<string>;
  consume(address: string, nonce: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Refresh token store (pluggable)
// Refresh tokens are OPAQUE random strings; stored as SHA-256 hashes.
// ---------------------------------------------------------------------------

export interface RefreshSession {
  id: string;
  address: string;
  chainId: number;
  hash: string;
  expiresAt: number;
  revoked: boolean;
}

export interface RefreshStore {
  create(address: string, chainId: number, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  revoke(token: string): Promise<void>;
  lookup(token: string): Promise<RefreshSession | null>;
}

// ---------------------------------------------------------------------------
// JWT Revocation store (pluggable, for access token JTIs)
// ---------------------------------------------------------------------------

export interface RevocationStore {
  revoke(jti: string, expiresAtMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// In-memory nonce store — ONLY for development / testing
// ---------------------------------------------------------------------------

export class InMemoryNonceStore implements NonceStore {
  private readonly ttlMs: number;
  // address -> Map<nonce, expiresAt>
  private readonly entries = new Map<string, Map<string, number>>();

  constructor(opts: { ttlMs?: number } = {}) {
    this.ttlMs = Math.min(opts.ttlMs ?? 5 * 60_000, 5 * 60_000); // hard-cap TTL at 5 min
    console.warn(
      '[talak-web3-auth] InMemoryNonceStore is in use. ' +
      'This is NOT suitable for production. Set REDIS_URL and use RedisNonceStore.',
    );
  }

  async create(address: string): Promise<string> {
    const addr = address.toLowerCase();
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = Date.now() + this.ttlMs;
    let m = this.entries.get(addr);
    if (!m) { m = new Map(); this.entries.set(addr, m); }
    m.set(nonce, expiresAt);
    return nonce;
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    const m = this.entries.get(address);
    if (!m) return false;
    const expiresAt = m.get(nonce);
    if (expiresAt === undefined) return false;
    if (Date.now() > expiresAt) { m.delete(nonce); return false; }
    m.delete(nonce);
    if (m.size === 0) this.entries.delete(address);
    return true;
  }
}

// ---------------------------------------------------------------------------
// In-memory refresh store — ONLY for development / testing
// Refresh tokens are opaque; stored as sha256-hex hashes.
// ---------------------------------------------------------------------------

import { createHash, randomBytes } from 'node:crypto';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export class InMemoryRefreshStore implements RefreshStore {
  private readonly sessions = new Map<string, RefreshSession>(); // keyed by hash

  async create(address: string, chainId: number, ttlMs: number): Promise<{ token: string; session: RefreshSession }> {
    const addr = address.toLowerCase();
    const token = randomBytes(32).toString('base64url');
    const hash = sha256Hex(token);
    const id = randomBytes(16).toString('hex');
    const session: RefreshSession = {
      id,
      address: addr,
      chainId,
      hash,
      expiresAt: Date.now() + ttlMs,
      revoked: false,
    };
    this.sessions.set(hash, session);
    return { token, session };
  }

  async lookup(token: string): Promise<RefreshSession | null> {
    return this.sessions.get(sha256Hex(token)) ?? null;
  }

  async rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }> {
    const hash = sha256Hex(token);
    const old = this.sessions.get(hash);
    if (!old) throw new TalakWeb3Error('Refresh session not found', { code: 'AUTH_REFRESH_NOT_FOUND', status: 401 });
    if (old.revoked) throw new TalakWeb3Error('Refresh token already used or revoked', { code: 'AUTH_REFRESH_REVOKED', status: 401 });
    if (Date.now() > old.expiresAt) throw new TalakWeb3Error('Refresh token expired', { code: 'AUTH_REFRESH_EXPIRED', status: 401 });
    // Revoke old SYNCHRONOUSLY to prevent microtask queue interleaving race conditions
    this.sessions.set(hash, { ...old, revoked: true });
    // Issue new
    return this.create(old.address, old.chainId, ttlMs);
  }

  async revoke(token: string): Promise<void> {
    const hash = sha256Hex(token);
    const session = this.sessions.get(hash);
    if (session) this.sessions.set(hash, { ...session, revoked: true });
  }
}

// ---------------------------------------------------------------------------
// In-memory revocation store (access token JTI deny-list)
// ---------------------------------------------------------------------------

export class InMemoryRevocationStore implements RevocationStore {
  private readonly entries = new Map<string, number>();

  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    this.entries.set(jti, expiresAtMs);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const exp = this.entries.get(jti);
    if (exp === undefined) return false;
    if (Date.now() > exp) { this.entries.delete(jti); return false; }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Session payload
// ---------------------------------------------------------------------------

export interface SessionPayload {
  address: string;
  chainId: number;
}

// ---------------------------------------------------------------------------
// TalakWeb3Auth
// ---------------------------------------------------------------------------

export class TalakWeb3Auth implements TalakWeb3AuthInterface {
  private readonly secret: Uint8Array;
  private readonly nonceStore: NonceStore;
  private readonly refreshStore: RefreshStore;
  private readonly revocations: RevocationStore;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlMs: number;
  private readonly expectedDomain: string | undefined;

  constructor(opts: {
    nonceStore?: NonceStore;
    refreshStore?: RefreshStore;
    revocationStore?: RevocationStore;
    accessTtlSeconds?: number;
    refreshTtlSeconds?: number;
    expectedDomain?: string;
  } = {}) {
    const raw = process.env['JWT_SECRET'] ?? 'talak-web3-dev-secret-change-in-production';
    if (raw === 'talak-web3-dev-secret-change-in-production') {
      console.warn('[talak-web3-auth] JWT_SECRET is not set — using insecure default. Set JWT_SECRET in production!');
    }
    this.secret = new TextEncoder().encode(raw);
    this.nonceStore = opts.nonceStore ?? new InMemoryNonceStore();
    this.refreshStore = opts.refreshStore ?? new InMemoryRefreshStore();
    this.revocations = opts.revocationStore ?? new InMemoryRevocationStore();
    this.accessTtlSeconds = opts.accessTtlSeconds ?? 15 * 60; // 15 min
    this.refreshTtlMs = (opts.refreshTtlSeconds ?? 7 * 24 * 60 * 60) * 1000; // 7 days
    this.expectedDomain = opts.expectedDomain ?? process.env['SIWE_DOMAIN'] ?? undefined;
  }

  async coldStart(): Promise<void> {
    // No async initialisation required — secret is read synchronously
  }

  /** Verify any JWT access token — returns true/false. */
  async validateJwt(token: string): Promise<boolean> {
    try {
      const { payload } = await jwtVerify(token, this.secret, { requiredClaims: ['iat', 'exp', 'sub'] });
      const jti = payload['jti'];
      if (typeof jti === 'string' && await this.revocations.isRevoked(jti)) return false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify a SIWE message + signature and issue both tokens.
   * Returns `{ accessToken, refreshToken }` where:
   *   - accessToken: short-lived JWT (15 min)
   *   - refreshToken: opaque random string (7 days)
   */
  async loginWithSiwe(message: string, signature: string): Promise<{ accessToken: string; refreshToken: string }> {
    const fields = parseSiweMessage(message);

    if (this.expectedDomain && fields.domain !== this.expectedDomain) {
      throw new TalakWeb3Error('SIWE domain mismatch', { code: 'AUTH_SIWE_DOMAIN_MISMATCH', status: 401, data: { domain: fields.domain } });
    }

    // Check SIWE message expiration
    if (fields.expirationTime) {
      if (new Date(fields.expirationTime) < new Date()) {
        throw new TalakWeb3Error('SIWE message has expired', { code: 'AUTH_SIWE_EXPIRED', status: 401 });
      }
    }

    // Atomic nonce consume — must succeed before signature verification
    const consumed = await this.nonceStore.consume(fields.address.toLowerCase(), fields.nonce);
    if (!consumed) {
      throw new TalakWeb3Error('SIWE nonce invalid or already used', { code: 'AUTH_SIWE_NONCE_REPLAY', status: 401 });
    }

    // Verify signature AFTER nonce is consumed (prevents replay even if sig check fails)
    const valid = await verifyMessage({
      address: fields.address,
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      throw new TalakWeb3Error('Invalid SIWE signature', { code: 'AUTH_SIWE_INVALID_SIG', status: 401 });
    }

    return this._issueTokenPair(fields.address, fields.chainId);
  }

  /** Create a session for a given address + chainId (without SIWE — e.g. for testing). */
  async createSession(address: string, chainId: number): Promise<string> {
    return this._issueAccessToken(address, chainId);
  }

  /** Internal: issue an access JWT. */
  private async _issueAccessToken(address: string, chainId: number): Promise<string> {
    const sub = address.toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();
    return new SignJWT({ address, chainId } satisfies SessionPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setJti(jti)
      .setIssuedAt()
      .setExpirationTime(now + this.accessTtlSeconds)
      .sign(this.secret);
  }

  /** Internal: issue both an access JWT and an opaque refresh token. */
  private async _issueTokenPair(address: string, chainId: number): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, { token: refreshToken }] = await Promise.all([
      this._issueAccessToken(address, chainId),
      this.refreshStore.create(address, chainId, this.refreshTtlMs),
    ]);
    return { accessToken, refreshToken };
  }

  /** Verify an access JWT and return its payload. */
  async verifySession(token: string): Promise<SessionPayload> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.secret, { requiredClaims: ['iat', 'exp', 'sub'] }));
    } catch (err) {
      throw new TalakWeb3Error('Invalid or expired session token', { code: 'AUTH_TOKEN_INVALID', status: 401, cause: err });
    }

    const jti = payload['jti'];
    if (typeof jti === 'string' && await this.revocations.isRevoked(jti)) {
      throw new TalakWeb3Error('Session has been revoked', { code: 'AUTH_TOKEN_REVOKED', status: 401 });
    }

    const sub = payload['sub'];
    if (typeof sub !== 'string' || sub.length === 0) {
      throw new TalakWeb3Error('Invalid session token subject', { code: 'AUTH_TOKEN_INVALID_SUB', status: 401 });
    }

    const address = payload['address'];
    const chainId = payload['chainId'];
    if (typeof address !== 'string' || typeof chainId !== 'number') {
      throw new TalakWeb3Error('Malformed session token payload', { code: 'AUTH_TOKEN_MALFORMED', status: 401 });
    }

    return { address, chainId };
  }

  /** Revoke an access token by JTI. Optionally revoke a refresh token too. */
  async revokeSession(accessToken: string, refreshToken?: string): Promise<void> {
    // Revoke access token JTI
    try {
      const { payload } = await jwtVerify(accessToken, this.secret, { requiredClaims: ['iat', 'exp', 'sub'] });
      const jti = payload['jti'];
      const exp = payload['exp'];
      if (typeof jti === 'string' && typeof exp === 'number') {
        await this.revocations.revoke(jti, exp * 1000);
      }
    } catch {
      // Invalid access token — nothing to revoke
    }
    // Revoke refresh token if provided
    if (refreshToken) {
      await this.refreshStore.revoke(refreshToken);
    }
  }

  /** Generate a cryptographically random nonce for SIWE messages. */
  generateNonce(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Create a nonce via the nonce store (server-authoritative). */
  async createNonce(address: string, meta?: { ip?: string; ua?: string }): Promise<string> {
    return this.nonceStore.create(address.toLowerCase(), meta);
  }

  /**
   * Rotate a refresh token: validate, revoke old, issue new pair.
   * The old refresh token must NOT have been used before.
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Atomically rotate the refresh session — throws if revoked/expired/missing
    const { session, token: newRefreshToken } = await this.refreshStore.rotate(refreshToken, this.refreshTtlMs);

    // Issue new access token using address + chainId from the session
    const accessToken = await this._issueAccessToken(session.address, session.chainId);
    return { accessToken, refreshToken: newRefreshToken };
  }
}
