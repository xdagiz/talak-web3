/**
 * SIWE (Sign-In with Ethereum) message factories for testing
 */

import type { Address } from 'viem';
import type { SiweMessageFields } from '../types.js';

/**
 * Generate a SIWE message string from fields
 */
export function generateSiweMessage(fields: SiweMessageFields): string {
  const lines = [
    `${fields.domain} wants you to sign in with your Ethereum account:`,
    '',
    fields.address,
    '',
    fields.statement ? fields.statement : '',
    fields.statement ? '' : '',
    `URI: ${fields.uri || 'https://' + fields.domain}`,
    `Version: ${fields.version || '1'}`,
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
  ];

  if (fields.expirationTime) {
    lines.push(`Expiration Time: ${fields.expirationTime}`);
  }

  return lines.join('\n');
}

/**
 * Create a mock SIWE message with default values
 */
export function createMockSiweMessage(
  overrides: Partial<SiweMessageFields> = {}
): { message: string; fields: SiweMessageFields } {
  const now = new Date();
  const issuedAt = now.toISOString();
  
  const fields: SiweMessageFields = {
    domain: overrides.domain ?? 'example.com',
    address: overrides.address ?? '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    chainId: overrides.chainId ?? 1,
    nonce: overrides.nonce ?? generateNonce(),
    issuedAt: overrides.issuedAt ?? issuedAt,
    statement: overrides.statement ?? 'Sign in to the app',
    uri: overrides.uri ?? 'https://example.com',
    version: overrides.version ?? '1',
  };
  if (overrides.expirationTime) {
    fields.expirationTime = overrides.expirationTime;
  }

  return {
    message: generateSiweMessage(fields),
    fields,
  };
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create an expired SIWE message for testing expiration handling
 */
export function createExpiredSiweMessage(
  overrides: Partial<SiweMessageFields> = {}
): { message: string; fields: SiweMessageFields } {
  const past = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  const issuedAt = new Date(past.getTime() - 60 * 60 * 1000).toISOString();
  const expirationTime = past.toISOString();

  return createMockSiweMessage({
    ...overrides,
    issuedAt,
    expirationTime,
  });
}

/**
 * Create a SIWE message with a future issuedAt for testing
 */
export function createFutureSiweMessage(
  overrides: Partial<SiweMessageFields> = {}
): { message: string; fields: SiweMessageFields } {
  const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in future
  
  return createMockSiweMessage({
    ...overrides,
    issuedAt: future.toISOString(),
  });
}
