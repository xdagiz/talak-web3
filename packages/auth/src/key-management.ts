import {
  jwtVerify,
  SignJWT,
  type JWTVerifyOptions,
  importPKCS8,
  importSPKI,
  type KeyObject,
} from "jose";

type KeyLike = CryptoKey | KeyObject;
import { TalakWeb3Error, AUTH_ERROR_CODES } from "@talak-web3/errors";
import type { JwksResponse } from "@talak-web3/types";
import type { RedisClientType } from "redis";

import { JwksManager, type KeyRotationConfig } from "./jwks.js";

export interface KeyProvider {
  getCurrentSigningKeyInfo(): Promise<{ kid: string; publicKey: KeyLike }>;
  sign(data: Uint8Array): Promise<Uint8Array>;
  getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]>;
  rotateKey(): Promise<{ kid: string; publicKey: KeyLike }>;
  revokeKey(kid: string): Promise<void>;
  publishKeyRevocation?(kid: string): Promise<void>;
  getSigningPrivateKey(): Promise<{ kid: string; privateKey: KeyLike }>;
}

export class EnvironmentKeyProvider implements KeyProvider {
  private jwksManager: JwksManager;
  private initialized = false;
  private redisClient: RedisClientType | null = null;

  constructor(
    private config?: Partial<KeyRotationConfig>,
    redisClient?: RedisClientType | null,
  ) {
    this.jwksManager = new JwksManager(config);
    this.redisClient = redisClient ?? null;
  }

  async getCurrentSigningKeyInfo(): Promise<{ kid: string; publicKey: KeyLike }> {
    await this.ensureInitialized();
    const key = this.jwksManager.getPrimaryKey();
    if (!key) {
      throw new TalakWeb3Error("No signing key available", {
        code: AUTH_ERROR_CODES.NO_SIGNING_KEY,
        status: 500,
      });
    }

    const pub = this.jwksManager.getPublicKey(key.kid);
    if (!pub) throw new Error("Public key missing for primary kid");
    return { kid: key.kid, publicKey: pub };
  }

