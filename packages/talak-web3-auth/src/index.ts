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
import { getAuthoritativeTime, type AuthoritativeTime } from './time.js';

export type { NonceStore, RefreshSession, RefreshStore, RevocationStore } from './contracts.js';

// ---------------------------------------------------------------------------
// SIWE message parsing (EIP-4361)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SIWE Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Validate that a domain is a valid hostname per RFC 1123
 */
function isValidHostname(domain: string): boolean {
  try {
    // Test if it can be parsed as a URL hostname
    new URL(`https://${domain}`);
    // Additional check: must not contain protocol or path
    return !domain.includes('://') && !domain.includes('/');
  } catch {
    return false;
  }
}

/**
 * Validate issued-at timestamp is within tolerance (prevent old message replay)
 * Default tolerance: 5 minutes
 */
function validateIssuedAt(issuedAt: string, toleranceMs: number = 5 * 60_000, nowFn: () => number = Date.now): void {
  const issuedTime = new Date(issuedAt).getTime();
  const now = nowFn();
  
  if (isNaN(issuedTime)) {
    throw new TalakWeb3Error('Invalid SIWE issued-at timestamp', {
      code: 'AUTH_SIWE_PARSE_ERROR',
      status: 400,
    });
  }
  
  if (Math.abs(now - issuedTime) > toleranceMs) {
    throw new TalakWeb3Error('SIWE message timestamp out of tolerance - possible replay attack', {
      code: 'AUTH_SIWE_TIME_DRIFT',
      status: 401,
    });
  }
}

/**
 * Validate chainId is in the allowed set
 */
function validateChainId(chainId: number, allowedChains: number[]): void {
  if (allowedChains.length > 0 && !allowedChains.includes(chainId)) {
    throw new TalakWeb3Error('Chain ID not allowed', {
      code: 'AUTH_CHAIN_NOT_ALLOWED',
      status: 400,
      data: { chainId, allowedChains },
    });
  }
}

// ---------------------------------------------------------------------------
// SIWE Parsing
// ---------------------------------------------------------------------------

function parseSiweMessage(message: string): SiweFields {
  // Normalize Unicode to NFC form for deterministic interpretation
  // This ensures consistent parsing across different systems and locales
  const originalMessage = message;
  message = message.normalize('NFC');
  
  // Log warning if normalization changed the message (edge case)
  if (message !== originalMessage) {
    console.warn('[SIWE] Message contained non-NFC characters, normalized');
  }
  
  // Normalize line endings
  message = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Validate message length to prevent DoS
  if (message.length > 10000) {
    throw new TalakWeb3Error('SIWE message too long', { 
      code: 'AUTH_SIWE_PARSE_ERROR', 
      status: 400,
    });
  }
  
  const lines = message.split('\n');
  
  // Line 0: "<domain> wants you to sign in with your Ethereum account:"
  const firstLine = lines[0]?.trim() ?? '';
  const domainMatch = firstLine.match(/^(.+?) wants you to sign in with your Ethereum account:/);
  const domain = domainMatch?.[1]?.trim();
  
  // Validate domain is a valid hostname
  if (!domain || domain.length > 253 || !isValidHostname(domain)) {
    throw new TalakWeb3Error('Invalid SIWE domain', { 
      code: 'AUTH_SIWE_PARSE_ERROR', 
      status: 400,
    });
  }
  
  // Line 1: The wallet address
  const addressLine = lines[1]?.trim() ?? '';
  const addressMatch = addressLine.match(/^(0x[a-fA-F0-9]{40})$/);
  
  if (!addressMatch?.[1]) {
    throw new TalakWeb3Error('Invalid SIWE address format', { 
      code: 'AUTH_SIWE_PARSE_ERROR', 
      status: 400,
    });
  }
  
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
    // Validate statement length
    if (potentialStatement.length > 1000) {
      throw new TalakWeb3Error('SIWE statement too long', { 
        code: 'AUTH_SIWE_PARSE_ERROR', 
        status: 400,
      });
    }
    statement = potentialStatement;
    lineIndex++;
  }
  
  // Parse remaining fields - ensure single occurrence
  const uriMatches = message.match(/^URI: (.+)$/gm);
  if (uriMatches && uriMatches.length > 1) {
    throw new TalakWeb3Error('Multiple URI fields detected', { 
      code: 'AUTH_SIWE_PARSE_ERROR', 
      status: 400,
    });
  }
  
  const nonceMatches = message.match(/^Nonce: ([A-Za-z0-9]+)$/gm);
  if (nonceMatches && nonceMatches.length > 1) {
    throw new TalakWeb3Error('Multiple Nonce fields detected', { 
      code: 'AUTH_SIWE_PARSE_ERROR', 
      status: 400,
    });
  }
  
  const uriMatch = message.match(/^URI: (.+)$/m);
  const versionMatch = message.match(/^Version: (.+)$/m);
  const chainIdMatch = message.match(/^Chain ID: (\d+)$/m);
  const nonceMatch = message.match(/^Nonce: ([A-Za-z0-9]+)$/m);
  const issuedAtMatch = message.match(/^Issued At: (.+)$/m);
  const expirationMatch = message.match(/^Expiration Time: (.+)$/m);
  const notBeforeMatch = message.match(/^Not Before: (.+)$/m);
  const requestIdMatch = message.match(/^Request ID: (.+)$/m);
  
  // Validate URI format
  if (uriMatch?.[1]) {
    try {
      new URL(uriMatch[1]);
    } catch {
      throw new TalakWeb3Error('Invalid SIWE URI format', { 
        code: 'AUTH_SIWE_PARSE_ERROR', 
        status: 400,
      });
    }
  }
  
  // Validate nonce format and length
  if (nonceMatch?.[1] && (nonceMatch[1].length < 8 || nonceMatch[1].length > 128)) {
    throw new TalakWeb3Error('Invalid SIWE nonce length', { 
      code: 'AUTH_SIWE_PARSE_ERROR', 
      status: 400,
    });
  }
  
  // Parse resources (can be multiple lines)
  const resourcesMatch = message.match(/^Resources:\n([\s\S]*?)(?:\n\n|$)/m);
  const resources = resourcesMatch && resourcesMatch[1]
    ? resourcesMatch[1]
        .split('\n')
        .map(r => r.replace(/^- /, '').trim())
        .filter(r => r.length > 0)
        .slice(0, 10) // Limit to 10 resources
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

