import dns from "node:dns";
import net from "node:net";

import { z } from "zod";

export const isPrivateOrLoopbackHost = (hostname: string): boolean => {
  const lc = hostname.toLowerCase();
  if (lc === "localhost" || lc.endsWith(".localhost") || lc.endsWith(".local")) return true;
  if (lc === "::1" || lc === "[::1]") return true;

  const mapped = hostname.replace(/^\[|\]$/g, "").split("%")[0] ?? "";
  if (mapped.includes(":")) {
    const normalized = normalizeV4Mapped(mapped);
    if (normalized !== mapped) {
      return isPrivateOrLoopbackHost(normalized);
    }
  }

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (v4) {
    const o = v4.slice(1, 5).map((n) => Number(n));
    if (o.some((n) => n < 0 || n > 255)) return false;

    const [a, b] = o as [number, number, number, number];

    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 0) return true;
    if (a >= 224) return true;

    return false;
  }

  const v6 = hostname.replace(/^\[|\]$/g, "").split("%")[0] ?? "";
  if (v6.includes(":")) {
    const value = ipv6ToBigIntSafe(v6);
    if (value === null) return false;
    if (value === 0n || value === 1n) return true;

    const hi16 = value >> 112n;
    if (hi16 >= 0xfc00n && hi16 <= 0xfdffn) return true;
    if (hi16 >= 0xfe80n && hi16 <= 0xfebfn) return true;
    if (hi16 >= 0xff00n) return true;

    if (value >> 32n === 0xffffn) {
      const low = value & 0xffffffffn;
      const v4 = `${low >> 24n}.${(low >> 16n) & 0xffn}.${(low >> 8n) & 0xffn}.${low & 0xffn}`;
      return isPrivateOrLoopbackHost(v4);
    }

    return false;
  }

  return false;
};

function ipv6ToBigIntSafe(ip: string): bigint | null {
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

const HttpsRpcUrl = z
  .string()
  .url()
  .refine(
    (u) => {
      try {
        const parsed = new URL(u);
        return parsed.protocol === "https:" || parsed.protocol === "wss:";
      } catch {
        return false;
      }
    },
    { message: "RPC URLs must use https:// or wss://" },
  )
  .refine(
    (u) => {
      try {
        const parsed = new URL(u);
        return !isPrivateOrLoopbackHost(parsed.hostname);
      } catch {
        return false;
      }
    },
    {
      message:
        "RPC URLs must not point at private, loopback, or link-local addresses (10.0.0.0/8, 172.16/12, 192.168/16, 127.0.0.0/8, 169.254/16, ::1, fc00::/7, localhost)",
    },
  );

/**
 * Normalize an IPv4-mapped IPv6 address to its embedded IPv4 dotted-decimal form.
 * Handles both dotted-decimal tail (`::ffff:192.168.1.1`) and hex-normalized
 * forms (`::ffff:c0a8:101`, `::ffff:c0a8:101`) produced by WHATWG URL parser.
 * Returns the normalized IPv4 string if applicable, or the original string.
 */
function normalizeV4Mapped(hostname: string): string {
  const lc = hostname.toLowerCase();

  const dotMatch = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(lc);
  if (dotMatch) return dotMatch[1]!;

  const hexMatch = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lc);
  if (hexMatch) {
    const hi = parseInt(hexMatch[1]!, 16);
    const lo = parseInt(hexMatch[2]!, 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  const fullMatch = /^(?:[0-9a-f]{1,4}:){5}ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(lc);
  if (fullMatch) {
    const hi = parseInt(fullMatch[1]!, 16);
    const lo = parseInt(fullMatch[2]!, 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  return hostname;
}

/**
 * Resolve a hostname and validate all returned IPs are not private/loopback.
 * This prevents DNS rebinding attacks where a hostname resolves to a safe IP
 * at validation time but a malicious IP at connection time.
 *
 * NOTE: the `HttpsRpcUrl` schema above performs string-level validation only
 * (the config schema is synchronous). DNS rebinding is additionally mitigated
 * for `https:`/`wss:` URLs by TLS hostname verification, so transports that
 * accept non-TLS URLs should call this function (once per unique hostname,
 * cached) before issuing requests.
 *
 * @returns Array of validated IP addresses with their family (4 or 6)
 * @throws Error if any resolved IP is private/loopback or DNS returns no usable addresses
 */
export async function resolveAndValidateDns(
  hostname: string,
): Promise<Array<{ address: string; family: 4 | 6 }>> {
  if (net.isIP(hostname) !== 0) {
    return [{ address: hostname, family: net.isIP(hostname) as 4 | 6 }];
  }

  const addresses = await dns.promises.lookup(hostname, { all: true });
  const usable = addresses.filter(({ address }) => address !== "::" && address !== "0.0.0.0");

  if (usable.length === 0) {
    throw new Error(`DNS resolved ${hostname} to no usable addresses`);
  }

  for (const { address } of usable) {
    if (isPrivateOrLoopbackHost(address)) {
      throw new Error(`DNS rebinding detected: ${hostname} resolved to private IP ${address}`);
    }
  }

  return usable as Array<{ address: string; family: 4 | 6 }>;
}

export const ChainSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  rpcUrls: z.array(HttpsRpcUrl).min(1),
  nativeCurrency: z.object({
    name: z.string(),
    symbol: z.string(),
    decimals: z.number().int().default(18),
  }),
  blockExplorers: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
      }),
    )
    .optional(),
  testnet: z.boolean().default(false),
});

export const PluginSchema = z
  .object({
    name: z.string(),
    version: z.string(),
    setup: z.function(),
    teardown: z.function().optional(),
  })
  .passthrough();

export const TalakWeb3ConfigSchema = z.object({
  chains: z.array(ChainSchema).min(1, "At least one chain configuration is required").default([]),
  plugins: z.array(PluginSchema).default([]),
  auth: z
    .object({
      domain: z.string().optional(),
      uri: z.string().url().optional(),
      version: z.string().default("1"),
    })
    .optional(),
  rpc: z
    .object({
      retries: z.number().int().default(7),
      timeout: z.number().int().default(10000),
    })
    .default({ retries: 7, timeout: 10000 }),
  debug: z.boolean().default(false),
  allowedOrigins: z.array(z.string()).optional(),
  ai: z
    .object({
      apiKey: z.string().min(1).optional(),
      baseUrl: z.string().url().optional(),
      model: z.string().optional(),
      mockMode: z.boolean().optional(),
    })
    .optional(),
  ceramic: z
    .object({
      nodeUrl: z.string().url(),
      seed: z.string().optional(),
    })
    .optional(),
  tableland: z
    .object({
      privateKey: z.string().optional(),
      network: z.string().optional(),
    })
    .optional(),
});

export type TalakWeb3Config = z.infer<typeof TalakWeb3ConfigSchema>;
export type Chain = z.infer<typeof ChainSchema>;

/** @internal Validate and return a chain config with full IDE autocompletion. Catches typos at the definition site. */
export function defineChain(config: Chain): Chain {
  return config;
}
