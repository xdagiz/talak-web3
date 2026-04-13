import { SignJWT, jwtVerify, type JWTVerifyOptions } from 'jose';
import { verifyMessage } from 'viem';
import { createHash, randomBytes } from 'node:crypto';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { TalakWeb3Auth as TalakWeb3AuthInterface } from '@talak-web3/types';
import type {
  NonceStore,
  RefreshSession,
  RefreshStore,
  RevocationStore,
} from './contracts.js';

export type { NonceStore, RefreshSession, RefreshStore, RevocationStore } from './contracts.js';

// ---------------------------------------------------------------------------
// SIWE message parsing (EIP-4361)
// ---------------------------------------------------------------------------

interface SiweFields {
  domain: string;
  address: `0x${string}`;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string | undefined;
  notBefore?: string | undefined;
  requestId?: string | undefined;
  resources?: string[] | undefined;
}

function parseSiweMessage(message: string): SiweFields {
  // Normalize line endings
  message = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const lines = message.split('\n');
  
  // Line 0: "<domain> wants you to sign in with your Ethereum account:"
  const firstLine = lines[0]?.trim() ?? '';
  const domainMatch = firstLine.match(/^(.+?) wants you to sign in with your Ethereum account:/);
  const domain = domainMatch?.[1]?.trim();
  
  // Line 1: The wallet address
  const addressLine = lines[1]?.trim() ?? '';
  const addressMatch = addressLine.match(/^(0x[a-fA-F0-9]{40})$/);
  
  // Line 2 (optional): Statement
  let statement: string | undefined;
  let lineIndex = 2;
  
  // Skip empty lines to find statement
  while (lineIndex < lines.length && lines[lineIndex]?.trim() === '') {
    lineIndex++;
  }
  
  // Check if next non-empty line is a statement (not a URI line)
  const potentialStatement = lines[lineIndex]?.trim();
  if (potentialStatement && !potentialStatement.startsWith('URI: ') && !potentialStatement.startsWith('Version: ')) {
    statement = potentialStatement;
    lineIndex++;
  }
  
  // Parse remaining fields from anywhere in the message
  const uriMatch = message.match(/^URI: (.+)$/m);
  const versionMatch = message.match(/^Version: (.+)$/m);
  const chainIdMatch = message.match(/^Chain ID: (\d+)$/m);
  const nonceMatch = message.match(/^Nonce: ([A-Za-z0-9]+)$/m);
  const issuedAtMatch = message.match(/^Issued At: (.+)$/m);
  const expirationMatch = message.match(/^Expiration Time: (.+)$/m);
  const notBeforeMatch = message.match(/^Not Before: (.+)$/m);
  const requestIdMatch = message.match(/^Request ID: (.+)$/m);
  
  // Parse resources (can be multiple lines)
  const resourcesMatch = message.match(/^Resources:\n([\s\S]*?)(?:\n\n|$)/m);
  const resources = resourcesMatch
    ? resourcesMatch[1]
        .split('\n')
        .map(r => r.replace(/^- /, '').trim())
        .filter(r => r.length > 0)
    : undefined;

  if (!domain || !addressMatch?.[1] || !chainIdMatch?.[1] || !nonceMatch?.[1] || !issuedAtMatch?.[1]) {
    throw new TalakWeb3Error('Invalid SIWE message format', { 
      code: 'AUTH_SIWE_PARSE_ERROR', 
      status: 400,
      data: {
        hasDomain: !!domain,
        hasAddress: !!addressMatch?.[1],
        hasChainId: !!chainIdMatch?.[1],
        hasNonce: !!nonceMatch?.[1],
        hasIssuedAt: !!issuedAtMatch?.[1],
      }
    });
  }

  return {
    domain,
    address: addressMatch[1] as `0x${string}`,
    statement,
    uri: uriMatch?.[1] ?? '',
    version: versionMatch?.[1] ?? '1',
    chainId: parseInt(chainIdMatch[1], 10),
    nonce: nonceMatch[1],
    issuedAt: issuedAtMatch[1],
    expirationTime: expirationMatch?.[1],
    notBefore: notBeforeMatch?.[1],
    requestId: requestIdMatch?.[1],
    resources,
  };
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
      'This is NOT suitable for production. Use RedisNonceStore from @talak-web3/auth/stores with REDIS_URL.',
    );
  }

  async create(address: string, _meta?: { ip?: string; ua?: string }): Promise<string> {
    const addr = address.toLowerCase();
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = Date.now() + this.ttlMs;
    let m = this.entries.get(addr);
    if (!m) { m = new Map(); this.entries.set(addr, m); }
    m.set(nonce, expiresAt);
    return nonce;
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const m = this.entries.get(addr);
    if (!m) return false;
    const expiresAt = m.get(nonce);
    if (expiresAt === undefined) return false;
    if (Date.now() > expiresAt) { m.delete(nonce); return false; }
    m.delete(nonce);
    if (m.size === 0) this.entries.delete(addr);
    return true;
  }
}

// ---------------------------------------------------------------------------
// In-memory refresh store — ONLY for development / testing
// Refresh tokens are opaque; stored as sha256-hex hashes.
// ---------------------------------------------------------------------------

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

function resolveJwtSecretBytes(): Uint8Array {
  const raw = process.env['JWT_SECRET'];
  
  if (raw === undefined || raw.length < 32) {
    throw new TalakWeb3Error(
      'JWT_SECRET environment variable is required and must be at least 32 characters for sufficient entropy',
      { code: 'AUTH_JWT_SECRET_INVALID', status: 500 },
    );
  }

  return new TextEncoder().encode(raw);
}

const JWT_VERIFY_OPTS: JWTVerifyOptions = {
  algorithms: ['HS256'],
  requiredClaims: ['iat', 'exp', 'sub'],
};

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
    this.secret = resolveJwtSecretBytes();
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
      const { payload } = await jwtVerify(token, this.secret, {
        ...JWT_VERIFY_OPTS,
        issuer: 'talak:auth',
        audience: 'talak:web3',
      });
      const jti = payload['jti'];
      if (typeof jti === 'string' && await this.revocations.isRevoked(jti)) return false;
      return true;
    } catch {
      return false;
    }
  }

  /** Sign a new JWT access token. */
  async signJwt(payload: SessionPayload): Promise<string> {
    const jti = randomBytes(16).toString('hex');
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('talak:auth')
      .setAudience('talak:web3')
      .setExpirationTime(`${this.accessTtlSeconds}s`)
      .setJti(jti)
      .setSubject(payload.address)
      .sign(this.secret);
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
    const normalized = address.toLowerCase();
    const sub = normalized;
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();
    return new SignJWT({ address: normalized, chainId } satisfies SessionPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setJti(jti)
      .setIssuedAt()
      .setIssuer('talak:auth')
      .setAudience('talak:web3')
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
      ({ payload } = await jwtVerify(token, this.secret, {
        ...JWT_VERIFY_OPTS,
        issuer: 'talak:auth',
        audience: 'talak:web3',
      }));
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
      const { payload } = await jwtVerify(accessToken, this.secret, {
        ...JWT_VERIFY_OPTS,
        issuer: 'talak:auth',
        audience: 'talak:web3',
      });
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
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
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
