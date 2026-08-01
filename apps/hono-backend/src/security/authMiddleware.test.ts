import { TalakWeb3Error } from "@talak-web3/errors";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { authMiddleware } from "./authMiddleware.js";

const stubAuth = { verifySession: async () => ({}) } as never;

function buildApp() {
  const app = new Hono();
  app.onError((err, c) => {
    if (err instanceof TalakWeb3Error) {
      return c.json({ error: err.message, code: err.code }, err.status as never);
    }
    return c.json({ error: "Internal Server Error" }, 500);
  });
  app.use("/auth/*", authMiddleware(stubAuth));
  app.get("/auth/x", (c) => c.text("ok"));
  return app;
}

describe("authMiddleware", () => {
  it("handles X-Forwarded-Proto without node-server conn bindings", async () => {
    const app = buildApp();
    const res = await app.request("/auth/x", {
      headers: { "X-Forwarded-Proto": "https" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects non-HTTPS in production when X-Forwarded-Proto is untrusted", async () => {
    const prev = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    try {
      const app = buildApp();
      const res = await app.request("/auth/x", {
        headers: { Authorization: "Bearer token" },
      });
      expect(res.status).toBe(403);
    } finally {
      process.env["NODE_ENV"] = prev;
    }
  });
});
