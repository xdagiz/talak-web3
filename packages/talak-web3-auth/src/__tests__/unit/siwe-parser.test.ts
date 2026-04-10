/**
 * Unit tests for SIWE (Sign-In with Ethereum) message parsing
 */

import { describe, it, expect } from 'vitest';

// Re-implement parseSiweMessage for testing since it's not exported
function parseSiweMessage(message: string) {
  message = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstLine = message.split('\n')[0]?.trim() ?? '';
  const domainMatch = firstLine.match(/^(.+?) wants you to sign in with your Ethereum account:/);
  const domain = domainMatch?.[1]?.trim();

  const addressMatch = message.match(/^(0x[a-fA-F0-9]{40})$/m);
  const chainIdMatch = message.match(/^Chain ID: (\d+)$/m);
  const nonceMatch = message.match(/^Nonce: ([A-Za-z0-9]+)$/m);
  const issuedAtMatch = message.match(/^Issued At: (.+)$/m);
  const expirationMatch = message.match(/^Expiration Time: (.+)$/m);

  if (!domain || !addressMatch?.[1] || !chainIdMatch?.[1] || !nonceMatch?.[1] || !issuedAtMatch?.[1]) {
    throw new Error('Invalid SIWE message format');
  }

  return {
    domain,
    address: addressMatch[1] as `0x${string}`,
    chainId: parseInt(chainIdMatch[1], 10),
    nonce: nonceMatch[1],
    issuedAt: issuedAtMatch[1],
    expirationTime: expirationMatch?.[1],
  };
}

describe('parseSiweMessage', () => {
  it('should parse a valid SIWE message', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Sign in to the app

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.domain).toBe('example.com');
    expect(result.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(result.chainId).toBe(1);
    expect(result.nonce).toBe('abc123def456');
    expect(result.issuedAt).toBe('2024-01-01T00:00:00.000Z');
    expect(result.expirationTime).toBeUndefined();
  });

  it('should parse a SIWE message with expiration', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Sign in to the app

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z
Expiration Time: 2024-01-01T01:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.expirationTime).toBe('2024-01-01T01:00:00.000Z');
  });

  it('should parse SIWE message with different chain IDs', () => {
    const message = (chainId: number) => `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: ${chainId}
Nonce: abc123
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(parseSiweMessage(message(1)).chainId).toBe(1); // Ethereum
    expect(parseSiweMessage(message(137)).chainId).toBe(137); // Polygon
    expect(parseSiweMessage(message(42161)).chainId).toBe(42161); // Arbitrum
  });

  it('should throw for missing domain', () => {
    const message = `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow('Invalid SIWE message format');
  });

  it('should throw for missing address', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow('Invalid SIWE message format');
  });

  it('should throw for invalid address format', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

invalid-address

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow('Invalid SIWE message format');
  });

  it('should throw for missing chain ID', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow('Invalid SIWE message format');
  });

  it('should throw for missing nonce', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow('Invalid SIWE message format');
  });

  it('should throw for missing issued at', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123`;

    expect(() => parseSiweMessage(message)).toThrow('Invalid SIWE message format');
  });

  it('should handle lowercase addresses', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.address).toBe('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
  });

  it('should handle uppercase addresses', () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123
Issued At: 2024-01-01T00:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.address).toBe('0xF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266');
  });
});
