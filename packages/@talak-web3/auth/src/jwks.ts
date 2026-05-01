import { exportSPKI, exportJWK, type KeyObject } from "jose";

type KeyLike = CryptoKey | KeyObject;
import { createHash, randomBytes } from "node:crypto";

import { TalakWeb3Error } from "@talak-web3/errors";

export interface JsonWebKey {
  kty: "RSA";
  use: "sig";
  alg: "RS256";
  kid: string;
  n: string;
  e: string;
  x5t?: string;
  x5c?: string[];
  "x5t#S256"?: string;
}

export interface JwksResponse {
  keys: JsonWebKey[];
}

export interface KeyRotationConfig {
  maxKeys: number;

  gracePeriodMs: number;

  rotationIntervalMs: number;
}

export class JwksManager {
  private keys: Map<string, { publicKey: KeyLike; privateKey?: KeyLike; createdAt: number }> =
    new Map();
  private primaryKid: string = "";
  private config: KeyRotationConfig;
  private usedKids = new Set<string>();

  constructor(config: Partial<KeyRotationConfig> = {}) {
    this.config = {
      maxKeys: config.maxKeys ?? 5,
      gracePeriodMs: config.gracePeriodMs ?? 7 * 24 * 60 * 60 * 1000,
      rotationIntervalMs: config.rotationIntervalMs ?? 30 * 24 * 60 * 60 * 1000,
    };
  }

  async addKey(
    kid: string,
    publicKey: KeyLike,
    privateKey?: KeyLike,
    isPrimary = false,
  ): Promise<void> {
    if (this.usedKids.has(kid)) {
      throw new TalakWeb3Error("Duplicate key ID detected - possible key rotation attack", {
        code: "AUTH_DUPLICATE_KID",
        status: 500,
      });
    }
    this.usedKids.add(kid);

    const jwk = await exportJWK(publicKey);
    if (jwk.kty !== "RSA") {
      throw new TalakWeb3Error("Non-RSA key in RS256 JWKS - algorithm mismatch", {
        code: "AUTH_ALG_MISMATCH",
        status: 500,
      });
    }

    if (isPrimary) {
      this.primaryKid = kid;
    }

    const record: { publicKey: KeyLike; privateKey?: KeyLike; createdAt: number } = {
      publicKey,
      createdAt: Date.now(),
    };
    if (privateKey !== undefined) {
      record.privateKey = privateKey;
    }
    this.keys.set(kid, record);

    this.cleanupOldKeys();
  }

  getPrimaryKey(): { kid: string; privateKey: KeyLike } | null {
    const key = this.keys.get(this.primaryKid);
    if (!key || !key.privateKey) {
      return null;
    }
    return { kid: this.primaryKid, privateKey: key.privateKey };
  }

  getPublicKey(kid: string): KeyLike | null {
    const key = this.keys.get(kid);
    return key?.publicKey ?? null;
  }

  async getJwks(): Promise<JwksResponse> {
    const keys: JsonWebKey[] = [];

    for (const [kid, keyData] of this.keys.entries()) {
      const spki = await exportSPKI(keyData.publicKey);
      const publicKeyPem = spki
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\n/g, "");

      const jwk = await exportJWK(keyData.publicKey);

      if (jwk.kty !== "RSA" || !jwk.n || !jwk.e) {
        throw new TalakWeb3Error("Invalid RSA key: missing modulus or exponent", {
          code: "AUTH_INVALID_RSA_KEY",
          status: 500,
        });
      }

      const rsaJwk: JsonWebKey = {
        kty: "RSA",
        use: "sig",
        alg: "RS256",
        kid,
        n: jwk.n,
        e: jwk.e,

        "x5t#S256": this.computeX5tS256(spki),
        x5c: [publicKeyPem],
      };

      keys.push(rsaJwk);
    }

