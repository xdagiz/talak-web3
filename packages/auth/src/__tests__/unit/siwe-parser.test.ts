import { describe, it, expect } from "vitest";

import { parseSiweMessage } from "../../index.js";

describe("parseSiweMessage", () => {
  it("should parse a valid SIWE message", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Sign in to the app

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.domain).toBe("example.com");
    expect(result.address).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    expect(result.statement).toBe("Sign in to the app");
    expect(result.uri).toBe("https://example.com");
    expect(result.version).toBe("1");
    expect(result.chainId).toBe(1);
    expect(result.nonce).toBe("abc123def456");
    expect(result.issuedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result.expirationTime).toBeUndefined();
  });

  it("should parse a SIWE message with expiration", () => {
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

    expect(result.expirationTime).toBe("2024-01-01T01:00:00.000Z");
  });

  it("should parse SIWE message with different chain IDs", () => {
    const message = (chainId: number) =>
      `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: ${chainId}
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(parseSiweMessage(message(1)).chainId).toBe(1);
    expect(parseSiweMessage(message(137)).chainId).toBe(137);
    expect(parseSiweMessage(message(42161)).chainId).toBe(42161);
  });

  it("should throw for missing domain", () => {
    const message = `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow();
  });

  it("should throw for missing address", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow(/Invalid SIWE address format/);
  });

  it("should throw for invalid address format", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

invalid-address

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow(/Invalid SIWE address format/);
  });

  it("should throw for missing chain ID", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow();
  });

  it("should throw for missing nonce", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow();
  });

  it("should throw for missing issued at", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456`;

    expect(() => parseSiweMessage(message)).toThrow();
  });

  it("should throw for too-short nonce (less than 8 chars)", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: short
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow(/Invalid SIWE nonce length/);
  });

  it("should throw for unsupported version", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 2
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow(/Unsupported SIWE version/);
  });

  it("should reject messages exceeding 10000 bytes", () => {
    const longStatement = "x".repeat(11_000);
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

${longStatement}

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    expect(() => parseSiweMessage(message)).toThrow(/SIWE message too long/);
  });

  it("should handle lowercase addresses", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.address).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
  });

  it("should handle uppercase addresses", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.address).toBe("0xF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266");
  });

  it("should parse resources list", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z
Resources:
- https://example.com/resource1
- https://example.com/resource2`;

    const result = parseSiweMessage(message);

    expect(result.resources).toEqual([
      "https://example.com/resource1",
      "https://example.com/resource2",
    ]);
  });

  it("should keep '- ' inside a bullet line as part of the resource", () => {
    // Bullets are split at line boundaries only; a resource containing '- '
    // (e.g. "a- b") must not be split into two resources.
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z
Resources:
- a- b
- https://example.com/r`;

    const result = parseSiweMessage(message);

    expect(result.resources).toEqual(["a- b", "https://example.com/r"]);
  });

  it("should not hang on a pathological Resources section (ReDoS regression)", () => {
    // Adversarial input: many "- " repetitions inside one bullet, followed
    // by a non-bullet line. Parsing must complete in linear time (no ReDoS).
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z
Resources:
- ${"a- ".repeat(3_000)}
x`;

    const result = parseSiweMessage(message);

    // Completes in linear time; the single long bullet stays one resource.
    expect(result.resources).toHaveLength(1);
    expect(result.resources?.[0]).toBe("a- ".repeat(3_000).trimEnd());
  });

  it("should not treat a field line as the statement when a blank line is missing", () => {
    // Malformed: blank line between address and URI (non-ABNF). The parser must
    // not report "URI: https://example.com" as the statement.
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

URI: https://example.com

Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.statement).toBeUndefined();
    expect(result.uri).toBe("https://example.com");
  });

  it("should still parse a real statement", () => {
    const message = `example.com wants you to sign in with your Ethereum account:

0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Sign in to the app

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00.000Z`;

    const result = parseSiweMessage(message);

    expect(result.statement).toBe("Sign in to the app");
  });
});
