import type { TalakWeb3Auth } from "@talak-web3/auth";
import { TalakWeb3Error } from "@talak-web3/errors";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function createJwksEndpoint(auth: TalakWeb3Auth) {
  return async (c: Context) => {
    try {
      const jwks = await auth.getJwks();

      c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      c.header("Content-Type", "application/json");
      c.header("X-Content-Type-Options", "nosniff");

      return c.json(jwks);
    } catch (err) {
      if (err instanceof TalakWeb3Error) {
        return c.json({ error: err.message, code: err.code }, err.status as ContentfulStatusCode);
      }
      return c.json({ error: "Internal Server Error" }, 500);
    }
  };
}
