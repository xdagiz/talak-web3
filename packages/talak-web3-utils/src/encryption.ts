import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { TalakWeb3Error } from '@talak-web3/errors';

export class FieldEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const masterKey = process.env['DB_ENCRYPTION_KEY'];
    if (!masterKey || masterKey.length < 32) {
      throw new TalakWeb3Error(
        'DB_ENCRYPTION_KEY environment variable is required and must be at least 32 characters for AES-256.',
        { code: 'CRYPTO_KEY_INVALID', status: 500 }
      );
    }

    this.key = scryptSync(masterKey, 'talak-salt', 32);
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedValue: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new TalakWeb3Error('Invalid encrypted value format', {
        code: 'CRYPTO_DECRYPT_ERROR',
        status: 400
      });
    }

    const [ivHex, authTagHex, contentHex] = parts;
    const iv = Buffer.from(ivHex!, 'hex');
    const authTag = Buffer.from(authTagHex!, 'hex');
    const content = Buffer.from(contentHex!, 'hex');

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(content, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

let instance: FieldEncryption | undefined;
export const getFieldEncryption = () => {
  if (!instance) instance = new FieldEncryption();
  return instance;
};