// ---------------------------------------------------------------------------
// Security: Enhanced JWT Management with Key Rotation Support
// ---------------------------------------------------------------------------

const JWT_VERIFY_OPTS: JWTVerifyOptions = {
  algorithms: ['RS256'],
  requiredClaims: ['iat', 'exp', 'sub', 'jti', 'iss', 'aud'],
  issuer: 'talak:auth',
  audience: 'talak:web3',
};

// ---------------------------------------------------------------------------
// Session payload
// ---------------------------------------------------------------------------

export interface SessionPayload {
  address: string;
  chainId: number;
  /** SHA-256 hash of IP + User-Agent for token binding */
  contextHash?: string;
  /** IP subnet (/24) for NAT tolerance */
  ipSubnet?: string;
}

// TalakWeb3Auth
// ---------------------------------------------------------------------------

export class TalakWeb3Auth implements TalakWeb3AuthInterface {
  private readonly jwtManager: JwtManager;
  private readonly nonceStore: NonceStore;
  private readonly refreshStore: RefreshStore;
  private readonly revocations: RevocationStore;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlMs: number;
  private readonly expectedDomain: string | undefined;
  private readonly timeSource: AuthoritativeTime;
  private readonly contextEnforcementDate: number;

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
    timeSource?: AuthoritativeTime;
    contextEnforcementDate?: Date;
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
    this.accessTtlSeconds = opts.accessTtlSeconds ?? 15 * 60; // 15 min
    this.refreshTtlMs = (opts.refreshTtlSeconds ?? 7 * 24 * 60 * 60) * 1000; // 7 days
    this.expectedDomain = opts.expectedDomain ?? process.env['SIWE_DOMAIN'] ?? undefined;
    this.timeSource = opts.timeSource ?? getAuthoritativeTime();
    this.contextEnforcementDate = opts.contextEnforcementDate?.getTime() ?? 
      new Date('2025-06-01T00:00:00Z').getTime(); // Grace period until June 2025
    
