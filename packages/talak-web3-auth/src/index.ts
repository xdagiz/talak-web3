import { SignJWT, jwtVerify, type JWTVerifyOptions, importPKCS8, importSPKI, type KeyLike, decodeProtectedHeader } from 'jose';
import { verifyMessage } from 'viem';
import { createHash, randomBytes, type KeyObject } from 'node:crypto';
import { TalakWeb3Error } from '@talak-web3/errors';
import type { TalakWeb3Auth as TalakWeb3AuthInterface } from '@talak-web3/types';
import type {
  NonceStore,
  RefreshSession,
  RefreshStore,
  RevocationStore,
} from './contracts.js';
import { createKeyProvider, type KeyProviderType, JwtManager } from './key-management.js';
import type { JwksResponse } from './jwks.js';

export type { NonceStore, RefreshSession, RefreshStore, RevocationStore } from './contracts.js';

interface SiweFields {
  domain: string;
  address: `0x${string}`;
  statement?: string | undefined;
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

  message = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = message.split('\n');

  const firstLine = lines[0]?.trim() ?? '';
  const domainMatch = firstLine.match(/^(.+?) wants you to sign in with your Ethereum account:/);
  const domain = domainMatch?.[1]?.trim();

  const addressLine = lines[1]?.trim() ?? '';
  const addressMatch = addressLine.match(/^(0x[a-fA-F0-9]{40})$/);

  let statement: string | undefined;
  let lineIndex = 2;

  while (lineIndex < lines.length && lines[lineIndex]?.trim() === '') {
    lineIndex++;
  }

  const potentialStatement = lines[lineIndex]?.trim();
  if (potentialStatement && !potentialStatement.startsWith('URI: ') && !potentialStatement.startsWith('Version: ')) {
    statement = potentialStatement;
    lineIndex++;
  }

  const uriMatch = message.match(/^URI: (.+)$/m);
  const versionMatch = message.match(/^Version: (.+)$/m);
  const chainIdMatch = message.match(/^Chain ID: (\d+)$/m);
  const nonceMatch = message.match(/^Nonce: ([A-Za-z0-9]+)$/m);
  const issuedAtMatch = message.match(/^Issued At: (.+)$/m);
  const expirationMatch = message.match(/^Expiration Time: (.+)$/m);
  const notBeforeMatch = message.match(/^Not Before: (.+)$/m);
  const requestIdMatch = message.match(/^Request ID: (.+)$/m);

  const resourcesMatch = message.match(/^Resources:\n([\s\S]*?)(?:\n\n|$)/m);
  const resources = resourcesMatch && resourcesMatch[1]
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

export class InMemoryNonceStore implements NonceStore {
  private readonly ttlMs: number;

  private readonly entries = new Map<string, Map<string, number>>();

  constructor(opts: { ttlMs?: number } = {}) {
    this.ttlMs = Math.min(opts.ttlMs ?? 5 * 60_000, 5 * 60_000);
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

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export class InMemoryRefreshStore implements RefreshStore {
  private readonly sessions = new Map<string, RefreshSession>();

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

    this.sessions.set(hash, { ...old, revoked: true });

    return this.create(old.address, old.chainId, ttlMs);
  }

  async revoke(token: string): Promise<void> {
    const hash = sha256Hex(token);
    const session = this.sessions.get(hash);
    if (session) this.sessions.set(hash, { ...session, revoked: true });
  }
}

export class InMemoryRevocationStore implements RevocationStore {
  private readonly entries = new Map<string, number>();
  private globalInvalidationAt = 0;

  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    this.entries.set(jti, expiresAtMs);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const exp = this.entries.get(jti);
    if (exp === undefined) return false;
    if (Date.now() > exp) { this.entries.delete(jti); return false; }
    return true;
  }

  async setGlobalInvalidationTime(ts: number): Promise<void> {
    this.globalInvalidationAt = ts;
  }

  async getGlobalInvalidationTime(): Promise<number> {
    return this.globalInvalidationAt;
  }
}

const JWT_VERIFY_OPTS: JWTVerifyOptions = {
  algorithms: ['RS256'],
  requiredClaims: ['iat', 'exp', 'sub', 'jti', 'iss', 'aud'],
  issuer: 'talak:auth',
  audience: 'talak:web3',
};

export interface SessionPayload {
  address: string;
  chainId: number;
}

export class TalakWeb3Auth implements TalakWeb3AuthInterface {
  private readonly jwtManager: JwtManager;
  private readonly nonceStore: NonceStore;
  private readonly refreshStore: RefreshStore;
  private readonly revocations: RevocationStore;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlMs: number;
  private readonly expectedDomain: string | undefined;

  constructor(opts: {
    nonceStore: NonceStore;
    refreshStore: RefreshStore;
    revocationStore: RevocationStore;
    accessTtlSeconds?: number;
    refreshTtlSeconds?: number;
    expectedDomain?: string;
    keyProviderType?: KeyProviderType;
    keyProviderOptions?: any;
    keyRotationConfig?: any;
  }) {
    if (!opts || !opts.nonceStore || !opts.refreshStore || !opts.revocationStore) {
      throw new TalakWeb3Error(
        'CRITICAL: Mandatory auth stores (nonce, refresh, revocation) are missing from the configuration. This is a fatal error in production.',
        { code: 'AUTH_STORES_MISSING', status: 500 }
      );
    }

    this.nonceStore = opts.nonceStore;
    this.refreshStore = opts.refreshStore;
    this.revocations = opts.revocationStore;
    this.accessTtlSeconds = opts.accessTtlSeconds ?? 15 * 60;
    this.refreshTtlMs = (opts.refreshTtlSeconds ?? 7 * 24 * 60 * 60) * 1000;
    this.expectedDomain = opts.expectedDomain ?? process.env['SIWE_DOMAIN'] ?? undefined;

    const keyProviderType = opts.keyProviderType ?? 'environment';
    const keyProviderOptions = opts.keyProviderOptions ?? {};
    const keyProvider = createKeyProvider(keyProviderType, keyProviderOptions, opts.keyRotationConfig);
    this.jwtManager = new JwtManager(keyProvider);
  }

