import { describe, it, expect } from "vitest";

import { TalakWeb3Error } from "../index.js";

describe("TalakWeb3Error", () => {
  it("should create error with code and status", () => {
    const error = new TalakWeb3Error("Test error", {
      code: "TEST_ERROR",
      status: 400,
    });

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.status).toBe(400);
  });

  it("should support cause chain", () => {
    const cause = new Error("Root cause");
    const error = new TalakWeb3Error("Wrapper error", {
      code: "WRAPPER",
      status: 500,
      cause,
    });

    expect(error.cause).toBe(cause);
  });

  it("should support additional data", () => {
    const error = new TalakWeb3Error("Validation failed", {
      code: "VALIDATION",
      status: 422,
      data: { field: "email", value: "invalid" },
    });

    expect(error.data).toEqual({ field: "email", value: "invalid" });
  });

  it("should have correct name", () => {
    const error = new TalakWeb3Error("Test", { code: "TEST", status: 400 });
    expect(error.name).toBe("TalakWeb3Error");
  });
});
