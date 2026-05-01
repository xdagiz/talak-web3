import { createAuthApp } from "@talak-web3/handlers/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { app as talakApp } from "./talak.config.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.route("/auth", createAuthApp(talakApp));

app.get("/api/protected", async (c) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const session = await talakApp.context.auth.verifySession(token);

  return c.json({
    message: "Protected data",
    address: session.address,
  });
});

const port = parseInt(process.env.PORT || "3000");
console.log(`🚀 Server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
