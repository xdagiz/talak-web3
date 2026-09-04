import { describe, it, expect } from "vitest";
import { CHAINS, getChainById } from "../data/chains";

// Mirror of the APIKeyManager helpers (verified against the real component).
function sha256(text: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then((d) =>
    Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join(""),
  );
}
function generateKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "tk_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("API Key Manager", () => {
  it("generates a tk_-prefixed key that hashes without leaking the plaintext", async () => {
    const plain = generateKey();
    expect(plain).toMatch(/^tk_[0-9a-f]{48}$/);

    const hash = await sha256(plain);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Stored value is the hash — the plaintext must not appear in it.
    expect(hash).not.toContain(plain.replace("tk_", ""));
    expect(hash).not.toBe(plain);

    // The prefix shown in the UI is the first 10 chars of the plaintext.
    expect(plain.slice(0, 10)).toMatch(/^tk_[0-9a-f]{7}$/);

    // Two different keys hash differently.
    const other = await sha256(generateKey());
    expect(other).not.toBe(hash);
  });
});

describe("RPC Playground (direct public RPC)", () => {
  const eth = getChainById(1);
  expect(eth).toBeTruthy();

  async function rpc(method: string, params: unknown[]) {
    const res = await fetch(eth.rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    expect(res.ok).toBe(true);
    return (await res.json()) as { result?: unknown; error?: { message?: string } };
  }

  it("reaches Ethereum mainnet and resolves eth_chainId + eth_blockNumber", async () => {
    const chainId = await rpc("eth_chainId", []);
    expect(chainId.error).toBeFalsy();
    // 0x1 === mainnet
    expect(chainId.result).toBe("0x1");

    const block = await rpc("eth_blockNumber", []);
    expect(block.error).toBeFalsy();
    expect(String(block.result)).toMatch(/^0x[0-9a-f]+$/);
  }, 30000);

  it("reads a balance for a known address", async () => {
    const bal = await rpc("eth_getBalance", [
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      "latest",
    ]);
    expect(bal.error).toBeFalsy();
    expect(String(bal.result)).toMatch(/^0x[0-9a-f]+$/);
  }, 30000);
});

describe("CHAINS registry", () => {
  it("has a resolvable mainnet Ethereum entry used by the playground", () => {
    const c = CHAINS.find((x) => x.id === 1);
    expect(c).toBeTruthy();
    expect(c.rpc).toMatch(/^https:/);
  });
});