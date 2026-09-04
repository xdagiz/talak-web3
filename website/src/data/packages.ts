import type { LucideIcon } from "lucide-react";
import {
  Box,
  Shield,
  Network,
  Wallet,
  Hash,
  Sparkles,
  Globe,
  Activity,
  Zap,
  Terminal,
  Server,
  Package,
  Settings,
  Layers,
  AlertTriangle,
  Layout,
  Wrench,
  PenTool,
  FileCode,
  Plug,
  Send,
  Code,
  Beaker,
  ListTree,
  Building2,
  Workflow,
  Gauge,
} from "lucide-react";

export type PkgCategory =
  | "Auth"
  | "RPC"
  | "Wallet"
  | "Identity"
  | "AI"
  | "Observability"
  | "Networking"
  | "Utils"
  | "Core";

export type Pkg = {
  name: string;
  slug: string;
  desc: string;
  long: string;
  icon: LucideIcon;
  category: PkgCategory;
  exports: string[];
  github: string;
  npm: string;
};

const GH = "https://github.com/dagimabebe/talak-web3/tree/main/";
const NPM = "https://www.npmjs.com/package/";

const slugFromName = (n: string) =>
  n === "talak-web3" ? "talak-web3" : n.replace(/^@talak-web3\//, "");

const RAW: Omit<Pkg, "slug" | "github" | "npm">[] = [
  { name: "talak-web3", category: "Core", icon: Box,
    desc: "The meta package that wires every scope together with sensible defaults.",
    long: "Install just talak-web3 and you get a typed, tree-shakable façade over every scope package. Use it for fast prototyping, then swap in the individual @talak-web3/* scopes once you only need a subset.",
    exports: ["createTalak", "defineConfig", "version"] },

  { name: "@talak-web3/adapters", category: "Utils", icon: Plug,
    desc: "Drop-in adapters for popular runtimes, frameworks and storage backends.",
    long: "A curated set of adapters — Express, Fastify, Hono, Next.js, SvelteKit, Cloudflare Workers, Vercel Edge — that bridge talak-web3 primitives into the framework you already use without writing glue code.",
    exports: ["expressAdapter", "honoAdapter", "nextAdapter", "edgeAdapter"] },

  { name: "@talak-web3/ai", category: "AI", icon: Sparkles,
    desc: "Tool-calling agents, embeddings, and moderation primitives over chain state.",
    long: "Build provider-agnostic agents that read chain state, build transactions and stream output. Includes embedding helpers for pgvector, Pinecone and Qdrant plus pluggable moderation backends.",
    exports: ["createAgent", "embed", "retrieve", "moderate"] },

  { name: "@talak-web3/analytics", category: "Observability", icon: Activity,
    desc: "Lightweight client-side analytics with on-chain event capture.",
    long: "Tiny analytics client that captures wallet events, transaction lifecycle, and product analytics. Pluggable sinks for PostHog, Segment, Plausible, or your own pipeline.",
    exports: ["createAnalytics", "track", "identify", "page"] },

  { name: "@talak-web3/analytics-engine", category: "Observability", icon: Zap,
    desc: "Server-side analytics engine: ingestion, batching, exporters.",
    long: "The server-side counterpart to @talak-web3/analytics. Buffered ingestion, batched exports, sampling rules, and ready-made exporters for Clickhouse, BigQuery and S3.",
    exports: ["createEngine", "exporter", "sampler", "ingest"] },

  { name: "@talak-web3/auth", category: "Auth", icon: Shield,
    desc: "SIWE, JWT, sessions and CSRF — one cohesive auth surface.",
    long: "Production-grade auth with SIWE (EIP-4361) message validation, atomic nonce consumption, JWT rotation, cookie/session adapters and CSRF guards. Pluggable storage for Redis, Postgres, KV.",
    exports: ["siwe", "verifySiwe", "createSession", "csrf"] },

  { name: "@talak-web3/cli", category: "Utils", icon: Terminal,
    desc: "The talak CLI: init, doctor, upgrade, codegen, templates.",
    long: "A friendly CLI for scaffolding, checking, and upgrading talak-web3 projects. Run `talak init`, `talak doctor`, `talak upgrade` or `talak codegen` from any package manager.",
    exports: ["talak (binary)", "init", "doctor", "upgrade"] },

  { name: "@talak-web3/client", category: "RPC", icon: Network,
    desc: "Browser-friendly client with batching, caching, and retry built-in.",
    long: "A high-level client for the browser and edge runtimes. Wraps @talak-web3/rpc with smart batching, in-memory caching, automatic retries and a small footprint.",
    exports: ["createClient", "useClient", "ClientError"] },

  { name: "@talak-web3/config", category: "Utils", icon: Settings,
    desc: "Typed config schema, env validation, and runtime feature flags.",
    long: "Define your config once with a Zod-style schema, get typed env validation, runtime feature flags, and environment-aware overrides for dev / preview / production.",
    exports: ["defineConfig", "loadConfig", "envSchema", "flag"] },

  { name: "@talak-web3/core", category: "Core", icon: Layers,
    desc: "Shared primitives, error types, and the lazy plugin loader.",
    long: "The foundation everything else builds on. Provides createTalak(), typed error classes, environment detection and the lazy plugin loader used by every scope package.",
    exports: ["createTalak", "TalakError", "definePlugin", "version"] },

  { name: "@talak-web3/dashboard", category: "Observability", icon: Layout,
    desc: "Headless dashboard primitives — metrics, logs, traces.",
    long: "Headless React components and hooks for building admin dashboards: metric tiles, log viewers, trace timelines, and chart primitives. Bring your own styling.",
    exports: ["MetricTile", "LogViewer", "TraceTimeline", "useMetrics"] },

  { name: "@talak-web3/devtools", category: "Utils", icon: Wrench,
    desc: "Browser devtools panel for inspecting talak-web3 state at runtime.",
    long: "Embeddable devtools panel that surfaces RPC requests, sessions, cache hits, and plugin lifecycle. Toggle on with a single import in development.",
    exports: ["mountDevtools", "useDevtools", "DevtoolsPanel"] },

  { name: "@talak-web3/errors", category: "Utils", icon: AlertTriangle,
    desc: "Typed error hierarchy with structured codes and serialization.",
    long: "A small, exhaustive error hierarchy: TalakError, RpcError, AuthError, RateLimitError, NetworkError. Each error carries a structured code, retryability hint, and JSON-safe serialization.",
    exports: ["TalakError", "RpcError", "AuthError", "isRetryable"] },

  { name: "@talak-web3/handlers", category: "Networking", icon: PenTool,
    desc: "Composable request handlers for SIWE, RPC proxy, webhooks.",
    long: "Drop-in handlers for the common server endpoints you'd otherwise hand-roll: SIWE login/verify, RPC proxy with allow-listing, webhook receivers with signature verification.",
    exports: ["siweHandler", "rpcProxyHandler", "webhookHandler"] },

  { name: "@talak-web3/hooks", category: "Utils", icon: Code,
    desc: "Tiny React hooks for accounts, sessions, balances, and txs.",
    long: "A complete set of React hooks: useAccount, useSession, useBalance, useTx, useChain, useEnsName. Suspense-aware, SSR-safe, and ~3KB gzipped.",
    exports: ["useAccount", "useSession", "useBalance", "useTx"] },

  { name: "@talak-web3/identity", category: "Identity", icon: Hash,
    desc: "ENS, DID, and verifiable profiles in a single client.",
    long: "Resolve ENS names (with avatars and reverse lookups), did:talak DIDs, and verifiable profile schemas. Cached, batched, and chain-agnostic.",
    exports: ["resolveEns", "resolveDid", "createProfile", "verifyProfile"] },

  { name: "@talak-web3/middleware", category: "Networking", icon: Workflow,
    desc: "Request middleware: auth, logging, tracing, rate-limit guards.",
    long: "A composable middleware pipeline for any node/edge handler. Stack auth checks, structured logging, OTel tracing and rate-limit guards in one fluent chain.",
    exports: ["middleware", "withAuth", "withTrace", "withRateLimit"] },

  { name: "@talak-web3/orgs", category: "Identity", icon: Building2,
    desc: "Multi-tenant orgs, members, roles, and invitations.",
    long: "First-class multi-tenancy: organizations, members, role-based access control, invite flows, and org-scoped API keys. Drop-in with @talak-web3/auth.",
    exports: ["createOrg", "addMember", "Role", "inviteMember"] },

  { name: "@talak-web3/plugins", category: "Utils", icon: Plug,
    desc: "Official plugin registry: chains, wallets, storage, AI providers.",
    long: "A curated registry of officially-maintained plugins — additional chains, wallet connectors, storage backends, AI providers — installable via the lazy plugin loader in @talak-web3/core.",
    exports: ["registerPlugin", "loadPlugin", "officialPlugins"] },

  { name: "@talak-web3/rate-limit", category: "Networking", icon: Gauge,
    desc: "Token-bucket and sliding-window rate limits with adapters.",
    long: "Per-IP, per-API-key, and per-method rate limiting using token-bucket and sliding-window algorithms. Storage adapters for Redis, Cloudflare KV, Upstash, and in-memory.",
    exports: ["rateLimit", "tokenBucket", "slidingWindow"] },

  { name: "@talak-web3/realtime", category: "Networking", icon: Send,
    desc: "Resilient WebSocket transport for events, presence, pub/sub.",
    long: "Reconnecting WebSocket client with exponential backoff, heartbeats, message-replay buffer, and a small pub/sub layer for presence and live event streams.",
    exports: ["createRealtime", "subscribe", "presence", "publish"] },

  { name: "@talak-web3/rpc", category: "RPC", icon: Server,
    desc: "Multi-provider EVM RPC with failover, batching, and caching.",
    long: "Type-safe JSON-RPC client with weighted multi-provider routing, automatic batching, LRU + block-aware caching, and circuit breakers. viem-compatible.",
    exports: ["createRpc", "failover", "batch", "cache"] },

  { name: "@talak-web3/templates", category: "Utils", icon: FileCode,
    desc: "Production-ready starter templates for common app shapes.",
    long: "Curated starter templates — Next.js + auth + RPC, SvelteKit + wallets, Hono + edge, agent backend — that you scaffold with `talak init <template>`.",
    exports: ["templates", "create", "list"] },

  { name: "@talak-web3/test-utils", category: "Utils", icon: Beaker,
    desc: "Mocks, fixtures, and a local test chain harness.",
    long: "Mocks for every scope, deterministic fixtures, signed message generators, and a local test-chain harness that speaks to anvil / hardhat. First-class for vitest and playwright.",
    exports: ["mockTalak", "fixtures", "anvilHarness"] },

  { name: "@talak-web3/tx", category: "Wallet", icon: Wallet,
    desc: "Build, sign, simulate, and submit transactions safely.",
    long: "End-to-end transaction lifecycle: build calldata, simulate with state overrides, estimate gas, sign with any wallet adapter, and submit with retry. Includes EIP-4337 user-op helpers.",
    exports: ["buildTx", "simulate", "send", "userOp"] },

  { name: "@talak-web3/types", category: "Utils", icon: ListTree,
    desc: "Shared TypeScript types and JSON-Schema definitions.",
    long: "All shared types in one zero-runtime package: Address, Chain, Hex, Hash, JsonRpcRequest, plus JSON-Schema exports for codegen.",
    exports: ["Address", "Chain", "Hex", "JsonRpcRequest"] },

  { name: "@talak-web3/utils", category: "Utils", icon: Package,
    desc: "Hashing, formatters, address helpers and EIP-712 utilities.",
    long: "Tiny, audited utilities: keccak, secp256k1 verify, EIP-712 typed-data hashing, big-number formatters, address shorteners, locale-aware date helpers.",
    exports: ["keccak", "verifySig", "typedData", "formatUnits"] },
];

const SOURCE_PATH: Record<string, string> = {
  "talak-web3":                   "packages/talak-web3",
  "@talak-web3/adapters":         "packages/talak-web3-adapters",
  "@talak-web3/ai":               "packages/talak-web3-ai",
  "@talak-web3/analytics":        "packages/@talak-web3/analytics",
  "@talak-web3/analytics-engine": "packages/talak-web3-analytics",
  "@talak-web3/auth":             "packages/talak-web3-auth",
  "@talak-web3/cli":              "packages/@talak-web3/cli",
  "@talak-web3/client":           "packages/talak-web3-client",
  "@talak-web3/config":           "packages/talak-web3-config",
  "@talak-web3/core":             "packages/talak-web3-core",
  "@talak-web3/dashboard":        "packages/@talak-web3/dashboard",
  "@talak-web3/devtools":         "packages/@talak-web3/devtools",
  "@talak-web3/errors":           "packages/talak-web3-errors",
  "@talak-web3/handlers":         "packages/talak-web3-handlers",
  "@talak-web3/hooks":            "packages/talak-web3-hooks",
  "@talak-web3/identity":         "packages/talak-web3-identity",
  "@talak-web3/middleware":       "packages/talak-web3-middleware",
  "@talak-web3/orgs":             "packages/talak-web3-orgs",
  "@talak-web3/plugins":          "packages/talak-web3-plugins",
  "@talak-web3/rate-limit":       "packages/talak-web3-rate-limit",
  "@talak-web3/realtime":         "packages/talak-web3-realtime",
  "@talak-web3/rpc":              "packages/talak-web3-rpc",
  "@talak-web3/templates":        "packages/@talak-web3/templates",
  "@talak-web3/test-utils":       "packages/talak-web3-test-utils",
  "@talak-web3/tx":               "packages/talak-web3-tx",
  "@talak-web3/types":            "packages/talak-web3-types",
  "@talak-web3/utils":            "packages/talak-web3-utils",
};

export const PACKAGES: Pkg[] = RAW.map(p => ({
  ...p,
  slug: slugFromName(p.name),
  github: GH + (SOURCE_PATH[p.name] ?? `packages/${slugFromName(p.name)}`),
  npm: NPM + p.name,
}));

export const CATEGORIES = [
  "All",
  "Core",
  "Auth",
  "RPC",
  "Wallet",
  "Identity",
  "AI",
  "Observability",
  "Networking",
  "Utils",
] as const;

export type CategoryFilter = (typeof CATEGORIES)[number];

export type CategoryAccent = {
  /** raw hex used in inline styles — picked from a muted, GitHub-dark inspired palette */
  hex: string;
  /** short label used in aria/title text */
  label: string;
};

/** Muted, near-monochrome palette — picked for legibility against the dark
 *  GitHub-inspired surface. Categories stay subtly distinct without
 *  competing with the page content. */
export const CATEGORY_META: Record<PkgCategory, { icon: LucideIcon; accent: CategoryAccent }> = {
  Core:          { icon: Box,        accent: { hex: "#c9ced6", label: "stone"  } },
  Auth:          { icon: Shield,     accent: { hex: "#a8b0bc", label: "graphite" } },
  RPC:           { icon: Network,    accent: { hex: "#9aa3af", label: "ash"    } },
  Wallet:        { icon: Wallet,     accent: { hex: "#b3a98e", label: "sand"   } },
  Identity:      { icon: Hash,       accent: { hex: "#a8a3b6", label: "smoke"  } },
  AI:            { icon: Sparkles,   accent: { hex: "#b89eaf", label: "mauve"  } },
  Observability: { icon: Activity,   accent: { hex: "#a89e9a", label: "stone"  } },
  Networking:    { icon: Globe,      accent: { hex: "#94a4b8", label: "steel"  } },
  Utils:         { icon: Package,    accent: { hex: "#9aa0aa", label: "slate"  } },
};

export function getPackageBySlug(slug: string) {
  return PACKAGES.find(p => p.slug === slug);
}
