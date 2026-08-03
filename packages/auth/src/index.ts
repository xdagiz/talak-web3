import { createHash, randomBytes, randomUUID } from "node:crypto";

import { TalakWeb3Error, AUTH_ERROR_CODES } from "@talak-web3/errors";
import type { TalakWeb3Auth as TalakWeb3AuthInterface } from "@talak-web3/types";
import type { JwksResponse, SessionPayload } from "@talak-web3/types";
import type { KeyObject } from "jose";
import { verifyMessage } from "viem";

import type { NonceStore, RefreshSession, RefreshStore, RevocationStore } from "./contracts.js";
import type { KeyRotationConfig } from "./jwks.js";
import { createKeyProvider, type KeyProviderType, JwtManager } from "./key-management.js";
import { assertProductionSafeStores, TALAK_STORE_KIND, type TalakStoreKind } from "./store-kind.js";
import { getAuthoritativeTime, type AuthoritativeTime } from "./time.js";

export type { NonceStore, RefreshSession, RefreshStore, RevocationStore } from "./contracts.js";
export type { SessionPayload } from "@talak-web3/types";
export type { KeyProviderType } from "./key-management.js";
export { AuthoritativeTime } from "./time.js";
export {
  assertProductionSafeStores,
  getStoreKind,
  isMemoryStore,
  TALAK_STORE_KIND,
  type TalakStoreKind,
} from "./store-kind.js";
type KeyLike = CryptoKey | KeyObject;

export type SignatureVerifier = (args: {
  address: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}) => Promise<boolean>;

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

function isValidHostname(domain: string): boolean {
  try {
    void new URL(`https://${domain}`);
    return !domain.includes("://") && !domain.includes("/");
  } catch {
    return false;
  }
}

const SIWE_DOMAIN_REGEX =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(?::(\d{1,5}))? wants you to sign in with your Ethereum account:/;

/**
 * Extracts and validates the domain from the first line of a SIWE message.
 *
 * Per EIP-4361 the domain is an RFC 3986 authority, so an optional numeric
 * port is accepted (`example.com:3388`) and range-checked (0–65535). Rejects
 * URL-prefixed (`https://example.com wants you...`) and path-suffixed
 * (`example.com/path wants you...`) domains, consecutive dots, leading or
 * trailing hyphens, and empty or out-of-range ports. Returns `null` when the
 * domain is missing or invalid. Shared by {@link parseSiweMessage} and the
 * core auth handler.
 */
export function extractSiweDomain(message: string): string | null {
  const firstLine = message.split("\n")[0]?.trim() ?? "";
  const domainMatch = firstLine.match(SIWE_DOMAIN_REGEX);
  const host = domainMatch?.[1]?.trim();
  const port = domainMatch?.[5];
  if (!host || host.length > 253 || !isValidHostname(host)) return null;
  if (port !== undefined && Number(port) > 65535) return null;
  return port !== undefined ? `${host}:${port}` : host;
}

function validateIssuedAt(
  issuedAt: string,
  toleranceMs: number = 5 * 60_000,
  nowFn: () => number = Date.now,
): void {
  const issuedTime = new Date(issuedAt).getTime();
  const now = nowFn();

  if (isNaN(issuedTime)) {
    throw new TalakWeb3Error("Invalid SIWE issued-at timestamp", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
    });
  }

  if (Math.abs(now - issuedTime) > toleranceMs) {
    throw new TalakWeb3Error("SIWE message timestamp out of tolerance - possible replay attack", {
      code: AUTH_ERROR_CODES.SIWE_TIME_DRIFT,
      status: 401,
    });
  }
}

function validateChainId(chainId: number, allowedChains: number[]): void {
  if (allowedChains.length > 0 && !allowedChains.includes(chainId)) {
    throw new TalakWeb3Error("Chain ID not allowed", {
      code: AUTH_ERROR_CODES.CHAIN_NOT_ALLOWED,
      status: 400,
      data: { chainId, allowedChains },
    });
  }
}

