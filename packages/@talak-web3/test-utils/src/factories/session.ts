import { SignJWT } from "jose";

import type { MockSession, TokenPair } from "../types.js";

export async function createMockSession(
  overrides: Partial<MockSession> = {},
): Promise<MockSession> {
  const address = overrides.address ?? "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
  const chainId = overrides.chainId ?? 1;

  let accessToken = overrides.accessToken;
  let refreshToken = overrides.refreshToken;

  if (!accessToken || !refreshToken) {
    const tokens = await createMockTokenPair(address, chainId);
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  }

  return {
    address: address.toLowerCase(),
    chainId,
    accessToken,
    refreshToken,
    expiresAt: overrides.expiresAt ?? Date.now() + 15 * 60 * 1000,
  };
}

export async function createMockTokenPair(
  address: string,
  chainId: number,
  secret?: Uint8Array,
): Promise<TokenPair> {
  const encoder = new TextEncoder();
  const jwtSecret = secret ?? encoder.encode("test-secret-for-mocking-only");

  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const accessToken = await new SignJWT({ address, chainId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address.toLowerCase())
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(now + 15 * 60)
    .sign(jwtSecret);

  const refreshTokenBytes = new Uint8Array(32);
  crypto.getRandomValues(refreshTokenBytes);
  const refreshToken = Buffer.from(refreshTokenBytes).toString("base64url");

  return { accessToken, refreshToken };
}

export async function createExpiredAccessToken(
  address: string,
  chainId: number,
  secret?: Uint8Array,
): Promise<string> {
  const encoder = new TextEncoder();
  const jwtSecret = secret ?? encoder.encode("test-secret-for-mocking-only");

  const past = Math.floor(Date.now() / 1000) - 60 * 60;
  const jti = crypto.randomUUID();

  return new SignJWT({ address, chainId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address.toLowerCase())
    .setJti(jti)
    .setIssuedAt(past)
    .setExpirationTime(past + 15 * 60)
    .sign(jwtSecret);
}

export function createMalformedToken(): string {
  return "malformed.token.here";
}

export async function createInvalidSignatureToken(
  address: string,
  chainId: number,
): Promise<string> {
  const encoder = new TextEncoder();
  const wrongSecret = encoder.encode("wrong-secret");

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ address, chainId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address.toLowerCase())
    .setIssuedAt()
    .setExpirationTime(now + 15 * 60)
    .sign(wrongSecret);
}
