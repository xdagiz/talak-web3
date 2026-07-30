import type { Context } from "hono";
import { describe, expect, it } from "vitest";

import { getIp, isIpInRange, isTrustedProxy, normalizeIp } from "./ip-utils.js";

function fakeContext(opts: { socketAddr?: string; headers?: Record<string, string> }): Context {
  const { socketAddr, headers = {} } = opts;
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()] ?? headers[name] ?? undefined,
      raw: { socket: socketAddr ? { remoteAddress: socketAddr } : undefined },
    },
  } as unknown as Context;
}

describe("isIpInRange", () => {
  it("matches IPv4 addresses within a CIDR range", () => {
    expect(isIpInRange("173.245.48.5", "173.245.48.0/20")).toBe(true);
    expect(isIpInRange("173.245.63.255", "173.245.48.0/20")).toBe(true);
    expect(isIpInRange("173.245.64.1", "173.245.48.0/20")).toBe(false);
    expect(isIpInRange("10.0.0.1", "10.0.0.0/8")).toBe(true);
    expect(isIpInRange("11.0.0.1", "10.0.0.0/8")).toBe(false);
  });

  it("matches exact addresses without a prefix", () => {
    expect(isIpInRange("127.0.0.1", "127.0.0.1")).toBe(true);
    expect(isIpInRange("127.0.0.2", "127.0.0.1")).toBe(false);
    expect(isIpInRange("::1", "::1")).toBe(true);
    expect(isIpInRange("::2", "::1")).toBe(false);
  });

  it("matches IPv4-mapped IPv6 against IPv4 ranges", () => {
    expect(isIpInRange("::ffff:127.0.0.1", "127.0.0.1/8")).toBe(true);
    expect(isIpInRange("::ffff:173.245.48.5", "173.245.48.0/20")).toBe(true);
    expect(isIpInRange("::ffff:192.168.1.1", "173.245.48.0/20")).toBe(false);
  });

  it("matches IPv6 addresses within a CIDR range", () => {
    expect(isIpInRange("2606:4700:4700::1111", "2606:4700::/32")).toBe(true);
    expect(isIpInRange("2606:4700:ffff::1", "2606:4700::/32")).toBe(true);
    expect(isIpInRange("2606:4701::1", "2606:4700::/32")).toBe(false);
    expect(isIpInRange("2400:cb00::1", "2400:cb00::/32")).toBe(true);
    expect(isIpInRange("2a06:98c0:ffff::1", "2a06:98c0::/29")).toBe(true);
    expect(isIpInRange("2a06:98c8::1", "2a06:98c0::/29")).toBe(false);
  });

  it("matches exact IPv6 addresses with a /128 prefix", () => {
    expect(isIpInRange("::1", "::1/128")).toBe(true);
    expect(isIpInRange("::2", "::1/128")).toBe(false);
  });

  it("handles IPv6-vs-IPv4 range mismatches without throwing", () => {
    // Regression: these used to throw SyntaxError (BigInt of "0x173.245.48.0").
    expect(isIpInRange("2606:4700:4700::1111", "173.245.48.0/20")).toBe(false);
    expect(isIpInRange("::ffff:127.0.0.1", "173.245.48.0/20")).toBe(false);
    expect(isIpInRange("127.0.0.1", "::1/128")).toBe(false);
  });

  it("rejects malformed ranges and masks", () => {
    expect(isIpInRange("1.2.3.4", "not-a-range")).toBe(false);
    expect(isIpInRange("1.2.3.4", "1.2.3.4/abc")).toBe(false);
    expect(isIpInRange("1.2.3.4", "1.2.3.4/33")).toBe(false);
    expect(isIpInRange("::1", "::1/129")).toBe(false);
  });

  it("does not throw on malformed IPv6 text", () => {
    expect(isIpInRange("ga:rb:ag:e", "2606:4700::/32")).toBe(false);
    expect(isIpInRange("zz::1", "2606:4700::/32")).toBe(false);
    expect(isIpInRange("fe80::1%eth0", "2606:4700::/32")).toBe(false);
    expect(isIpInRange("::1::2", "2606:4700::/32")).toBe(false);
    expect(isIpInRange("2606:4700::1", "zz::/32")).toBe(false);
  });
});