export function parseSiweMessage(message: string): SiweFields {
  const originalMessage = message;
  message = message.normalize("NFC");

  if (message !== originalMessage) {
    console.warn("[SIWE] Message contained non-NFC characters, normalized");
  }

  message = message.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (message.length > 10000) {
    throw new TalakWeb3Error("SIWE message too long", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
    });
  }

  const lines = message.split("\n");

  const domain = extractSiweDomain(message);

  if (!domain) {
    throw new TalakWeb3Error("Invalid SIWE domain", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
    });
  }

  let addressLine = lines[1]?.trim() ?? "";
  if (!addressLine) addressLine = lines[2]?.trim() ?? "";
  const addressMatch = addressLine.match(/^(0x[a-fA-F0-9]{40})$/);

  if (!addressMatch?.[1]) {
    throw new TalakWeb3Error("Invalid SIWE address format", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
    });
  }

  let statement: string | undefined;
  const statementMatch = message.match(/(?:^|\n)0x[a-fA-F0-9]{40}\n\n(?<statement>[^\n]+)\n\n/m);

  const potentialStatement = statementMatch?.groups?.statement?.trim();
  if (
    potentialStatement &&
    !/^(URI|Version|Chain ID|Nonce|Issued At|Expiration Time|Not Before|Request ID|Resources):/.test(
      potentialStatement,
    )
  ) {
    if (potentialStatement.length > 1000) {
      throw new TalakWeb3Error("SIWE statement too long", {
        code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
        status: 400,
      });
    }
    statement = potentialStatement;
  }

  const uriMatches = message.match(/^URI: (.+)$/gm);
  if (uriMatches && uriMatches.length > 1) {
    throw new TalakWeb3Error("Multiple URI fields detected", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
    });
  }

  const nonceMatches = message.match(/^Nonce: ([A-Za-z0-9]+)$/gm);
  if (nonceMatches && nonceMatches.length > 1) {
    throw new TalakWeb3Error("Multiple Nonce fields detected", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
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

  if (uriMatch?.[1]) {
    try {
      void new URL(uriMatch[1]);
    } catch (cause) {
      throw new TalakWeb3Error("Invalid SIWE URI format", {
        code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
        status: 400,
        cause,
      });
    }
  }

  if (nonceMatch?.[1] && (nonceMatch[1].length < 8 || nonceMatch[1].length > 128)) {
    throw new TalakWeb3Error("Invalid SIWE nonce length", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
    });
  }

  const resourcesMatch = message.match(/^Resources:\n((?:- [^\n]+(?:\n|$))+)/m);
  const resources =
    resourcesMatch && resourcesMatch[1]
      ? resourcesMatch[1]
          .split("\n")
          .map((r) => r.replace(/^- /, "").trim())
          .filter((r) => r.length > 0)
          .slice(0, 10)
      : undefined;

  if (
    !domain ||
    !addressMatch?.[1] ||
    !chainIdMatch?.[1] ||
    !nonceMatch?.[1] ||
    !issuedAtMatch?.[1]
  ) {
    throw new TalakWeb3Error("Invalid SIWE message format", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
      data: {
        hasDomain: !!domain,
        hasAddress: !!addressMatch?.[1],
        hasChainId: !!chainIdMatch?.[1],
        hasNonce: !!nonceMatch?.[1],
        hasIssuedAt: !!issuedAtMatch?.[1],
      },
    });
  }

  // https://eips.ethereum.org/EIPS/eip-4361#message-fields
  const version = versionMatch?.[1] ?? "1";
  if (version !== "1") {
    throw new TalakWeb3Error("Unsupported SIWE version", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
      data: { version },
    });
  }

  // https://eips.ethereum.org/EIPS/eip-4361#abnf-message-format
  const nonce = nonceMatch[1];
  if (!/^[A-Za-z0-9]+$/.test(nonce)) {
    throw new TalakWeb3Error("SIWE nonce must be alphanumeric", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
    });
  }

  // https://eips.ethereum.org/EIPS/eip-4361#message-fields
  const uri = uriMatch?.[1] ?? "";
  if (uri && !uri.startsWith("/") && !uri.startsWith("https://") && !uri.startsWith("http://")) {
    throw new TalakWeb3Error("Invalid SIWE URI format", {
      code: AUTH_ERROR_CODES.SIWE_PARSE_ERROR,
      status: 400,
    });
  }

  return {
    domain,
    address: addressMatch[1] as `0x${string}`,
    statement,
    uri: uriMatch?.[1] ?? "",
    version: versionMatch?.[1] ?? "1",
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
  readonly [TALAK_STORE_KIND]: TalakStoreKind = "memory";
  readonly talakStoreKind: TalakStoreKind = "memory";
  private readonly ttlMs: number;

  private readonly entries = new Map<string, Map<string, number>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(opts: { ttlMs?: number } = {}) {
    this.ttlMs = Math.min(opts.ttlMs ?? 5 * 60_000, 5 * 60_000);
    console.warn(
      "[talak-web3-auth] InMemoryNonceStore is in use. " +
        "This is NOT suitable for production. Use RedisNonceStore from @talak-web3/auth/stores with REDIS_URL.",
    );
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [addr, m] of this.entries.entries()) {
        for (const [nonce, expiresAt] of m.entries()) {
          if (now > expiresAt) {
            m.delete(nonce);
          }
        }
        if (m.size === 0) {
          this.entries.delete(addr);
        }
      }
    }, 60_000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async create(address: string, _meta?: { ip?: string; ua?: string }): Promise<string> {
    const addr = address.toLowerCase();
    const nonce = randomUUID().replace(/-/g, "");
    const expiresAt = Date.now() + this.ttlMs;
    let m = this.entries.get(addr);
    if (!m) {
      m = new Map();
      this.entries.set(addr, m);
    }
    m.set(nonce, expiresAt);
    return nonce;
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const m = this.entries.get(addr);
    if (!m) return false;
    const expiresAt = m.get(nonce);
    if (expiresAt === undefined) return false;
    if (Date.now() > expiresAt) {
      m.delete(nonce);
      return false;
    }
    m.delete(nonce);
    if (m.size === 0) this.entries.delete(addr);
    return true;
  }
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Derive a coarse IP subnet for NAT-tolerant token binding (IPv4 /30 or IPv6 /64). */
function computeIpSubnet(ip: string): string | undefined {
  const ipv4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4Mapped?.[1]) {
    ip = ipv4Mapped[1];
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(":")}::/64`;
    }
    const head = ip.split("::")[0];
    return head ? `${head}::/64` : undefined;
  }
  const octets = ip.split(".");
  if (octets.length === 4 && octets[3] !== undefined) {
    const lastOctet = parseInt(octets[3], 10);
    if (Number.isNaN(lastOctet)) return undefined;
    const subnetLastOctet = lastOctet & 0xfc;
    return `${octets[0]}.${octets[1]}.${octets[2]}.${subnetLastOctet}/30`;
  }
  return undefined;
}

export class InMemoryRefreshStore implements RefreshStore {
  readonly [TALAK_STORE_KIND]: TalakStoreKind = "memory";
  readonly talakStoreKind: TalakStoreKind = "memory";
  private readonly sessions = new Map<string, RefreshSession>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [hash, session] of this.sessions.entries()) {
        if (now > session.expiresAt) {
          this.sessions.delete(hash);
        }
      }
    }, 60_000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async create(
    address: string,
    chainId: number,
    ttlMs: number,
  ): Promise<{ token: string; session: RefreshSession }> {
    const addr = address.toLowerCase();
    const token = randomBytes(32).toString("base64url");
    const hash = sha256Hex(token);
    const id = randomBytes(16).toString("hex");
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
    if (!old)
      throw new TalakWeb3Error("Refresh session not found", {
        code: AUTH_ERROR_CODES.REFRESH_NOT_FOUND,
        status: 401,
      });
    if (old.revoked)
      throw new TalakWeb3Error("Refresh token already used or revoked", {
        code: AUTH_ERROR_CODES.REFRESH_REVOKED,
        status: 401,
      });
    if (Date.now() > old.expiresAt)
      throw new TalakWeb3Error("Refresh token expired", {
        code: AUTH_ERROR_CODES.REFRESH_EXPIRED,
        status: 401,
      });

    // Single-process check-and-set: mark revoked before await so concurrent
    // rotate() callers cannot both succeed. Not multi-process safe — use RedisRefreshStore.
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
  readonly [TALAK_STORE_KIND]: TalakStoreKind = "memory";
  readonly talakStoreKind: TalakStoreKind = "memory";
  private readonly entries = new Map<string, number>();
  private globalInvalidationAt = 0;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [jti, expiresAt] of this.entries.entries()) {
        if (now > expiresAt) {
          this.entries.delete(jti);
        }
      }
    }, 60_000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    this.entries.set(jti, expiresAtMs);
  }

  async isRevoked(jti: string): Promise<boolean> {
    const exp = this.entries.get(jti);
    if (exp === undefined) return false;
    if (Date.now() > exp) {
      this.entries.delete(jti);
      return false;
    }
    return true;
  }

  async setGlobalInvalidationTime(ts: number): Promise<void> {
    this.globalInvalidationAt = ts;
  }

  async getGlobalInvalidationTime(): Promise<number> {
    return this.globalInvalidationAt;
  }
}

interface JwtPayload {
  sub: string;
  address: string;
  chainId: number;
  iat: number;
  exp: number;
  jti: string;
  contextHash?: string | undefined;
  ipSubnet?: string | undefined;
  iss?: string | undefined;
  aud?: string | undefined;
}

function parseJwtPayload(raw: unknown): JwtPayload | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (
    typeof r["sub"] !== "string" ||
    typeof r["address"] !== "string" ||
    typeof r["chainId"] !== "number" ||
    typeof r["iat"] !== "number" ||
    typeof r["exp"] !== "number" ||
    typeof r["jti"] !== "string"
  ) {
    return undefined;
  }
  return {
    sub: r["sub"],
    address: r["address"],
    chainId: r["chainId"],
    iat: r["iat"],
    exp: r["exp"],
    jti: r["jti"],
    contextHash: typeof r["contextHash"] === "string" ? r["contextHash"] : undefined,
    ipSubnet: typeof r["ipSubnet"] === "string" ? r["ipSubnet"] : undefined,
    iss: typeof r["iss"] === "string" ? r["iss"] : undefined,
    aud: typeof r["aud"] === "string" ? r["aud"] : undefined,
  };
}

/** Options for constructing a {@link TalakWeb3Auth}. Only `nonceStore`, `refreshStore`, and `revocationStore` are required. */
export interface TalakWeb3AuthOptions {
  nonceStore: NonceStore;
  refreshStore: RefreshStore;
  revocationStore: RevocationStore;
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
  expectedDomain?: string;
  allowedChains?: number[];
  keyProviderType?: KeyProviderType;
  keyProviderOptions?: unknown;
  keyRotationConfig?: unknown;
  timeSource?: AuthoritativeTime;
  contextEnforcementDate?: Date;
  verifySignature?: SignatureVerifier;
  /**
   * When true, allow InMemory* stores even if NODE_ENV=production.
   * For controlled tests only — never enable in real deployments.
   */
  allowInsecureMemoryStores?: boolean;
}

/**
 * Authentication engine: SIWE login, JWT signing/verification, session management, and revocation.
 * All three stores are mandatory — see {@link TalakWeb3AuthOptions}.
 */
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
  private readonly allowedChains: number[] | undefined;
  private readonly verifySignature: SignatureVerifier;

  constructor(opts: TalakWeb3AuthOptions) {
    if (!opts || !opts.nonceStore || !opts.refreshStore || !opts.revocationStore) {
      throw new TalakWeb3Error(
        "CRITICAL: Mandatory auth stores (nonce, refresh, revocation) are missing from the configuration. This is a fatal error in production.",
        { code: AUTH_ERROR_CODES.STORES_MISSING, status: 500 },
      );
    }

    assertProductionSafeStores(
      {
        nonceStore: opts.nonceStore,
        refreshStore: opts.refreshStore,
        revocationStore: opts.revocationStore,
      },
      { allowInsecureMemoryStores: opts.allowInsecureMemoryStores === true },
    );

    this.nonceStore = opts.nonceStore;
    this.refreshStore = opts.refreshStore;
    this.revocations = opts.revocationStore;
    this.accessTtlSeconds = opts.accessTtlSeconds ?? 15 * 60;
    this.refreshTtlMs = (opts.refreshTtlSeconds ?? 7 * 24 * 60 * 60) * 1000;
    this.expectedDomain = opts.expectedDomain ?? process.env["SIWE_DOMAIN"] ?? undefined;
    this.allowedChains = opts.allowedChains;
    this.timeSource = opts.timeSource ?? getAuthoritativeTime();
    this.contextEnforcementDate =
      opts.contextEnforcementDate?.getTime() ?? new Date("2025-06-01T00:00:00Z").getTime();
    this.verifySignature = opts.verifySignature ?? verifyMessage;

    const keyProviderType = opts.keyProviderType ?? "environment";
    const keyProviderOptions = opts.keyProviderOptions ?? {};
    const keyProvider = createKeyProvider(
      keyProviderType,
      keyProviderOptions,
      opts.keyRotationConfig as Partial<KeyRotationConfig> | undefined,
    );
    this.jwtManager = new JwtManager(keyProvider);
  }

  async coldStart(): Promise<void> {
    // noop: signing keys provisioned lazily on first use
  }

  async validateJwt(token: string): Promise<boolean> {
    try {
      const raw = await this.jwtManager.verify(token, {
        issuer: "talak:auth",
        audience: "talak:web3",
        requiredClaims: ["iat", "exp", "sub", "jti", "iss", "aud"],
      });

      const payload = parseJwtPayload(raw);
      if (!payload) return false;

      const globalInvalidationAt = await this.revocations.getGlobalInvalidationTime();
      if (payload.iat < globalInvalidationAt) return false;

      if (await this.revocations.isRevoked(payload.jti)) return false;
      return true;
    } catch {
      return false;
    }
  }

  async forceGlobalInvalidation(): Promise<void> {
    const now = Math.floor(this.timeSource.now() / 1000);
    await this.revocations.setGlobalInvalidationTime(now);
  }

  async emergencyKeyRotation(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {
    const kid = await this.jwtManager.emergencyPurge(newPrivateKey, newPublicKey);
    await this.forceGlobalInvalidation();
    return kid;
  }

  async signJwt(payload: SessionPayload): Promise<string> {
    const jti = randomBytes(16).toString("hex");
    return this.jwtManager.sign(
      { ...payload },
      {
        issuer: "talak:auth",
        audience: "talak:web3",
        expiresIn: `${this.accessTtlSeconds}s`,
        subject: payload.address,
        jti,
      },
    );
  }

  async loginWithSiwe(
    message: string,
    signature: string,
    context?: { ip: string; userAgent: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const normalizedMessage = message.normalize("NFC");

    const fields = parseSiweMessage(normalizedMessage);

    if (this.expectedDomain && fields.domain !== this.expectedDomain) {
      throw new TalakWeb3Error("SIWE domain mismatch", {
        code: AUTH_ERROR_CODES.SIWE_DOMAIN_MISMATCH,
        status: 401,
        data: { domain: fields.domain },
      });
    }

    if (this.allowedChains && this.allowedChains.length > 0) {
      validateChainId(fields.chainId, this.allowedChains);
    }

    validateIssuedAt(fields.issuedAt, 5 * 60_000, () => this.timeSource.now());

    if (fields.expirationTime) {
      if (new Date(fields.expirationTime) < new Date()) {
        throw new TalakWeb3Error("SIWE message has expired", {
          code: AUTH_ERROR_CODES.SIWE_EXPIRED,
          status: 401,
        });
      }
    }

    if (fields.notBefore && new Date(fields.notBefore) > new Date()) {
      throw new TalakWeb3Error("SIWE message not yet valid", {
        code: AUTH_ERROR_CODES.SIWE_TIME_DRIFT,
        status: 401,
      });
    }

    const consumed = await this.nonceStore.consume(fields.address.toLowerCase(), fields.nonce);
    if (!consumed) {
      throw new TalakWeb3Error("SIWE nonce invalid or already used", {
        code: AUTH_ERROR_CODES.SIWE_NONCE_REPLAY,
        status: 401,
      });
    }

    let valid = false;
    try {
      valid = await this.verifySignature({
        address: fields.address,
        message: normalizedMessage,
        signature: signature as `0x${string}`,
      });
    } catch {
      // Malformed/unparseable signatures (e.g. invalid `v` byte) must fail as
      // a 401 signature rejection, not surface as an internal error.
      valid = false;
    }

    if (!valid) {
      throw new TalakWeb3Error("Invalid SIWE signature", {
        code: AUTH_ERROR_CODES.SIWE_INVALID_SIG,
        status: 401,
      });
    }

    return this.issueTokenPair(fields.address, fields.chainId, context);
  }

  async createSession(address: string, chainId: number): Promise<string> {
    return this.issueAccessToken(address, chainId);
  }

  private async issueAccessToken(
    address: string,
    chainId: number,
    context?: { ip: string; userAgent: string },
  ): Promise<string> {
    const normalized = address.toLowerCase();
    const sub = normalized;

    let contextHash: string | undefined;
    let ipSubnet: string | undefined;
    if (context) {
      ipSubnet = computeIpSubnet(context.ip);

      const contextString = `${context.ip}|${context.userAgent}`;
      contextHash = createHash("sha256").update(contextString).digest("hex");
    }

    return this.jwtManager.sign(
      {
        address: normalized,
        chainId,
        ...(contextHash && { contextHash }),
        ...(ipSubnet && { ipSubnet }),
      } satisfies SessionPayload,
      {
        issuer: "talak:auth",
        audience: "talak:web3",
        expiresIn: `${this.accessTtlSeconds}s`,
        subject: sub,
        jti: randomUUID(),
      },
    );
  }

  private async issueTokenPair(
    address: string,
    chainId: number,
    context?: { ip: string; userAgent: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, { token: refreshToken }] = await Promise.all([
      this.issueAccessToken(address, chainId, context),
      this.refreshStore.create(address, chainId, this.refreshTtlMs),
    ]);
    return { accessToken, refreshToken };
  }

  async getJwks(): Promise<JwksResponse> {
    return this.jwtManager.getJwks();
  }

  async verifySession(
    token: string,
    context?: { ip: string; userAgent: string },
  ): Promise<SessionPayload> {
    let raw: unknown;
    try {
      raw = await this.jwtManager.verify(token, {
        issuer: "talak:auth",
        audience: "talak:web3",
        requiredClaims: ["iat", "exp", "sub", "jti", "iss", "aud"],
      });
    } catch (err) {
      throw new TalakWeb3Error("Invalid or expired session token", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID,
        status: 401,
        cause: err,
      });
    }

    const payload = parseJwtPayload(raw);
    if (!payload) {
      throw new TalakWeb3Error("Malformed session token payload", {
        code: AUTH_ERROR_CODES.TOKEN_MALFORMED,
        status: 401,
      });
    }

    if (await this.revocations.isRevoked(payload.jti)) {
      throw new TalakWeb3Error("Session has been revoked", {
        code: AUTH_ERROR_CODES.TOKEN_REVOKED,
        status: 401,
      });
    }

    if (payload.sub.length === 0) {
      throw new TalakWeb3Error("Invalid session token subject", {
        code: AUTH_ERROR_CODES.TOKEN_INVALID_SUB,
        status: 401,
      });
    }

    if (context) {
      if (typeof payload.contextHash === "string" && payload.contextHash.length > 0) {
        const currentContextHash = createHash("sha256")
          .update(`${context.ip}|${context.userAgent}`)
          .digest("hex");

        if (currentContextHash === payload.contextHash) {
          // context matches, allow
        } else if (payload.ipSubnet && typeof payload.ipSubnet === "string") {
          const currentSubnet = computeIpSubnet(context.ip);
          if (currentSubnet && currentSubnet === payload.ipSubnet) {
            console.debug("[AUTH] Token accepted with NAT tolerance", { subnet: currentSubnet });
          } else {
            throw new TalakWeb3Error("Token context mismatch - possible token theft", {
              code: AUTH_ERROR_CODES.TOKEN_CONTEXT_MISMATCH,
              status: 401,
            });
          }
        } else {
          throw new TalakWeb3Error("Token context mismatch - possible token theft", {
            code: AUTH_ERROR_CODES.TOKEN_CONTEXT_MISMATCH,
            status: 401,
          });
        }
      } else if (this.timeSource.now() > this.contextEnforcementDate) {
        throw new TalakWeb3Error("Token binding required - please re-authenticate", {
          code: AUTH_ERROR_CODES.CONTEXT_REQUIRED,
          status: 401,
        });
      } else {
        console.warn(
          "[AUTH] Token without context binding used - re-auth required after enforcement date",
        );
      }
    }

    return { address: payload.address, chainId: payload.chainId };
  }

  async revokeSession(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      const raw = await this.jwtManager.verify(accessToken, {
        issuer: "talak:auth",
        audience: "talak:web3",
        requiredClaims: ["iat", "exp", "sub", "jti", "iss", "aud"],
      });

      const payload = parseJwtPayload(raw);
      if (payload) {
        await this.revocations.revoke(payload.jti, payload.exp * 1000);
      }
    } catch {
      // best-effort; refresh token still revoked below
    }

    if (refreshToken) {
      await this.refreshStore.revoke(refreshToken);
    }
  }

  generateNonce(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async createNonce(address: string, meta?: { ip?: string; ua?: string }): Promise<string> {
    return this.nonceStore.create(address.toLowerCase(), meta);
  }

  async refresh(
    refreshToken: string,
    context?: { ip: string; userAgent: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { session, token: newRefreshToken } = await this.refreshStore.rotate(
      refreshToken,
      this.refreshTtlMs,
    );

    const accessToken = await this.issueAccessToken(session.address, session.chainId, context);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async introspectToken(
    token: string,
  ): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
    try {
      const raw = await this.jwtManager.verify(token, {
        issuer: "talak:auth",
        audience: "talak:web3",
        requiredClaims: ["iat", "exp", "sub", "jti", "iss", "aud"],
      });

      const parsed = parseJwtPayload(raw);
      if (!parsed) return { valid: false };
      return { valid: true, payload: parsed as unknown as Record<string, unknown> };
    } catch {
      return { valid: false };
    }
  }
}
