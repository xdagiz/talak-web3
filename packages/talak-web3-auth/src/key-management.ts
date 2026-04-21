import { SignJWT, jwtVerify, type JWTVerifyOptions, importPKCS8, importSPKI, type KeyLike, type JWSHeaderParameters, FlattenedSign } from 'jose';
import { TalakWeb3Error } from '@talak-web3/errors';
import { JwksManager, type JwksResponse, type KeyRotationConfig } from './jwks.js';

// ---------------------------------------------------------------------------
// Centralized Key Management with KMS/HSM Support
// ---------------------------------------------------------------------------

export interface KeyProvider {
  /** Get current signing key ID and public key */
  getCurrentSigningKeyInfo(): Promise<{ kid: string; publicKey: KeyLike }>;
  
  /** Sign data using the current private key (remote operation) */
  sign(data: Uint8Array): Promise<Uint8Array>;
  
  /** Get all verification keys */
  getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]>;
  
  /** Rotate to a new key */
  rotateKey(): Promise<{ kid: string; publicKey: KeyLike }>;
  
  /** Revoke a key */
  revokeKey(kid: string): Promise<void>;
  
  /** Publish key revocation to all instances */
  publishKeyRevocation?(kid: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Environment-based Key Provider (Current Implementation)
// ---------------------------------------------------------------------------

export class EnvironmentKeyProvider implements KeyProvider {
  private jwksManager: JwksManager;
  private initialized = false;
  private redisClient: any | null = null;

  constructor(private config?: Partial<KeyRotationConfig>, redisClient?: any) {
    this.jwksManager = new JwksManager(config);
    this.redisClient = redisClient;
  }

  async getCurrentSigningKeyInfo(): Promise<{ kid: string; publicKey: KeyLike }> {
    await this.ensureInitialized();
    const key = this.jwksManager.getPrimaryKey();
    if (!key) {
      throw new TalakWeb3Error('No signing key available', { 
        code: 'AUTH_NO_SIGNING_KEY', 
        status: 500 
      });
    }
    // We only need kid and publicKey for "info"
    const pub = this.jwksManager.getPublicKey(key.kid);
    if (!pub) throw new Error('Public key missing for primary kid');
    return { kid: key.kid, publicKey: pub };
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    await this.ensureInitialized();
    const key = this.jwksManager.getPrimaryKey();
    if (!key || !key.privateKey) {
      throw new TalakWeb3Error('No private key available for signing', {
        code: 'AUTH_NO_PRIVATE_KEY',
        status: 500,
      });
    }

    // Local signing with the private key (current behavior for Environment provider)
    const signer = new FlattenedSign(data);
    signer.setProtectedHeader({ alg: 'RS256' });
    const jws = await signer.sign(key.privateKey);
    return Buffer.from(jws.signature, 'base64url');
  }

  async getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]> {
    await this.ensureInitialized();
    const keys: { kid: string; publicKey: KeyLike }[] = [];
    
    // Get all keys from JWKS manager
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
    // For environment provider, we can't dynamically generate new keys
    throw new TalakWeb3Error('Key rotation not supported with environment provider', {
      code: 'AUTH_ROTATION_NOT_SUPPORTED',
      status: 501,
    });
  }

  async revokeKey(kid: string): Promise<void> {
    // Revoke key from JWKS manager
    this.jwksManager.revokeKey(kid);
    
    // Broadcast revocation to all instances via Pub/Sub
    await this.publishKeyRevocation(kid);
  }

  async publishKeyRevocation(kid: string): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      const message = JSON.stringify({
        type: 'key_revoked',
        kid,
        timestamp: Date.now(),
      });
      await this.redisClient.publish('talak:keys:broadcast', message);
    } catch (err) {
      console.warn('[AUTH] Failed to publish key revocation:', err);
    }
  }

  async emergencyPurge(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {
    return this.jwksManager.emergencyPurge(newPrivateKey, newPublicKey);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // Load primary key (mandatory)
    const primaryPrivPem = process.env['JWT_PRIVATE_KEY'];
    const primaryPubPem = process.env['JWT_PUBLIC_KEY'];
    const primaryKidEnv = process.env['JWT_PRIMARY_KID'] || 'v1';

    if (!primaryPrivPem || !primaryPubPem) {
      throw new TalakWeb3Error(
        'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required.',
        { code: 'AUTH_JWT_KEYS_MISSING', status: 500 },
      );
    }

    try {
      const priv = await importPKCS8(primaryPrivPem, 'RS256');
      const pub = await importSPKI(primaryPubPem, 'RS256');
      await this.jwksManager.addKey(primaryKidEnv, pub, priv, true);
    } catch (err) {
      throw new TalakWeb3Error('Failed to import primary JWT keys', { 
        code: 'AUTH_JWT_KEYS_INVALID', 
        status: 500, 
        cause: err 
      });
    }

    // Load secondary/legacy public keys for rotation grace periods
    const secondaryKeyEnvs = Object.keys(process.env).filter(k => k.startsWith('JWT_PUBLIC_KEY_'));
    for (const envKey of secondaryKeyEnvs) {
      const kid = envKey.replace('JWT_PUBLIC_KEY_', '');
      const pubPem = process.env[envKey];
      if (pubPem && kid !== primaryKidEnv) {
        try {
          const pub = await importSPKI(pubPem, 'RS256');
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

// ---------------------------------------------------------------------------
// AWS KMS Key Provider (Production Grade)
// ---------------------------------------------------------------------------

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
    // In a real implementation, this would:
    // 1. Call AWS KMS to get public key
    // 2. Cache the public key locally
    
    throw new TalakWeb3Error('AWS KMS provider not yet implemented', {
      code: 'AUTH_KMS_NOT_IMPLEMENTED',
      status: 501,
    });
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    // In a real implementation, this would:
    // 1. Use KMS Sign API for signing (no direct private key access)
    
    throw new TalakWeb3Error('AWS KMS provider not yet implemented', {
      code: 'AUTH_KMS_NOT_IMPLEMENTED',
      status: 501,
    });
  }

  async getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]> {
    // Implementation would fetch all key versions from KMS
    throw new TalakWeb3Error('AWS KMS provider not yet implemented', {
      code: 'AUTH_KMS_NOT_IMPLEMENTED',
      status: 501,
    });
  }

  async rotateKey(): Promise<{ kid: string; publicKey: KeyLike }> {
    // Implementation would create new key version in KMS
    throw new TalakWeb3Error('AWS KMS provider not yet implemented', {
      code: 'AUTH_KMS_NOT_IMPLEMENTED',
      status: 501,
    });
  }

  async revokeKey(kid: string): Promise<void> {
    // Implementation would schedule key for deletion in KMS
    throw new TalakWeb3Error('AWS KMS provider not yet implemented', {
      code: 'AUTH_KMS_NOT_IMPLEMENTED',
      status: 501,
    });
  }
}

// ---------------------------------------------------------------------------
// HashiCorp Vault Key Provider (Production Grade)
// ---------------------------------------------------------------------------

export class VaultKeyProvider implements KeyProvider {
  private jwksManager: JwksManager;
  private vaultUrl: string;
  private secretPath: string;
  private token: string;

  constructor(vaultUrl: string, secretPath: string, token: string, config?: Partial<KeyRotationConfig>) {
    this.vaultUrl = vaultUrl;
    this.secretPath = secretPath;
    this.token = token;
    this.jwksManager = new JwksManager(config);
  }

  async getCurrentSigningKeyInfo(): Promise<{ kid: string; publicKey: KeyLike }> {
    // In a real implementation, this would:
    // 1. Fetch current public key from Vault
    // 2. Cache public key locally
    
    throw new TalakWeb3Error('Vault provider not yet implemented', {
      code: 'AUTH_VAULT_NOT_IMPLEMENTED',
      status: 501,
    });
  }

  async sign(data: Uint8Array): Promise<Uint8Array> {
    // In a real implementation, this would:
    // 1. Use Vault's transit engine for signing
    
    throw new TalakWeb3Error('Vault provider not yet implemented', {
      code: 'AUTH_VAULT_NOT_IMPLEMENTED',
      status: 501,
    });
  }

  async getVerificationKeys(): Promise<{ kid: string; publicKey: KeyLike }[]> {
    // Implementation would fetch all key versions from Vault
    throw new TalakWeb3Error('Vault provider not yet implemented', {
      code: 'AUTH_VAULT_NOT_IMPLEMENTED',
      status: 501,
    });
  }

  async rotateKey(): Promise<{ kid: string; publicKey: KeyLike }> {
    // Implementation would rotate key in Vault
    throw new TalakWeb3Error('Vault provider not yet implemented', {
      code: 'AUTH_VAULT_NOT_IMPLEMENTED',
      status: 501,
    });
  }

  async revokeKey(kid: string): Promise<void> {
    // Implementation would revoke key in Vault
    throw new TalakWeb3Error('Vault provider not yet implemented', {
      code: 'AUTH_VAULT_NOT_IMPLEMENTED',
      status: 501,
    });
  }
}

// ---------------------------------------------------------------------------
// Key Management Factory
// ---------------------------------------------------------------------------

export type KeyProviderType = 'environment' | 'aws-kms' | 'vault';

export function createKeyProvider(
  type: KeyProviderType,
  options: any,
  config?: Partial<KeyRotationConfig>
): KeyProvider {
  switch (type) {
    case 'environment':
      return new EnvironmentKeyProvider(config);
    case 'aws-kms':
      return new AWSKmsKeyProvider(options.keyId, options.region, config);
    case 'vault':
      return new VaultKeyProvider(options.vaultUrl, options.secretPath, options.token, config);
    default:
      throw new TalakWeb3Error(`Unsupported key provider type: ${type}`, {
        code: 'AUTH_INVALID_KEY_PROVIDER',
        status: 500,
      });
  }
}

// ---------------------------------------------------------------------------
// JWT Signing and Verification with Key Rotation Support
// ---------------------------------------------------------------------------

export class JwtManager {
  private keyProvider: KeyProvider;
  private verificationCache: Map<string, KeyLike> = new Map();
  private cacheTimeoutMs: number;

  constructor(keyProvider: KeyProvider, cacheTimeoutMs = 5 * 60 * 1000) {
    this.keyProvider = keyProvider;
    this.cacheTimeoutMs = cacheTimeoutMs;
  }

  async sign(payload: any, options: {
    issuer?: string;
    audience?: string;
    expiresIn?: string | number;
    subject?: string;
    jti?: string;
  } = {}): Promise<string> {
    const { kid } = await this.keyProvider.getCurrentSigningKeyInfo();
    
    // `jose`'s `SignJWT.sign()` requires a local key. Since `KeyProvider.sign()` is a
    // remote signing primitive (KMS/HSM), we build the JWT JWS compact form manually:
    // BASE64URL(header) + "." + BASE64URL(payload) is the "tbs" bytes to sign.
    const nowSec = Math.floor(Date.now() / 1000);
    const jwtPayload: Record<string, unknown> = { ...(payload ?? {}) };
    jwtPayload.iat = nowSec;
    if (options.issuer) jwtPayload.iss = options.issuer;
    if (options.audience) jwtPayload.aud = options.audience;
    if (options.subject) jwtPayload.sub = options.subject;
    if (options.jti) jwtPayload.jti = options.jti;
    if (options.expiresIn !== undefined) {
      const exp = typeof options.expiresIn === 'number'
        ? nowSec + options.expiresIn
        : nowSec + this.parseExpiresInToSeconds(options.expiresIn);
      jwtPayload.exp = exp;
    }

    const protectedHeader = { alg: 'RS256', kid, typ: 'JWT' } as const;
    const encodedHeader = Buffer.from(JSON.stringify(protectedHeader)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
    const tbs = Buffer.from(`${encodedHeader}.${encodedPayload}`);
    const signature = await this.keyProvider.sign(tbs);
    const encodedSig = Buffer.from(signature).toString('base64url');
    return `${encodedHeader}.${encodedPayload}.${encodedSig}`;
  }

  private parseExpiresInToSeconds(value: string): number {
    const trimmed = value.trim();
    const match = /^(\d+)\s*([smhd])$/i.exec(trimmed);
    if (!match) {
      throw new TalakWeb3Error(`Invalid expiresIn format: ${value}`, {
        code: 'AUTH_INVALID_EXPIRES_IN',
        status: 400,
      });
    }
    const amount = Number(match[1]!);
    const unit = match[2]!.toLowerCase();
    switch (unit) {
      case 's': return amount;
      case 'm': return amount * 60;
      case 'h': return amount * 60 * 60;
      case 'd': return amount * 24 * 60 * 60;
      default:
        return amount;
    }
  }

  async verify(token: string, options: {
    issuer?: string;
    audience?: string;
    requiredClaims?: string[];
  } = {}): Promise<any> {
    const { header } = await this.decodeProtectedHeader(token);
    const kid = header.kid;

    if (!kid) {
      throw new TalakWeb3Error('JWT missing key ID (kid)', {
        code: 'AUTH_JWT_MISSING_KID',
        status: 401,
      });
    }

    // Get public key (with caching)
    let publicKey = this.verificationCache.get(kid);
    if (!publicKey) {
      const verificationKeys = await this.keyProvider.getVerificationKeys();
      const key = verificationKeys.find(k => k.kid === kid);
      if (!key) {
        throw new TalakWeb3Error(`Public key with kid "${kid}" not found`, {
          code: 'AUTH_PUBLIC_KEY_NOT_FOUND',
          status: 401,
        });
      }
      publicKey = key.publicKey;
      this.verificationCache.set(kid, publicKey);
      
      // Cache cleanup
      setTimeout(() => this.verificationCache.delete(kid), this.cacheTimeoutMs);
    }

    const verifyOptions: JWTVerifyOptions = {
      algorithms: ['RS256'],
    };
    
    if (options.issuer) verifyOptions.issuer = options.issuer;
    if (options.audience) verifyOptions.audience = options.audience;
    if (options.requiredClaims) verifyOptions.requiredClaims = options.requiredClaims;

    const { payload } = await jwtVerify(token, publicKey, verifyOptions);
    return payload;
  }

  private async decodeProtectedHeader(token: string): Promise<{ header: any }> {
    const { decodeProtectedHeader } = await import('jose');
    const header = decodeProtectedHeader(token);
    return { header };
  }

  async getJwks(): Promise<JwksResponse> {
    if ('getJwks' in this.keyProvider) {
      return (this.keyProvider as EnvironmentKeyProvider).getJwks();
    }
    
    // For other providers, construct JWKS from verification keys
    const keys = await this.keyProvider.getVerificationKeys();
    const jwks: JwksResponse = { keys: [] };
    
    // This would need proper JWK conversion in a real implementation
    for (const key of keys) {
      // Convert KeyLike to JWK format
      // Placeholder implementation
    }
    
    return jwks;
  }

  /**
   * Emergency purge: Remove all keys from the provider.
   * CRITICAL: Also clears verification cache to prevent use of revoked keys.
   */
  async emergencyPurge(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {
    let kid: string;
    
    if ('emergencyPurge' in this.keyProvider) {
      kid = await (this.keyProvider as any).emergencyPurge(newPrivateKey, newPublicKey);
    } else {
      // Fallback: rotate keys if possible
      const result = await this.keyProvider.rotateKey();
      kid = result.kid;
    }
    
    // CRITICAL: Clear verification cache to prevent use of revoked keys
    // Without this, cached public keys allow verification of tokens signed with revoked keys
    this.clearCache();
    
    return kid;
  }

  clearCache(): void {
    this.verificationCache.clear();
  }

  /**
   * Invalidate a specific key from the verification cache
   * Called when key revocation is received via Pub/Sub
   */
  invalidateKey(kid: string): void {
    if (this.verificationCache.has(kid)) {
      this.verificationCache.delete(kid);
      console.log('[AUTH] Invalidated verification cache for key:', kid);
    }
  }
}
