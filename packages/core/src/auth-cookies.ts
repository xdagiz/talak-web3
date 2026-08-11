export const TALAK_ACCESS_COOKIE = "talak_web3_access";
export const TALAK_REFRESH_COOKIE = "talak_web3_refresh";

export interface AuthCookieOptions {
  path?: string;
  domain?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

export function createSetCookieString(
  name: string,
  value: string,
  options: AuthCookieOptions = {},
): string {
  const isProduction =
    (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production") ||
    (typeof process !== "undefined" && process.env?.["HTTPS"] === "true");
  const secure = options.secure !== undefined ? options.secure : isProduction;
  const httpOnly = options.httpOnly !== undefined ? options.httpOnly : true;
  // Prefer Lax for browser navigations + CSRF-resistant POST-from-other-site default.
  // Aligns with appendAuthCookies (must stay consistent).
  const sameSite = options.sameSite ?? "lax";
  const path = options.path ?? "/";

  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];

  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);

  return parts.join("; ");
}

export function createClearCookieString(name: string, path = "/"): string {
  return `${name}=; Path=${path}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const name = trimmed.slice(0, eqIndex).trim();
    if (!name) continue;
    let value = trimmed.slice(eqIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    cookies.set(name, decodeURIComponent(value));
  }

  return cookies;
}

export function getAccessTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies.get(TALAK_ACCESS_COOKIE) ?? null;
}

export function getRefreshTokenFromRequest(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies.get(TALAK_REFRESH_COOKIE) ?? null;
}

export function appendAuthCookies(
  headers: Headers,
  tokens: { accessToken: string; refreshToken: string },
  options: {
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    secure?: boolean;
  },
): void {
  const secure =
    options.secure ??
    (typeof process !== "undefined" && process.env?.["NODE_ENV"] === "production");
  const cookieDefaults: AuthCookieOptions = {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
  };

  headers.append(
    "Set-Cookie",
    createSetCookieString(TALAK_ACCESS_COOKIE, tokens.accessToken, {
      ...cookieDefaults,
      maxAge: options.accessTtlSeconds,
    }),
  );
  headers.append(
    "Set-Cookie",
    createSetCookieString(TALAK_REFRESH_COOKIE, tokens.refreshToken, {
      ...cookieDefaults,
      maxAge: options.refreshTtlSeconds,
    }),
  );
}

export function appendClearAuthCookies(headers: Headers): void {
  headers.append("Set-Cookie", createClearCookieString(TALAK_ACCESS_COOKIE));
  headers.append("Set-Cookie", createClearCookieString(TALAK_REFRESH_COOKIE));
}

export function getJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binStr = atob(padded);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      exp?: unknown;
    };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}
