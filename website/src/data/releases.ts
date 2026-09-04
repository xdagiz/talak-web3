export type ReleaseKind = "major" | "minor" | "patch" | "security";

export type Release = {
  version: string;
  date: string;
  kind: ReleaseKind;
  headline: string;
  highlights: string[];
  details: string;
  upgrade?: string;
};

export const RELEASES: Release[] = [
  {
    version: "1.0.12",
    date: "Apr 22, 2026",
    kind: "patch",
    headline: "Tighter retries, smaller bundles",
    highlights: [
      "Fix retry loop when an RPC provider returns 5xx with empty body",
      "Improve type narrowing for `talak.tx.simulate({ chain })`",
      "Reduce bundle size by ~6 KB (gzip) by tree-shaking unused chain metadata",
    ],
    details:
      "A handful of providers were returning 502s with empty response bodies during regional congestion. The SDK was treating an empty body as a successful (but empty) response and the retry loop never fired. We now distinguish HTTP-level failure from JSON-RPC null and retry the former. The simulate type fix removes a stale `any` that crept in during the 1.0.10 refactor.",
    upgrade: "No code changes required. Just bump the package.",
  },
  {
    version: "1.0.11",
    date: "Apr 12, 2026",
    kind: "minor",
    headline: "Lit Protocol PKPs + Linea/Scroll",
    highlights: [
      "New `@talak-web3/auth` adapter for Lit Protocol PKPs",
      "Webhook deliveries now include an `X-Talak-Idempotency-Key` header",
      "Added Linea + Scroll to the default chain registry",
    ],
    details:
      "PKP support means you can issue programmable keys to your users without giving up the SIWE-shaped session API. Webhook idempotency keys make it safe to retry your handler — same key = same delivery. Linea (59144) and Scroll (534352) are now first-class citizens in `talak.rpc.chains`.",
    upgrade:
      "If you handle webhooks, consider deduplicating on the new header. Existing handlers continue to work unchanged.",
  },
  {
    version: "1.0.10",
    date: "Mar 30, 2026",
    kind: "minor",
    headline: "Streaming events + per-project rate limits",
    highlights: [
      "`talak.events.stream()` — server-sent event subscription with auto-reconnect",
      "Per-project rate limiting in the dashboard",
      "Better error messages when an RPC call exceeds the contract gas limit",
    ],
    details:
      "Streaming events brings real-time delivery to your own infrastructure without WebSockets — same primitive that powers the Activity feed. Per-project rate limits let you isolate noisy environments from production. The gas-limit error now includes the offending method, the limit, and a suggested override.",
  },
  {
    version: "1.0.9",
    date: "Mar 18, 2026",
    kind: "patch",
    headline: "Faster boot, fewer SIWE races",
    highlights: [
      "Resolve race condition in SIWE replay protection",
      "Faster boot for `<TalakProvider>` (now ~80ms cold)",
    ],
    details:
      "Two simultaneous SIWE flows in the same browser tab could consume the same nonce. Fixed by switching to an atomic `consume_nonce` RPC. Provider boot now defers chain metadata loading until first use, cutting cold start time roughly in half.",
  },
  {
    version: "1.0.8",
    date: "Mar 04, 2026",
    kind: "security",
    headline: "TLS 1.3 only, viem bump",
    highlights: [
      "Bump `viem` to 2.21.5 to address a minor verification edge case",
      "All hosted endpoints now negotiate TLS 1.3 only",
    ],
    details:
      "viem 2.21.5 patches a corner case in EIP-712 verification for nested struct types. We weren't affected in practice but bumped to keep the dependency surface clean. Our hosted edge now refuses TLS 1.2 — bring your client up to date if you have very old runtimes.",
    upgrade:
      "Re-deploy after bumping. No application code changes.",
  },
  {
    version: "1.0.0",
    date: "Feb 14, 2026",
    kind: "major",
    headline: "talak-web3 hits 1.0",
    highlights: [
      "1.0 — production ready",
      "Stable APIs for `auth`, `rpc`, `tx`, `events`",
      "Multi-region dashboard with real-time event streaming",
    ],
    details:
      "After 18 months of public beta, the SDK is stable. The four core modules — auth, rpc, tx, events — are now under semver. We commit to no breaking changes inside the 1.x line. Multi-region edge for the dashboard means activity feeds catch up in under a second from anywhere on Earth.",
    upgrade:
      "Drop the `^0.x` constraint and pin `^1.0`. Re-run your tests; nothing in the public surface changed in the bump.",
  },
];

export type RoadmapItem = { title: string; eta: string; desc: string };

export const ROADMAP: RoadmapItem[] = [
  {
    title: "Account abstraction (4337) helper",
    eta: "Q2 2026",
    desc: "Sponsor, simulate, and execute UserOps with a single call.",
  },
  {
    title: "On-chain identity (ENS, Lens, Farcaster)",
    eta: "Q3 2026",
    desc: "Resolve, attest, and display identities across networks.",
  },
  {
    title: "Native AI agents",
    eta: "Q4 2026",
    desc: "Run agent flows server-side with permissioned tx execution.",
  },
  {
    title: "Self-hosted dashboard",
    eta: "2027",
    desc: "Same dashboard, your VPC, your database.",
  },
];

export function getRelease(version: string): Release | undefined {
  return RELEASES.find((r) => r.version === version);
}
