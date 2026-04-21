import { TalakWeb3Error } from '@talak-web3/errors';

export function validateEnv(): void {
  const required = [
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'REDIS_URL',
    'SIWE_DOMAIN'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new TalakWeb3Error(
      `CRITICAL CONFIGURATION ERROR: Missing mandatory environment variables: ${missing.join(', ')}`,
      { code: 'ENV_MISSING_REQUIRED', status: 500 }
    );
  }

  const priv = process.env['JWT_PRIVATE_KEY']!;
  const pub = process.env['JWT_PUBLIC_KEY']!;

  if (!priv.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new TalakWeb3Error(
      'INVALID CONFIGURATION: JWT_PRIVATE_KEY must be a valid PKCS#8 PEM string',
      { code: 'ENV_JWT_KEY_INVALID', status: 500 }
    );
  }

  if (!pub.includes('-----BEGIN PUBLIC KEY-----')) {
    throw new TalakWeb3Error(
      'INVALID CONFIGURATION: JWT_PUBLIC_KEY must be a valid SPKI PEM string',
      { code: 'ENV_JWT_KEY_INVALID', status: 500 }
    );
  }

  if (!process.env['REDIS_URL']?.startsWith('redis://') && !process.env['REDIS_URL']?.startsWith('rediss://')) {
    throw new TalakWeb3Error(
      'INVALID CONFIGURATION: REDIS_URL must be a valid redis:// or rediss:// connection string',
      { code: 'ENV_REDIS_URL_INVALID', status: 500 }
    );
  }

  console.log('[BOOTSTRAP] Environment validation: PASSED');
  console.log('[BOOTSTRAP] JWT mode: RS256');
}
