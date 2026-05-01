import {
  jwtVerify,
  type JWTVerifyOptions,
  importPKCS8,
  importSPKI,
  type KeyObject,
  FlattenedSign,
} from "jose";

type KeyLike = CryptoKey | KeyObject;
import { TalakWeb3Error } from "@talak-web3/errors";
import type { RedisClientType } from "redis"; // @ts-ignore: redis types optional

import { JwksManager, type JwksResponse, type KeyRotationConfig } from "./jwks.js";

export interface KeyProvider {
  getCurrentSigningKeyInfo(): Promise<{ kid: string; publicKey: KeyLike }>;

  sign(data: Uint8Array): Promise<Uint8Array>;

  getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]>;

  rotateKey(): Promise<{ kid: string; publicKey: KeyLike }>;

  revokeKey(kid: string): Promise<void>;

  publishKeyRevocation?(kid: string): Promise<void>;
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
        code: "AUTH_NO_SIGNING_KEY",
        status: 500,
      });
    }

    const pub = this.jwksManager.getPublicKey(key.kid);
    if (!pub) throw new Error("Public key missing for primary kid");
    return { kid: key.kid, publicKey: pub };
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    await this.ensureInitialized();
    const key = this.jwksManager.getPrimaryKey();
    if (!key || !key.privateKey) {
      throw new TalakWeb3Error("No private key available for signing", {
        code: "AUTH_NO_PRIVATE_KEY",
        status: 500,
      });
    }

    const signer = new FlattenedSign(data);
    signer.setProtectedHeader({ alg: "RS256" });
    const jws = await signer.sign(key.privateKey);
    return Buffer.from(jws.signature, "base64url");
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
      code: "AUTH_ROTATION_NOT_SUPPORTED",
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

    const primaryPrivPem = process.env["JWT_PRIVATE_KEY"];
    const primaryPubPem = process.env["JWT_PUBLIC_KEY"];
    const primaryKidEnv = process.env["JWT_PRIMARY_KID"] || "v1";

    if (!primaryPrivPem || !primaryPubPem) {
      throw new TalakWeb3Error(
        "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required.",
        { code: "AUTH_JWT_KEYS_MISSING", status: 500 },
      );
    }

    try {
      const priv = await importPKCS8(primaryPrivPem, "RS256");
      const pub = await importSPKI(primaryPubPem, "RS256");
      await this.jwksManager.addKey(primaryKidEnv, pub, priv, true);
    } catch (err) {
      throw new TalakWeb3Error("Failed to import primary JWT keys", {
        code: "AUTH_JWT_KEYS_INVALID",
        status: 500,
        cause: err,
      });
    }

    const secondaryKeyEnvs = Object.keys(process.env).filter((k) =>
      k.startsWith("JWT_PUBLIC_KEY_"),
    );
    for (const envKey of secondaryKeyEnvs) {
      const kid = envKey.replace("JWT_PUBLIC_KEY_", "");
      const pubPem = process.env[envKey];
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

export class AWSKmsKeyProvider implements KeyProvider {
  private jwksManager: JwksManager;
  private keyId: string;
  private region: string;

  constructor(keyId: string, region: string, config?: Partial<KeyRotationConfig>) {
    this.keyId = keyId;
    this.region = region;
    this.jwksManager = new JwksManager(config);
  }

  async getCurrentSigningKeyInfo(): Promise<{ kid: string; publicKey: KeyLike }> {
    throw new TalakWeb3Error("AWS KMS provider not yet implemented", {
      code: "AUTH_KMS_NOT_IMPLEMENTED",
      status: 501,
    });
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    throw new TalakWeb3Error("AWS KMS provider not yet implemented", {
      code: "AUTH_KMS_NOT_IMPLEMENTED",
      status: 501,
    });
  }

  async getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]> {
    throw new TalakWeb3Error("AWS KMS provider not yet implemented", {
      code: "AUTH_KMS_NOT_IMPLEMENTED",
      status: 501,
    });
  }

  async rotateKey(): Promise<{ kid: string; publicKey: KeyLike }> {
    throw new TalakWeb3Error("AWS KMS provider not yet implemented", {
      code: "AUTH_KMS_NOT_IMPLEMENTED",
      status: 501,
    });
  }

  async revokeKey(kid: string): Promise<void> {
    throw new TalakWeb3Error("AWS KMS provider not yet implemented", {
      code: "AUTH_KMS_NOT_IMPLEMENTED",
      status: 501,
    });
  }
}

export class VaultKeyProvider implements KeyProvider {
  private jwksManager: JwksManager;
  private vaultUrl: string;
  private secretPath: string;
  private token: string;

  constructor(
    vaultUrl: string,
    secretPath: string,
    token: string,
    config?: Partial<KeyRotationConfig>,
  ) {
    this.vaultUrl = vaultUrl;
    this.secretPath = secretPath;
    this.token = token;
    this.jwksManager = new JwksManager(config);
  }