  async coldStart(): Promise<void> {

  }

  async validateJwt(token: string): Promise<boolean> {
    try {
      const payload = await this.jwtManager.verify(token, {
        issuer: 'talak:auth',
        audience: 'talak:web3',
        requiredClaims: ['iat', 'exp', 'sub', 'jti', 'iss', 'aud'],
      });

      const iat = payload['iat'];
      if (typeof iat === 'number') {
        const globalInvalidationAt = await this.revocations.getGlobalInvalidationTime();
        if (iat < globalInvalidationAt) return false;
      }

      const jti = payload['jti'];
      if (typeof jti === 'string' && await this.revocations.isRevoked(jti)) return false;
      return true;
    } catch {
      return false;
    }
  }

  async forceGlobalInvalidation(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.revocations.setGlobalInvalidationTime(now);
  }

  private async getGlobalInvalidationTime(): Promise<number> {
    return await this.revocations.getGlobalInvalidationTime();
  }

  async emergencyKeyRotation(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {

    const kid = await (this.jwtManager as any).emergencyPurge(newPrivateKey, newPublicKey);

    await this.forceGlobalInvalidation();

    return kid;
  }

  async signJwt(payload: SessionPayload): Promise<string> {
    const jti = randomBytes(16).toString('hex');
    return this.jwtManager.sign(payload, {
      issuer: 'talak:auth',
      audience: 'talak:web3',
      expiresIn: `${this.accessTtlSeconds}s`,
      subject: payload.address,
      jti,
    });
  }

  async loginWithSiwe(message: string, signature: string): Promise<{ accessToken: string; refreshToken: string }> {
    const fields = parseSiweMessage(message);

    if (this.expectedDomain && fields.domain !== this.expectedDomain) {
      throw new TalakWeb3Error('SIWE domain mismatch', { code: 'AUTH_SIWE_DOMAIN_MISMATCH', status: 401, data: { domain: fields.domain } });
    }

    if (fields.expirationTime) {
      if (new Date(fields.expirationTime) < new Date()) {
        throw new TalakWeb3Error('SIWE message has expired', { code: 'AUTH_SIWE_EXPIRED', status: 401 });
      }
    }

    const valid = await verifyMessage({
      address: fields.address,
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      throw new TalakWeb3Error('Invalid SIWE signature', { code: 'AUTH_SIWE_INVALID_SIG', status: 401 });
    }

    const consumed = await this.nonceStore.consume(fields.address.toLowerCase(), fields.nonce);
    if (!consumed) {
      throw new TalakWeb3Error('SIWE nonce invalid or already used', { code: 'AUTH_SIWE_NONCE_REPLAY', status: 401 });
    }

    if (!valid) {
      throw new TalakWeb3Error('Invalid SIWE signature', { code: 'AUTH_SIWE_INVALID_SIG', status: 401 });
    }

    return this._issueTokenPair(fields.address, fields.chainId);
  }

  async createSession(address: string, chainId: number): Promise<string> {
    return this._issueAccessToken(address, chainId);
  }

  private async _issueAccessToken(address: string, chainId: number): Promise<string> {
    const normalized = address.toLowerCase();
    const sub = normalized;
    return this.jwtManager.sign({ address: normalized, chainId } satisfies SessionPayload, {
      issuer: 'talak:auth',
      audience: 'talak:web3',
      expiresIn: `${this.accessTtlSeconds}s`,
      subject: sub,
      jti: crypto.randomUUID(),
    });
  }

  private async _issueTokenPair(address: string, chainId: number): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, { token: refreshToken }] = await Promise.all([
      this._issueAccessToken(address, chainId),
      this.refreshStore.create(address, chainId, this.refreshTtlMs),
    ]);
    return { accessToken, refreshToken };
  }

  async getJwks(): Promise<JwksResponse> {
    return this.jwtManager.getJwks();
  }

  async verifySession(token: string): Promise<SessionPayload> {
    let payload;
    try {
      payload = await this.jwtManager.verify(token, {
        issuer: 'talak:auth',
        audience: 'talak:web3',
        requiredClaims: ['iat', 'exp', 'sub', 'jti', 'iss', 'aud'],
      });
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

  async revokeSession(accessToken: string, refreshToken?: string): Promise<void> {

    try {
      const payload = await this.jwtManager.verify(accessToken, {
        issuer: 'talak:auth',
        audience: 'talak:web3',
        requiredClaims: ['iat', 'exp', 'sub', 'jti', 'iss', 'aud'],
      });

      const jti = payload['jti'];
      const exp = payload['exp'];
      if (typeof jti === 'string' && typeof exp === 'number') {
        await this.revocations.revoke(jti, exp * 1000);
      }
    } catch {

    }

    if (refreshToken) {
      await this.refreshStore.revoke(refreshToken);
    }
  }

  generateNonce(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async createNonce(address: string, meta?: { ip?: string; ua?: string }): Promise<string> {
    return this.nonceStore.create(address.toLowerCase(), meta);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {

    const { session, token: newRefreshToken } = await this.refreshStore.rotate(refreshToken, this.refreshTtlMs);

    const accessToken = await this._issueAccessToken(session.address, session.chainId);
    return { accessToken, refreshToken: newRefreshToken };
  }
}