    // Initialize JWT manager with key provider
    const keyProviderType = opts.keyProviderType ?? 'environment';
    const keyProviderOptions = opts.keyProviderOptions ?? {};
    const keyProvider = createKeyProvider(keyProviderType, keyProviderOptions, opts.keyRotationConfig);
    this.jwtManager = new JwtManager(keyProvider);
  }

  async coldStart(): Promise<void> {
    // JWT manager initializes automatically on first use
    // No explicit cold start needed with new architecture
  }

  /** Verify any JWT access token — returns true/false. */
  async validateJwt(token: string): Promise<boolean> {
    try {
      const payload = await this.jwtManager.verify(token, {
        issuer: 'talak:auth',
        audience: 'talak:web3',
        requiredClaims: ['iat', 'exp', 'sub', 'jti', 'iss', 'aud'],
      });
      
      // Check global invalidation
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

  /**
   * Emergency: Force global token invalidation.
   * All tokens issued before this moment will become invalid.
   */
  async forceGlobalInvalidation(): Promise<void> {
    const now = Math.floor(this.timeSource.now() / 1000);
    await this.revocations.setGlobalInvalidationTime(now);
  }

  private async getGlobalInvalidationTime(): Promise<number> {
    return await this.revocations.getGlobalInvalidationTime();
  }

  /**
   * Emergency: Purge all keys and rotate to a new one immediately.
   */
  async emergencyKeyRotation(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {
    // 1. Purge JWKS
    const kid = await (this.jwtManager as any).emergencyPurge(newPrivateKey, newPublicKey);
    
    // 2. Force global invalidation
    await this.forceGlobalInvalidation();
    
    return kid;
  }

  /** Sign a new JWT access token using RS256 and the latest primary key. */
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

  /**
   * Verify a SIWE message + signature and issue both tokens.
   * Returns `{ accessToken, refreshToken }` where:
   *   - accessToken: short-lived JWT (15 min)
   *   - refreshToken: opaque random string (7 days)
   * 
   * @param context - Optional request context for token binding (IP + User-Agent)
   */
  async loginWithSiwe(
    message: string, 
    signature: string,
    context?: { ip: string; userAgent: string }
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // CRITICAL: Normalize to NFC BEFORE any processing to ensure signed bytes match parsed semantics
    const normalizedMessage = message.normalize('NFC');
    
    const fields = parseSiweMessage(normalizedMessage);

    if (this.expectedDomain && fields.domain !== this.expectedDomain) {
      throw new TalakWeb3Error('SIWE domain mismatch', { code: 'AUTH_SIWE_DOMAIN_MISMATCH', status: 401, data: { domain: fields.domain } });
    }

    // Validate issued-at timestamp to prevent replay of old messages
    validateIssuedAt(fields.issuedAt, 5 * 60_000, () => this.timeSource.now()); // 5 minute tolerance

    // Check SIWE message expiration
    if (fields.expirationTime) {
      if (new Date(fields.expirationTime) < new Date()) {
        throw new TalakWeb3Error('SIWE message has expired', { code: 'AUTH_SIWE_EXPIRED', status: 401 });
      }
    }

    // CRITICAL: Verify signature on NORMALIZED message (same bytes as parsed)
    const valid = await verifyMessage({
      address: fields.address,
      message: normalizedMessage,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      throw new TalakWeb3Error('Invalid SIWE signature', { code: 'AUTH_SIWE_INVALID_SIG', status: 401 });
    }

    // Atomic nonce consume — must succeed to prevent replay
    const consumed = await this.nonceStore.consume(fields.address.toLowerCase(), fields.nonce);
    if (!consumed) {
      throw new TalakWeb3Error('SIWE nonce invalid or already used', { code: 'AUTH_SIWE_NONCE_REPLAY', status: 401 });
    }

    return this._issueTokenPair(fields.address, fields.chainId, context);
  }

  /** Create a session for a given address + chainId (without SIWE — e.g. for testing). */
  async createSession(address: string, chainId: number): Promise<string> {
    return this._issueAccessToken(address, chainId);
  }

  /** Internal: issue an access JWT using RS256. */
  private async _issueAccessToken(
    address: string, 
    chainId: number, 
    context?: { ip: string; userAgent: string }
  ): Promise<string> {
    const normalized = address.toLowerCase();
    const sub = normalized;
    
    // Create context binding hash if context provided
    let contextHash: string | undefined;
    let ipSubnet: string | undefined;
    if (context) {
      // Extract /30 subnet for NAT tolerance (4 IPs max - true NAT scenarios only)
      const ipParts = context.ip.split('.');
      if (ipParts.length === 4 && ipParts[3] !== undefined) {
        const lastOctet = parseInt(ipParts[3]);
        const subnetLastOctet = lastOctet & 0xFC;  // /30 = mask last 2 bits
        ipSubnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${subnetLastOctet}/30`;
      }
      
      // Hash IP + User-Agent for binding
      const contextString = `${context.ip}|${context.userAgent}`;
      contextHash = createHash('sha256').update(contextString).digest('hex');
    }
    
    return this.jwtManager.sign(
      { 
        address: normalized, 
        chainId,
        ...(contextHash && { contextHash }),
        ...(ipSubnet && { ipSubnet }),
      } satisfies SessionPayload, 
      {
        issuer: 'talak:auth',
        audience: 'talak:web3',
        expiresIn: `${this.accessTtlSeconds}s`,
        subject: sub,
        jti: crypto.randomUUID(),
      }
    );
  }

  /** Internal: issue both an access JWT and an opaque refresh token. */
  private async _issueTokenPair(
    address: string, 
    chainId: number, 
    context?: { ip: string; userAgent: string }
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, { token: refreshToken }] = await Promise.all([
      this._issueAccessToken(address, chainId, context),
      this.refreshStore.create(address, chainId, this.refreshTtlMs),
    ]);
    return { accessToken, refreshToken };
  }

  /** Get JSON Web Key Set (JWKS) for public key discovery. */
  async getJwks(): Promise<JwksResponse> {
    return this.jwtManager.getJwks();
  }

  /** 
   * Verify an access JWT and return its payload. Supports key rotation via 'kid'.
   * 
   * @param context - Optional request context to validate token binding
   */
  async verifySession(
    token: string, 
    context?: { ip: string; userAgent: string }
  ): Promise<SessionPayload> {
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

    // Validate token context binding if context is provided
    if (context) {
      const tokenContextHash = payload['contextHash'];
      const tokenIpSubnet = payload['ipSubnet'];
      
      if (typeof tokenContextHash === 'string' && tokenContextHash.length > 0) {
        // Token has context binding - validate it
        const currentContextHash = createHash('sha256')
          .update(`${context.ip}|${context.userAgent}`)
          .digest('hex');
        
        // Exact match
        if (currentContextHash === tokenContextHash) {
          // Perfect match - accept
        } else if (tokenIpSubnet && typeof tokenIpSubnet === 'string') {
          // Check if IP is in the same /30 subnet (NAT tolerance - 4 IPs max)
          const ipParts = context.ip.split('.');
          if (ipParts.length === 4 && ipParts[3] !== undefined) {
            const lastOctet = parseInt(ipParts[3]);
            const subnetLastOctet = lastOctet & 0xFC;
            const currentSubnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${subnetLastOctet}/30`;
            if (currentSubnet === tokenIpSubnet) {
              // Same /30 subnet - accept (true NAT scenario)
              console.debug('[AUTH] Token accepted with NAT tolerance', { subnet: currentSubnet });
            } else {
              // Different subnet - reject
              throw new TalakWeb3Error('Token context mismatch - possible token theft', { 
                code: 'AUTH_TOKEN_CONTEXT_MISMATCH', 
                status: 401 
              });
            }
          } else {
            // IPv6 or invalid - reject
            throw new TalakWeb3Error('Token context mismatch - possible token theft', { 
              code: 'AUTH_TOKEN_CONTEXT_MISMATCH', 
              status: 401 
            });
          }
        } else {
          // No subnet info, hash mismatch - reject
          throw new TalakWeb3Error('Token context mismatch - possible token theft', { 
            code: 'AUTH_TOKEN_CONTEXT_MISMATCH', 
            status: 401 
          });
        }
      } else if (this.timeSource.now() > this.contextEnforcementDate) {
        // Token has no contextHash and enforcement date has passed
        throw new TalakWeb3Error('Token binding required - please re-authenticate', { 
          code: 'AUTH_CONTEXT_REQUIRED', 
          status: 401 
        });
      } else {
        // Before enforcement date, log warning for migration tracking
        console.warn('[AUTH] Token without context binding used - re-auth required after enforcement date');
      }
    }

    return { address, chainId };
  }

  /** Revoke an access token by JTI. Optionally revoke a refresh token too. */
  async revokeSession(accessToken: string, refreshToken?: string): Promise<void> {
    // Revoke access token JTI
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
      // Invalid access token - nothing to revoke
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
