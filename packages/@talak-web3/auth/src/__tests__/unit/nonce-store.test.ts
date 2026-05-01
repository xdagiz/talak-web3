import { describe, it, expect, beforeEach } from "vitest";

import { InMemoryNonceStore } from "../../index.js";

describe("InMemoryNonceStore", () => {
  let store: InMemoryNonceStore;

  beforeEach(() => {
    store = new InMemoryNonceStore({ ttlMs: 5000 });
  });

  describe("create", () => {
    it("should create a nonce for an address", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const nonce = await store.create(address);

      expect(nonce).toBeDefined();
      expect(nonce).toHaveLength(32);
      expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    });

    it("should create unique nonces for the same address", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const nonce1 = await store.create(address);
      const nonce2 = await store.create(address);

      expect(nonce1).not.toBe(nonce2);
    });

    it("should handle addresses case-insensitively", async () => {
      const addressLower = "0x742d35cc6634c0532925a3b844bc9e7595f0beb";
      const addressUpper = "0x742D35CC6634C0532925A3B844BC9E7595F0BEB";

      const nonce = await store.create(addressLower);
      const consumed = await store.consume(addressUpper, nonce);

      expect(consumed).toBe(true);
    });

    it("should accept optional metadata", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const meta = { ip: "127.0.0.1", ua: "Mozilla/5.0" };

      const nonce = await store.create(address, meta);

      expect(nonce).toBeDefined();
    });
  });

  describe("consume", () => {
    it("should consume a valid nonce", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const nonce = await store.create(address);

      const consumed = await store.consume(address, nonce);

      expect(consumed).toBe(true);
    });

    it("should return false for non-existent nonce", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const consumed = await store.consume(address, "nonexistent");

      expect(consumed).toBe(false);
    });

    it("should return false for already consumed nonce (replay protection)", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const nonce = await store.create(address);

      const consumed1 = await store.consume(address, nonce);
      const consumed2 = await store.consume(address, nonce);

      expect(consumed1).toBe(true);
      expect(consumed2).toBe(false);
    });

    it("should return false for nonce from different address", async () => {
      const address1 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const address2 = "0x8ba1f109551bD432803012645Hac136c82C3e8C9";
      const nonce = await store.create(address1);

      const consumed = await store.consume(address2, nonce);

      expect(consumed).toBe(false);
    });

    it("should return false for expired nonce", async () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const shortStore = new InMemoryNonceStore({ ttlMs: 1 });

      const nonce = await shortStore.create(address);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const consumed = await shortStore.consume(address, nonce);

      expect(consumed).toBe(false);
    });
  });

  describe("TTL enforcement", () => {
    it("should cap TTL at 5 minutes maximum", async () => {
      const longStore = new InMemoryNonceStore({ ttlMs: 10 * 60 * 1000 });
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const nonce = await longStore.create(address);
      const consumed = await longStore.consume(address, nonce);

      expect(consumed).toBe(true);
    });
  });
});