  async getSigningPrivateKey(): Promise<{ kid: string; privateKey: KeyLike }> {
    await this.ensureInitialized();
    const key = this.jwksManager.getPrimaryKey();
    if (!key || !key.privateKey) {
      throw new TalakWeb3Error("No signing key available", {
        code: AUTH_ERROR_CODES.NO_SIGNING_KEY,
        status: 500,
      });
    }
    return { kid: key.kid, privateKey: key.privateKey };
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    await this.ensureInitialized();
    const key = this.jwksManager.getPrimaryKey();
    if (!key || !key.privateKey) {
      throw new TalakWeb3Error("No private key available for signing", {
        code: AUTH_ERROR_CODES.NO_PRIVATE_KEY,
        status: 500,
      });
    }

    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      key.privateKey as CryptoKey,
      new Uint8Array(data),
    );
    return new Uint8Array(signature);
  }

  async getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]> {
    await this.ensureInitialized();
    const keys: { kid: string; publicKey: KeyLike }[] = [];

    const jwks = await this.jwksManager.getJwks();
    for (const jwk of jwks.keys) {
      const publicKey = this.jwksManager.getPublicKey(jwk.kid);
      if (publicKey) {
        keys.push({ kid: jwk.kid, publicKey });
      }
    }

    return keys;
  }

  async rotateKey(): Promise<{ kid: string; publicKey: KeyLike }> {
    throw new TalakWeb3Error("Key rotation not supported with environment provider", {
      code: AUTH_ERROR_CODES.ROTATION_NOT_SUPPORTED,
      status: 501,
    });
  }

  async revokeKey(kid: string): Promise<void> {
    this.jwksManager.revokeKey(kid);

    await this.publishKeyRevocation(kid);
  }

  async publishKeyRevocation(kid: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      const message = JSON.stringify({
        type: "key_revoked",
        kid,
        timestamp: Date.now(),
      });
      await this.redisClient.publish("talak:keys:broadcast", message);
    } catch (err) {
      console.warn("[AUTH] Failed to publish key revocation:", err);
    }
  }

  async emergencyPurge(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {
    return this.jwksManager.emergencyPurge(newPrivateKey, newPublicKey);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const env =
      typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : {};
    const primaryPrivPem = env["JWT_PRIVATE_KEY"];
    const primaryPubPem = env["JWT_PUBLIC_KEY"];
    const primaryKidEnv = env["JWT_PRIMARY_KID"] || "v1";

    if (!primaryPrivPem || !primaryPubPem) {
      throw new TalakWeb3Error(
        "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required.",
        { code: AUTH_ERROR_CODES.JWT_KEYS_MISSING, status: 500 },
      );
    }

    try {
      const priv = await importPKCS8(primaryPrivPem, "RS256");
      const pub = await importSPKI(primaryPubPem, "RS256");

      if (priv.type !== "private" && priv.type !== "public") {
        throw new TalakWeb3Error("Invalid private key type", {
          code: AUTH_ERROR_CODES.JWT_KEYS_INVALID,
          status: 500,
        });
      }

      if (pub.type !== "public") {
        throw new TalakWeb3Error("Invalid public key type", {
          code: AUTH_ERROR_CODES.JWT_KEYS_INVALID,
          status: 500,
        });
      }

      if (priv.algorithm && "modulusLength" in priv.algorithm) {
        if ((priv.algorithm as { modulusLength: number }).modulusLength < 2048) {
          throw new TalakWeb3Error("RSA private key must be at least 2048 bits", {
            code: AUTH_ERROR_CODES.JWT_KEYS_INVALID,
            status: 500,
          });
        }
      }

      if (pub.algorithm && "modulusLength" in pub.algorithm) {
        if ((pub.algorithm as { modulusLength: number }).modulusLength < 2048) {
          throw new TalakWeb3Error("RSA public key must be at least 2048 bits", {
            code: AUTH_ERROR_CODES.JWT_KEYS_INVALID,
            status: 500,
          });
        }
      }

      await this.jwksManager.addKey(primaryKidEnv, pub, priv, true);
    } catch (err) {
      throw new TalakWeb3Error("Failed to import primary JWT keys", {
        code: AUTH_ERROR_CODES.JWT_KEYS_INVALID,
        status: 500,
        cause: err,
      });
    }

    const secondaryKeyEnvs = Object.keys(env).filter((k) => k.startsWith("JWT_PUBLIC_KEY_"));
    for (const envKey of secondaryKeyEnvs) {
      const kid = envKey.replace("JWT_PUBLIC_KEY_", "");
      const pubPem = env[envKey];
      if (pubPem && kid !== primaryKidEnv) {
        try {
          const pub = await importSPKI(pubPem, "RS256");
          await this.jwksManager.addKey(kid, pub);
        } catch (err) {
          console.warn(`[talak-web3-auth] Skipping invalid secondary key ${kid}:`, err);
        }
      }
    }

    this.initialized = true;
  }

  async getJwks(): Promise<JwksResponse> {
    await this.ensureInitialized();
    return this.jwksManager.getJwks();
  }
}

export type KeyProviderType = "environment";

export function createKeyProvider(
  type: KeyProviderType,
  _options: unknown,
  config?: Partial<KeyRotationConfig>,
): KeyProvider {
  switch (type) {
    case "environment":
      return new EnvironmentKeyProvider(config);
    default:
      throw new TalakWeb3Error(`Unsupported key provider type: ${type}`, {
        code: AUTH_ERROR_CODES.INVALID_KEY_PROVIDER,
        status: 500,
      });
  }
}

export class JwtManager {
  private keyProvider: KeyProvider;
  private verificationCache: Map<string, KeyLike> = new Map();
  private cacheTimeoutMs: number;

