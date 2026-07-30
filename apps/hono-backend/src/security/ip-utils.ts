import { isIP, isIPv6 } from "node:net";

import type { Context } from "hono";

const DEFAULT_CLOUDFLARE_RANGES = [
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "108.162.192.0/18",
  "131.0.72.0/22",
  "141.101.64.0/18",
  "162.158.0.0/15",
  "172.64.0.0/13",
  "173.245.48.0/20",
  "188.114.96.0/20",
  "190.93.240.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
] as const;

const DEFAULT_LOOPBACK_RANGES = ["127.0.0.1", "::1"] as const;

export const TRUSTED_PROXY_RANGES = process.env["TRUSTED_PROXY_RANGES"]
  ? process.env["TRUSTED_PROXY_RANGES"]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [...DEFAULT_CLOUDFLARE_RANGES, ...DEFAULT_LOOPBACK_RANGES];

function ipv6ToBigInt(ip: string): bigint | null {
  const ipv4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4Mapped) {
    const octets = ipv4Mapped[1]!.split(".").map(Number);
    if (octets.length !== 4 || octets.some((n) => n < 0 || n > 255)) return null;
    const ipv4Part =
      (BigInt(octets[0]!) << 24n) |
      (BigInt(octets[1]!) << 16n) |
      (BigInt(octets[2]!) << 8n) |
      BigInt(octets[3]!);
    return (0xffffn << 32n) | ipv4Part;
  }

  let groups: string[];
  if (ip.includes("::")) {
    const parts = ip.split("::");
    if (parts.length > 2) return null;
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    if (left.length + right.length >= 8) return null;
    const missing = 8 - left.length - right.length;
    groups = [...left, ...Array(missing).fill("0"), ...right];
  } else {
    groups = ip.split(":");
    if (groups.length !== 8) return null;
  }

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    value = (value << 16n) | BigInt(`0x${group}`);
  }

  return value;
}

function toIpv4(ip: string): string | null {
  const normalized = ip
    .toLowerCase()
    .replace(/^::ffff:/, "")
    .replace(/^\[|\]$/g, "");

  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(normalized);
  if (!match) return null;

  const octets = match.slice(1, 5).map(Number);
  if (octets.some((n) => n < 0 || n > 255)) return null;

  return normalized;
}

export function isIpInRange(ip: string, range: string): boolean {
  if (ip === range) return true;

  if (!range.includes("/")) {
    return ip === range;
  }

  const parts = range.split("/");
  if (parts.length !== 2) return false;
  const baseIp = parts[0]!;
  const maskBits = parts[1]!;
  const mask = parseInt(maskBits, 10);
  if (!Number.isInteger(mask) || mask < 0) return false;

  const isBaseV6 = baseIp.includes(":") || isIPv6(baseIp);

  if (!isBaseV6) {
    const ipV4 = toIpv4(ip);
    const baseV4 = toIpv4(baseIp);
    if (!ipV4 || !baseV4 || mask > 32) return false;

    const ipNum = ipV4.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const baseNum =
      baseV4.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const maskNum = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;

    return (ipNum & maskNum) === (baseNum & maskNum);
  }

  if (!ip.includes(":") && !isIPv6(ip)) return false;
  if (mask > 128) return false;

  const ipBigInt = ipv6ToBigInt(ip);
  const rangeBigInt = ipv6ToBigInt(baseIp);
  if (ipBigInt === null || rangeBigInt === null) return false;

  if (mask === 128) return ipBigInt === rangeBigInt;
  if (mask === 0) return true;

  const maskVal = BigInt(128 - mask);
  const maskBigInt = (~0n << maskVal) & ((1n << 128n) - 1n);

  return (ipBigInt & maskBigInt) === (rangeBigInt & maskBigInt);
}

export function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXY_RANGES.some((range) => isIpInRange(ip, range));
}

export function normalizeIp(ip: string): string {
  return ip.replace(/^::ffff:/, "");
}

function isValidIpLike(ip: string): boolean {
  return isIP(ip) !== 0;
}

/** Extracts the real client IP from a Hono request context. */
export function getIp(c: Context): string {
  const socketAddr = (c.req.raw as unknown as { socket?: { remoteAddress?: string } }).socket
    ?.remoteAddress;

  const cfIp = c.req.header("cf-connecting-ip");
  if (cfIp && isValidIpLike(cfIp) && socketAddr && isTrustedProxy(normalizeIp(socketAddr))) {
    return normalizeIp(cfIp);
  }

  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    if (socketAddr && isTrustedProxy(normalizeIp(socketAddr))) {
      const entries = forwarded
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (let i = entries.length - 1; i >= 0; i--) {
        const candidate = normalizeIp(entries[i]!);
        if (isTrustedProxy(candidate)) continue;
        if (isValidIpLike(candidate)) return candidate;
      }
    }
  }

  return socketAddr ? normalizeIp(socketAddr) : "unknown";
}
