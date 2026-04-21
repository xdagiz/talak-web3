import { randomBytes, createHash } from 'node:crypto';

export function generateTestKeys(): {
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
  jwtSecret: Uint8Array;
} {
  const privateKey = `0x${randomBytes(32).toString('hex')}` as `0x${string}`;
  const publicKey = `0x04${randomBytes(64).toString('hex')}` as `0x${string}`;
  const jwtSecret = randomBytes(32);

  return {
    privateKey,
    publicKey,
    jwtSecret,
  };
}

export function generateTestSecret(): Uint8Array {
  return randomBytes(32);
}

export function generateTestApiKey(): string {
  return `tk_${randomBytes(32).toString('base64url')}`;
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function randomHex(length: number): `0x${string}` {
  return `0x${randomBytes(Math.ceil(length / 2)).toString('hex').substring(0, length)}`;
}

export function randomBase64(length: number = 32): string {
  return randomBytes(length).toString('base64url');
}
