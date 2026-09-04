import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, custom, type Hex } from "viem";
import { mainnet } from "viem/chains";
import { signMessage as signMessageAction } from "viem/actions";
import { buildSiweMessage, generateNonce } from "./siwe";
import {
  parseSiweMessage,
  verifySiweSignature,
  generateSessionToken,
} from "./siwe-verify";

const PRIV = "0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318";

// Simulate a browser wallet's personal_sign: sign the message with a viem
// wallet client backed by a local "ethers-like" transport. This is the exact
// ECDSA path MetaMask produces and is symmetric with verifyMessage.
async function signWithWallet(message: string, privateKey: Hex): Promise<string> {
  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: mainnet,
    transport: custom({
      // Not used for signing; only satisfies the transport contract.
      request: async () => undefined,
    }),
  });
  return signMessageAction(client, { account, message });
}

describe("SIWE functional (real crypto)", () => {
  it("round-trips a real signed SIWE message through parse + verify", async () => {
    const acct = privateKeyToAccount(PRIV);
    const nonce = generateNonce();

    const message = buildSiweMessage({
      domain: "localhost",
      address: acct.address,
      uri: "http://localhost:5177",
      chainId: 1,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    // Simulate a wallet signing the SIWE message.
    const signature = await signWithWallet(message, PRIV);

    // 1. Parse should recover the structured fields.
    const parsed = parseSiweMessage(message);
    expect(parsed.address.toLowerCase()).toBe(acct.address.toLowerCase());
    expect(parsed.domain).toBe("localhost");
    expect(parsed.uri).toBe("http://localhost:5177");
    expect(parsed.chainId).toBe(1);
    expect(parsed.nonce).toBe(nonce);
    expect(parsed.statement).toContain("Sign in with Ethereum");

    // 2. Verification of a genuine signature must pass.
    await expect(
      verifySiweSignature(message, signature, acct.address),
    ).resolves.toBe(true);

    // 3. A genuine signature from a DIFFERENT address must fail.
    const other = privateKeyToAccount(
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    );
    await expect(
      verifySiweSignature(message, signature, other.address),
    ).rejects.toThrow();
  });

  it("rejects a tampered message", async () => {
    const acct = privateKeyToAccount(PRIV);
    const message = buildSiweMessage({
      domain: "localhost",
      address: acct.address,
      uri: "http://localhost:5177",
      chainId: 1,
      nonce: generateNonce(),
      issuedAt: new Date().toISOString(),
    });
    const signature = await signWithWallet(message, PRIV);

    const tampered = message.replace("Nonce: ", "Nonce: XX");
    await expect(
      verifySiweSignature(tampered, signature, acct.address),
    ).rejects.toThrow();
  });

  it("generates a unique nonce and a hashed session token", async () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(n1).toBeTruthy();
    expect(n1).not.toBe(n2);
    expect(n1.length).toBeGreaterThanOrEqual(8);

    const { token, tokenHash } = await generateSessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toBe(token);
  });
});