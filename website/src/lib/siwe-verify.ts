/**
 * SIWE (EIP-4361) verification helpers.
 *
 * On a static SPA there is no server-side verifier, so we verify the wallet
 * signature in the browser by recovering the signer's public address from the
 * signature and comparing it to the address claimed in the SIWE message.
 *
 * This is cryptographically equivalent to the server-side verification the
 * canonical flow performs, but keeps the session data in the browser (and an
 * audit row in Supabase) rather than on an API server.
 */

import { verifyMessage } from "viem";
import { getAddress, isAddress } from "viem";

export type ParsedSiweMessage = {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
};

/**
 * Parse an EIP-4361 message string into its structured fields. Throws on
 * malformed input (missing address / domain / nonce).
 */
export function parseSiweMessage(message: string): ParsedSiweMessage {
  const lines = message.split("\n").map((l) => l.trimEnd());
  const out: Partial<ParsedSiweMessage> = {};

  const header = lines.find((l) => l.includes(" wants you to sign in with your Ethereum account:"));
  if (header) {
    out.domain = header.split(" wants you to sign in")[0]?.trim() ?? "";
  }

  // Address is the line after the "wants you to sign in" header.
  const headerIdx = lines.findIndex((l) =>
    l.includes(" wants you to sign in with your Ethereum account:")
  );
  if (headerIdx >= 0 && lines[headerIdx + 1]) {
    const addr = lines[headerIdx + 1]!.trim();
    if (isAddress(addr)) {
      out.address = getAddress(addr);
    } else {
      out.address = addr;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith("URI:")) out.uri = line.slice(4).trim();
    else if (line.startsWith("Version:")) out.version = line.slice(8).trim();
    else if (line.startsWith("Chain ID:")) out.chainId = Number(line.slice(9).trim());
    else if (line.startsWith("Nonce:")) out.nonce = line.slice(6).trim();
    else if (line.startsWith("Issued At:")) out.issuedAt = line.slice(10).trim();
    else if (line.startsWith("Expiration Time:")) out.expirationTime = line.slice(16).trim();
    else if (line.startsWith("Not Before:")) out.notBefore = line.slice(11).trim();
    else if (line.startsWith("Request ID:")) out.requestId = line.slice(11).trim();
    else if (line.startsWith("Resources:")) {
      out.resources = [];
      for (let j = i + 1; j < lines.length; j++) {
        const rl = lines[j]!.trim();
        if (rl.startsWith("- ")) {
          out.resources.push(rl.slice(2).trim());
          i = j;
        } else {
          break;
        }
      }
    }
  }

  // Statement is everything between the address line and the first blank line
  // before "URI:" (skipping the blank separator that follows the address).
  if (headerIdx >= 0) {
    const statementLines: string[] = [];
    for (let i = headerIdx + 2; i < lines.length; i++) {
      const l = lines[i]!;
      if (statementLines.length === 0 && l.trim().length === 0) continue;
      if (l.length === 0) break;
      statementLines.push(l);
    }
    if (statementLines.length > 0) {
      out.statement = statementLines.join("\n");
    }
  }

  if (!out.address || !out.domain || !out.nonce) {
    throw new Error("SS-102: Malformed EIP-4361 message (missing address/domain/nonce).");
  }

  return out as ParsedSiweMessage;
}

/**
 * Verify that `signature` was produced by `expectedAddress` over `message`.
 * Rejects empty input. Throws VerifyError if the recovered address does not
 * match, or if the message/address signature is invalid.
 */
export async function verifySiweSignature(
  message: string,
  signature: string,
  expectedAddress: string,
): Promise<boolean> {
  if (!message || !signature) {
    throw new Error("SS-101: Message and signature are required.");
  }
  const addr = expectedAddress.trim().toLowerCase();
  if (!addr || !isAddress(expectedAddress)) {
    throw new Error("SS-103: A valid Ethereum address is required.");
  }

  const valid = await verifyMessage({
    address: expectedAddress as `0x${string}`,
    message,
    signature: signature as `0x${string}`,
  });

  if (!valid) {
    throw new Error(
      "SS-104: Signature does not match the signer address. Aborting link.",
    );
  }
  return true;
}

/**
 * Generate a random session token and return both the plaintext and its
 * SHA-256 hex digest. Only the digest should be persisted (so a DB leak does
 * not expose active tokens), matching the `sessions.token_hash` column.
 */
export async function generateSessionToken(): Promise<{
  token: string;
  tokenHash: string;
}> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { token, tokenHash };
}