    return { keys };
  }

  async rotateKeys(newPrivateKey: KeyLike, newPublicKey: KeyLike): Promise<string> {
    const newKid = this.generateKid();

    await this.addKey(newKid, newPublicKey, newPrivateKey, true);

    return newKid;
  }

  async emergencyPurge(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {
    this.keys.clear();
    this.primaryKid = "";
    this.usedKids.clear();

    if (newPrivateKey && newPublicKey) {
      return this.rotateKeys(newPrivateKey, newPublicKey);
    }

    return "";
  }

  revokeKey(kid: string): void {
    if (kid === this.primaryKid) {
      throw new TalakWeb3Error("Cannot revoke primary key without rotation", {
        code: "AUTH_REVOKE_PRIMARY_FORBIDDEN",
        status: 403,
      });
    }
    this.keys.delete(kid);
  }

  invalidateCache(kid: string): void {}

  shouldRotate(): boolean {
    const primary = this.keys.get(this.primaryKid);
    if (!primary) return true;

    const age = Date.now() - primary.createdAt;
    return age >= this.config.rotationIntervalMs;
  }

  private cleanupOldKeys(): void {
    const now = Date.now();
    const cutoff = now - this.config.gracePeriodMs;

    const keysToRemove: string[] = [];

    for (const [kid, keyData] of this.keys.entries()) {
      if (kid === this.primaryKid) continue;
      if (keyData.createdAt < cutoff) {
        keysToRemove.push(kid);
      }
    }

    const sortedKeys = Array.from(this.keys.entries())
      .filter(([kid]) => kid !== this.primaryKid)
      .sort(([, a], [, b]) => a.createdAt - b.createdAt);

    const excessCount = sortedKeys.length - (this.config.maxKeys - 1);
    if (excessCount > 0) {
      const toRemove = Math.min(excessCount, sortedKeys.length);
      for (let i = 0; i < toRemove; i++) {
        const entry = sortedKeys[i];
        if (entry) keysToRemove.push(entry[0]);
      }
    }

    keysToRemove.forEach((kid) => this.keys.delete(kid));
  }

  private generateKid(): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString("hex");
    return `v${timestamp}-${random}`;
  }

  private computeX5t(spki: string): string {
    const hash = createHash("sha1");
    hash.update(
      spki
        .replace(/-----BEGIN PUBLIC KEY-----\n/, "")
        .replace(/\n-----END PUBLIC KEY-----/, "")
        .replace(/\n/g, ""),
    );
    return hash.digest("base64url");
  }

  private computeX5tS256(spki: string): string {
    const hash = createHash("sha256");
    hash.update(
      spki
        .replace(/-----BEGIN PUBLIC KEY-----\n/, "")
        .replace(/\n-----END PUBLIC KEY-----/, "")
        .replace(/\n/g, ""),
    );
    return hash.digest("base64url");
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const primary = this.keys.get(this.primaryKid);
    if (!primary) {
      errors.push("Primary key not found");
    } else if (!primary.privateKey) {
      errors.push("Primary key missing private key");
    }

    if (this.keys.size > this.config.maxKeys) {
      errors.push(`Key set size (${this.keys.size}) exceeds maximum (${this.config.maxKeys})`);
    }

    return { valid: errors.length === 0, errors };
  }

  getRotationStatus(): {
    primaryKid: string;
    totalKeys: number;
    shouldRotate: boolean;
    oldestKeyAge: number;
    nextRotationIn: number;
  } {
    const primary = this.keys.get(this.primaryKid);
    const now = Date.now();

    let oldestKeyAge = 0;
    for (const keyData of this.keys.values()) {
      const age = now - keyData.createdAt;
      oldestKeyAge = Math.max(oldestKeyAge, age);
    }

    const shouldRotate = this.shouldRotate();
    const nextRotationIn = primary
      ? Math.max(0, this.config.rotationIntervalMs - (now - primary.createdAt))
      : 0;

    return {
      primaryKid: this.primaryKid,
      totalKeys: this.keys.size,
      shouldRotate,
      oldestKeyAge,
      nextRotationIn,
    };
  }
}
