import { randomBytes } from "node:crypto";

import { TalakWeb3Error } from "@talak-web3/errors";
import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { CookieOptions } from "hono/utils/cookie";

export function csrfProtection(): MiddlewareHandler {
  return async (c, next) => {
    let token = getCookie(c, "csrf_token");

    if (!token) {
      token = randomBytes(16).toString("hex");
      const cookieDomain = process.env["COOKIE_DOMAIN"];
      const cookieOptions: CookieOptions = {
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Strict",
        maxAge: 60 * 60 * 24 * 7,
      };
      if (cookieDomain) {
        cookieOptions.domain = cookieDomain;
      }
      setCookie(c, "csrf_token", token, cookieOptions);

      c.header("X-CSRF-Token-Initial", token);
    }

    const method = c.req.method;
    const path = c.req.path;
    const isMutating = ["POST", "PUT", "DELETE"].includes(method);
    const isSafePath = path.endsWith("/auth/nonce");

    if (isMutating && !isSafePath) {
      const headerToken = c.req.header("x-csrf-token");

      if (!headerToken || headerToken !== token) {
        throw new TalakWeb3Error(
          "CSRF token mismatch or missing. Double-submit validation failed.",
          {
            code: "CSRF_INVALID",
            status: 403,
          },
        );
      }

      const origin = c.req.header("origin");

      const allowedOrigins = process.env["ALLOWED_ORIGINS"]?.split(",").map((o) => o.trim()) ?? [];

      if (origin && allowedOrigins.length > 0) {
        const originAllowed = allowedOrigins.some((allowed) => {
          try {
            const allowedUrl = new URL(allowed);
            const originUrl = new URL(origin);
            return (
              allowedUrl.hostname === originUrl.hostname &&
              allowedUrl.protocol === originUrl.protocol
            );
          } catch {
            return false;
          }
        });

        if (!originAllowed) {
          throw new TalakWeb3Error("Origin validation failed - cross-site request blocked", {
            code: "CSRF_ORIGIN_MISMATCH",
            status: 403,
          });
        }
      }
    }

    await next();
  };
}