  async getCurrentSigningKeyInfo(): Promise<{ kid: string; publicKey: KeyLike }> {
    throw new TalakWeb3Error("Vault provider not yet implemented", {
      code: "AUTH_VAULT_NOT_IMPLEMENTED",
      status: 501,
    });
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    throw new TalakWeb3Error("Vault provider not yet implemented", {
      code: "AUTH_VAULT_NOT_IMPLEMENTED",
      status: 501,
    });
  }

  async getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]> {
    throw new TalakWeb3Error("Vault provider not yet implemented", {
      code: "AUTH_VAULT_NOT_IMPLEMENTED",
      status: 501,
    });
  }

  async rotateKey(): Promise<{ kid: string; publicKey: KeyLike }> {
    throw new TalakWeb3Error("Vault provider not yet implemented", {
      code: "AUTH_VAULT_NOT_IMPLEMENTED",
      status: 501,
    });
  }

  async revokeKey(kid: string): Promise<void> {
    throw new TalakWeb3Error("Vault provider not yet implemented", {
      code: "AUTH_VAULT_NOT_IMPLEMENTED",
      status: 501,
    });
  }
}

export type KeyProviderType = "environment" | "aws-kms" | "vault";

export function createKeyProvider(
  type: KeyProviderType,
  options: unknown,
  config?: Partial<KeyRotationConfig>,
): KeyProvider {
  switch (type) {
    case "environment":
      return new EnvironmentKeyProvider(config);
    case "aws-kms":
      return new AWSKmsKeyProvider(
        (options as { keyId: string; region: string }).keyId,
        (options as { keyId: string; region: string }).region,
        config,
      );
    case "vault":
      return new VaultKeyProvider(
        (options as { vaultUrl: string; secretPath: string; token: string }).vaultUrl,
        (options as { vaultUrl: string; secretPath: string; token: string }).secretPath,
        (options as { vaultUrl: string; secretPath: string; token: string }).token,
        config,
      );
    default:
      throw new TalakWeb3Error(`Unsupported key provider type: ${type}`, {
        code: "AUTH_INVALID_KEY_PROVIDER",
        status: 500,
      });
  }
}

export class JwtManager {
  private keyProvider: KeyProvider;
  private verificationCache: Map<string, KeyLike> = new Map();
  private cacheTimeoutMs: number;

  constructor(keyProvider: KeyProvider, cacheTimeoutMs = 5 * 60 * 1000) {
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
    const { kid } = await this.keyProvider.getCurrentSigningKeyInfo();

    const nowSec = Math.floor(Date.now() / 1000);
    const jwtPayload: Record<string, unknown> = { ...payload };
    jwtPayload.iat = nowSec;
    if (options.issuer) jwtPayload.iss = options.issuer;
    if (options.audience) jwtPayload.aud = options.audience;
    if (options.subject) jwtPayload.sub = options.subject;
    if (options.jti) jwtPayload.jti = options.jti;
    if (options.expiresIn !== undefined) {
      const exp =
        typeof options.expiresIn === "number"
          ? nowSec + options.expiresIn
          : nowSec + this.parseExpiresInToSeconds(options.expiresIn);
      jwtPayload.exp = exp;
    }

    const protectedHeader = { alg: "RS256", kid, typ: "JWT" } as const;
    const encodedHeader = Buffer.from(JSON.stringify(protectedHeader)).toString("base64url");
    const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString("base64url");
    const tbs = Buffer.from(`${encodedHeader}.${encodedPayload}`);
    const signature = await this.keyProvider.sign(tbs);
    const encodedSig = Buffer.from(signature).toString("base64url");
    return `${encodedHeader}.${encodedPayload}.${encodedSig}`;
  }

  private parseExpiresInToSeconds(value: string): number {
    const trimmed = value.trim();
    const match = /^(\d+)\s*([smhd])$/i.exec(trimmed);
    if (!match) {
      throw new TalakWeb3Error(`Invalid expiresIn format: ${value}`, {
        code: "AUTH_INVALID_EXPIRES_IN",
        status: 400,
      });
    }
    const amount = Number(match[1]!);
    const unit = match[2]!.toLowerCase();
    switch (unit) {
      case "s":
        return amount;
      case "m":
        return amount * 60;
      case "h":
        return amount * 60 * 60;
      case "d":
        return amount * 24 * 60 * 60;
      default:
        return amount;
    }
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
        code: "AUTH_JWT_MISSING_KID",
        status: 401,
      });
    }

    let publicKey = this.verificationCache.get(kid);
    if (!publicKey) {
      const verificationKeys = await this.keyProvider.getVerificationKeys();
      const key = verificationKeys.find((k) => k.kid === kid);
      if (!key) {
        throw new TalakWeb3Error(`Public key with kid "${kid}" not found`, {
          code: "AUTH_PUBLIC_KEY_NOT_FOUND",
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

    const keys = await this.keyProvider.getVerificationKeys();
    const jwks: JwksResponse = { keys: [] };

    return jwks;
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