describe("isTrustedProxy", () => {
  it("trusts Cloudflare IPv4 ranges", () => {
    expect(isTrustedProxy("173.245.48.5")).toBe(true);
    expect(isTrustedProxy("104.16.0.1")).toBe(true);
    expect(isTrustedProxy("8.8.8.8")).toBe(false);
    expect(isTrustedProxy("192.168.1.1")).toBe(false);
  });

  it("trusts Cloudflare IPv6 ranges", () => {
    expect(isTrustedProxy("2606:4700:4700::1111")).toBe(true);
    expect(isTrustedProxy("2400:cb00::1")).toBe(true);
    expect(isTrustedProxy("2a06:98c0::1")).toBe(true);
    // IPv6-mapped Cloudflare IPv4 must also match (no crash, matches v4 ranges)
    expect(isTrustedProxy("::ffff:173.245.48.5")).toBe(true);
  });

  it("trusts loopback addresses", () => {
    expect(isTrustedProxy("127.0.0.1")).toBe(true);
    expect(isTrustedProxy("::1")).toBe(true);
  });
});

describe("normalizeIp", () => {
  it("strips the IPv4-mapped IPv6 prefix", () => {
    expect(normalizeIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(normalizeIp("8.8.8.8")).toBe("8.8.8.8");
    expect(normalizeIp("2606:4700::1")).toBe("2606:4700::1");
  });
});

describe("getIp", () => {
  it("trusts cf-connecting-ip when the socket peer is a trusted proxy", () => {
    expect(
      getIp(
        fakeContext({
          socketAddr: "173.245.48.5", // Cloudflare IPv4
          headers: { "cf-connecting-ip": "8.8.8.8" },
        }),
      ),
    ).toBe("8.8.8.8");

    expect(
      getIp(
        fakeContext({
          socketAddr: "2606:4700:4700::1111", // Cloudflare IPv6
          headers: { "cf-connecting-ip": "::ffff:1.2.3.4" },
        }),
      ),
    ).toBe("1.2.3.4");

    expect(
      getIp(
        fakeContext({
          socketAddr: "127.0.0.1", // loopback is a trusted proxy
          headers: { "cf-connecting-ip": "9.9.9.9" },
        }),
      ),
    ).toBe("9.9.9.9");
  });

  it("ignores cf-connecting-ip when the socket peer is untrusted (spoof protection)", () => {
    // Attacker connects directly to the origin and forges the header.
    expect(
      getIp(
        fakeContext({
          socketAddr: "8.8.8.8", // direct client, not a proxy
          headers: { "cf-connecting-ip": "6.6.6.6" },
        }),
      ),
    ).toBe("8.8.8.8");
  });

  it("ignores cf-connecting-ip when no socket address is available", () => {
    expect(
      getIp(
        fakeContext({
          headers: { "cf-connecting-ip": "6.6.6.6" },
        }),
      ),
    ).toBe("unknown");
  });

  it("ignores malformed cf-connecting-ip values even from trusted proxies", () => {
    expect(
      getIp(
        fakeContext({
          socketAddr: "173.245.48.5",
          headers: { "cf-connecting-ip": "abc:def" },
        }),
      ),
    ).toBe("173.245.48.5");
  });

  it("still honors X-Forwarded-For from a trusted proxy when cf-connecting-ip is absent", () => {
    expect(
      getIp(
        fakeContext({
          socketAddr: "173.245.48.5",
          headers: { "x-forwarded-for": "1.2.3.4" },
        }),
      ),
    ).toBe("1.2.3.4");
  });

  it("ignores X-Forwarded-For from an untrusted socket (regression)", () => {
    expect(
      getIp(
        fakeContext({
          socketAddr: "8.8.8.8",
          headers: { "x-forwarded-for": "6.6.6.6" },
        }),
      ),
    ).toBe("8.8.8.8");
  });

  it("falls back to the socket address when no forwarded headers are usable", () => {
    expect(getIp(fakeContext({ socketAddr: "::ffff:10.0.0.7" }))).toBe("10.0.0.7");
    expect(getIp(fakeContext({}))).toBe("unknown");
  });
});
