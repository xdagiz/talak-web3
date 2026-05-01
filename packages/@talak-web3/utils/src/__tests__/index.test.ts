import { describe, it, expect } from "vitest";

import { validateAddress, isValidHash, shortenAddress } from "../index.js";

describe("Address Utilities", () => {
  describe("validateAddress", () => {
    it("should return true for valid Ethereum address", () => {
      expect(validateAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")).toBe(false);
    });

    it("should return true for valid checksum address", () => {
      expect(validateAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0")).toBe(true);
    });

    it("should return false for invalid address", () => {
      expect(validateAddress("0xinvalid")).toBe(false);
      expect(validateAddress("invalid")).toBe(false);
      expect(validateAddress("")).toBe(false);
    });
  });

  describe("shortenAddress", () => {
    it("should shorten address correctly", () => {
      const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      expect(shortenAddress(address)).toBe("0x742d...bEb0");
    });

    it("should respect chars parameter", () => {
      const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
      expect(shortenAddress(address, 6)).toBe("0x742d35...f0bEb0");
    });

    it("should throw for invalid address", () => {
      expect(() => shortenAddress("invalid")).toThrow();
    });
  });
});

describe("Hash Utilities", () => {
  describe("isValidHash", () => {
    it("should return true for valid 32-byte hash", () => {
      const hash = "0x" + "a".repeat(64);
      expect(isValidHash(hash)).toBe(true);
    });

    it("should return false for invalid hash", () => {
      expect(isValidHash("0xinvalid")).toBe(false);
      expect(isValidHash("invalid")).toBe(false);
      expect(isValidHash("0x" + "a".repeat(63))).toBe(false);
    });
  });
});