  constructor(keyProvider: KeyProvider, cacheTimeoutMs = 30_000) {
    this.keyProvider = keyProvider;
    this.cacheTimeoutMs = cacheTimeoutMs;
  }

  async sign(
    payload: Record<string, unknown>,
    options: {
      issuer?: string;
      audience?: string;
      expiresIn?: string | number;
      subject?: string;
      jti?: string;
    } = {},
  ): Promise<string> {
    const { kid, privateKey } = await this.keyProvider.getSigningPrivateKey();

    const nowSec = Math.floor(Date.now() / 1000);
    const jwtPayload: Record<string, unknown> = { ...payload };
    jwtPayload.iat = nowSec;

    const jwt = new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuedAt(nowSec);

    if (options.issuer) jwt.setIssuer(options.issuer);
    if (options.audience) jwt.setAudience(options.audience);
    if (options.subject) jwt.setSubject(options.subject);
    if (options.jti) jwt.setJti(options.jti);
    if (options.expiresIn !== undefined) {
      if (typeof options.expiresIn === "number") {
        jwt.setExpirationTime(Math.floor(nowSec + options.expiresIn));
      } else {
        jwt.setExpirationTime(options.expiresIn);
      }
    }

    return jwt.sign(privateKey);
  }

  async verify(
    token: string,
    options: {
      issuer?: string;
      audience?: string;
      requiredClaims?: string[];
    } = {},
  ): Promise<unknown> {
    const decodeResult = await this.decodeProtectedHeader(token);
    const header = decodeResult.header as { kid?: string };
    const kid = header.kid;

    if (!kid) {
      throw new TalakWeb3Error("JWT missing key ID (kid)", {
        code: AUTH_ERROR_CODES.JWT_MISSING_KID,
        status: 401,
      });
    }

    let publicKey = this.verificationCache.get(kid);
    if (!publicKey) {
      const verificationKeys = await this.keyProvider.getVerificationKeys();
      const key = verificationKeys.find((k) => k.kid === kid);
      if (!key) {
        throw new TalakWeb3Error(`Public key with kid "${kid}" not found`, {
          code: AUTH_ERROR_CODES.PUBLIC_KEY_NOT_FOUND,
          status: 401,
        });
      }
      publicKey = key.publicKey;
      this.verificationCache.set(kid, publicKey);

      setTimeout(() => this.verificationCache.delete(kid), this.cacheTimeoutMs);
    }

    const verifyOptions: JWTVerifyOptions = {
      algorithms: ["RS256"],
    };

    if (options.issuer) verifyOptions.issuer = options.issuer;
    if (options.audience) verifyOptions.audience = options.audience;
    if (options.requiredClaims) verifyOptions.requiredClaims = options.requiredClaims;

    const { payload } = await jwtVerify(token, publicKey, verifyOptions);
    return payload;
  }

  private async decodeProtectedHeader(token: string): Promise<{ header: { kid?: string } }> {
    const { decodeProtectedHeader } = await import("jose");
    const header = decodeProtectedHeader(token);
    return { header };
  }

  async getJwks(): Promise<JwksResponse> {
    if ("getJwks" in this.keyProvider) {
      return (this.keyProvider as EnvironmentKeyProvider).getJwks();
    }

    return { keys: [] };
  }

  async emergencyPurge(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {
    let kid: string;

    if ("emergencyPurge" in this.keyProvider) {
      const provider = this.keyProvider as EnvironmentKeyProvider;
      kid = await provider.emergencyPurge(newPrivateKey, newPublicKey);
    } else {
      const result = await this.keyProvider.rotateKey();
      kid = result.kid;
    }

    this.clearCache();

    return kid;
  }

  clearCache(): void {
    this.verificationCache.clear();
  }

  invalidateKey(kid: string): void {
    if (this.verificationCache.has(kid)) {
      this.verificationCache.delete(kid);
      console.log("[AUTH] Invalidated verification cache for key:", kid);
    }
  }
}
