import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Boxes,
  Sparkles,
  Layers as LayersIcon,
} from "lucide-react";

import { PACKAGES, CATEGORY_META, type PkgCategory } from "@/data/packages";
import { TerminalInstall } from "./TerminalInstall";
import { CodeBlock } from "./CodeBlock";
import { FRAMEWORK_LOGOS } from "./BrandLogos";
import { PackageLinks } from "./PackageLinks";
import { useNpmStats, formatDownloads } from "@/hooks/useNpmStats";
import { WALLET_LOGOS } from "./WalletLogos";
import { CHAINS } from "@/data/chains";

const QUICK_START_CODE = `import { createTalak } from "talak-web3";
import { siwe }     from "@talak-web3/auth";
import { failover } from "@talak-web3/rpc";

const talak = createTalak({
  auth: siwe({ domain: "talak.dev" }),
  rpc:  failover({
    providers: [
      "https://eth.llamarpc.com",
      "https://rpc.ankr.com/eth",
    ],
  }),
});

const session = await talak.auth.signIn();
const block   = await talak.rpc.getBlockNumber();
`;

const CONFIG_CODE = `import { defineConfig } from "talak-web3";

export default defineConfig({
  apiKey: process.env.TALAK_KEY,
  chains: ["mainnet", "base", "arbitrum"],
  scopes: {
    auth: { siwe: true, jwt: { ttl: "15m" } },
    rpc:  { failover: true, cache: "block" },
    ai:   { provider: "openai" },
    realtime: { transport: "ws" },
    observability: { otel: true },
  },
});
`;

const ENV_CODE = `# talak-web3
TALAK_KEY=
TALAK_DEFAULT_CHAIN="mainnet"

# RPC providers
RPC_PRIMARY="https://eth.llamarpc.com"
RPC_FALLBACK="https://rpc.ankr.com/eth"
`;

const TEASER_PACKAGES = [
  "talak-web3",
  "@talak-web3/core",
  "@talak-web3/auth",
  "@talak-web3/rpc",
  "@talak-web3/tx",
  "@talak-web3/identity",
  "@talak-web3/ai",
  "@talak-web3/realtime",
];

function LiveStat({ pkg, label }: { pkg: string; label: string }) {
  const stats = useNpmStats(pkg);
  return (
    <div className="p-7 border-r border-b border-border last:border-r-0 max-md:[&:nth-child(2n)]:border-r-0 md:[&:nth-child(4n)]:border-r-0 max-md:[&:nth-child(n+3)]:border-b-0 md:border-b-0">
      <div className="text-[clamp(1.6rem,2.4vw,2.4rem)] font-[500] tracking-[-0.03em] text-foreground font-mono">
        {stats.loading ? "…" : label}
      </div>
    </div>
  );
}

export function InstallSections() {
  const teaser = TEASER_PACKAGES
    .map(name => PACKAGES.find(p => p.name === name))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const meta = useNpmStats("talak-web3");

  return (
    <>
      {/* INSTALL — terminal */}
      <div className="relative z-10 w-full border-t border-border" />
      <section id="install" className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
            install in 30 seconds
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[640px] leading-[1.15]">
            One package.<br />
            Any package manager.
          </h2>
          <p className="mt-5 text-[14px] text-foreground/60 max-w-[520px] leading-relaxed">
            Pick your favorite — npm, pnpm, yarn, or bun. The same SDK, same APIs, same bundle size everywhere.
          </p>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-8 items-start">
            <TerminalInstall />

            <div className="border border-border bg-card/30 p-6">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 className="h-4 w-4 text-foreground/70" />
                <h3 className="text-[14px] font-medium text-foreground">Requirements</h3>
              </div>
              <ul className="space-y-3 text-[13px]">
                {[
                  ["Node.js",    "≥ 18.17 (LTS)"],
                  ["TypeScript", "≥ 5.0 (encouraged)"],
                  ["Bundler",    "Vite, Webpack, esbuild, Rollup"],
                  ["Runtime",    "Browser, Node, Edge"],
                  ["License",    "MIT — free for commercial"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-baseline justify-between gap-4 pb-3 border-b border-border last:border-0 last:pb-0">
                    <span className="font-medium text-foreground">{k}</span>
                    <span className="text-foreground/65 text-right">{v}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-3 border border-border bg-card/40 text-[12px] text-foreground/65 leading-relaxed">
                Tree-shakable by default — every scope ships ESM with{" "}
                <span className="text-foreground font-mono">sideEffects:&nbsp;false</span>.
                Most apps land under <span className="text-foreground font-mono">35&nbsp;KB</span> gzipped.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK START SNIPPET */}
      <div className="relative z-10 w-full border-t border-border" />
      <section id="quickstart" className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
            from install to first request
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[640px] leading-[1.15]">
            Wire SIWE auth + RPC failover<br />in 12 lines.
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-0 border border-border">
            {[
              { step: "01", title: "Install",   body: "Add the SDK and the scopes you need.",   code: "pnpm add talak-web3" },
              { step: "02", title: "Configure", body: "Point at your RPCs and signing keys.",   code: "talak.init({ apiKey, chains })" },
              { step: "03", title: "Ship",      body: "Use typed clients in your app and server.", code: "await talak.auth.siwe.verify(msg)" },
            ].map((s, i) => (
              <div
                key={s.step}
                className={`p-7 ${i < 2 ? "md:border-r border-border" : ""} ${i > 0 ? "border-t md:border-t-0 border-border" : ""}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-mono tracking-[0.1em] text-foreground/70">{s.step}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <h3 className="text-[15px] font-medium text-foreground mb-2">{s.title}</h3>
                <p className="text-[13px] leading-[1.6] text-foreground/60 mb-4">{s.body}</p>
                <div className="font-mono text-[11.5px] text-foreground/85 px-3 py-2 border border-border bg-card/60 truncate">
                  {s.code}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <CodeBlock filename="app.ts" language="ts" code={QUICK_START_CODE} />
          </div>
        </div>
      </section>

      {/* PACKAGES — neutral teaser */}
      <div className="relative z-10 w-full border-t border-border" />
      <section id="packages" className="relative z-10 pt-24 pb-24 px-6">
        <div className="mx-auto max-w-[1200px] relative">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
            <div>
              <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
                {PACKAGES.length} scope packages
              </p>
              <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[640px] leading-[1.15]">
                The whole suite,<br />nothing you don't need.
              </h2>
              <p className="mt-5 text-[14px] text-foreground/60 max-w-[520px] leading-relaxed">
                A handful of the most popular scopes below. The full catalog lives on a dedicated page with searchable docs for every package.
              </p>
            </div>
            <Link
              to="/packages"
              className="group inline-flex items-center gap-2 px-5 py-2.5 border border-foreground/30 text-[13px] font-medium hover:bg-foreground hover:text-background transition-all"
            >
              <Boxes className="h-4 w-4" />
              View all {PACKAGES.length} packages
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {teaser.map(p => {
              const Icon = p.icon;
              const accent = CATEGORY_META[p.category].accent.hex;
              const [pre, suf] = p.name.startsWith("@talak-web3/")
                ? ["@talak-web3/", p.name.slice("@talak-web3/".length)]
                : ["", p.name];
              return (
                <div
                  key={p.slug}
                  className="group relative border border-border bg-card/30 p-5 transition-all hover:bg-card/60 hover:-translate-y-0.5 border-l-2"
                  style={{ borderLeftColor: `${accent}55` }}
                >
                  <Link to={`/packages/${p.slug}`} className="absolute inset-0 z-0" aria-label={`View ${p.name}`} />
                  <div className="relative z-[1]">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div
                        className="h-9 w-9 rounded border flex items-center justify-center"
                        style={{ borderColor: `${accent}33`, backgroundColor: `${accent}12`, color: accent }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className="text-[10px] font-mono uppercase tracking-[0.12em]"
                        style={{ color: accent }}
                      >
                        {p.category}
                      </span>
                    </div>
                    <h3 className="text-[12.5px] font-mono font-medium text-foreground mb-1.5 break-all">
                      <span className="text-foreground/55">{pre}</span>{suf}
                    </h3>
                    <p className="text-[11.5px] leading-[1.5] text-foreground/55 line-clamp-2 mb-3 min-h-[2.4em]">
                      {p.desc}
                    </p>
                    <div className="flex items-center justify-between gap-2 text-[10.5px] text-foreground/50 font-mono">
                      <span className="flex items-center gap-1">
                        <LayersIcon className="h-2.5 w-2.5" />
                        details
                      </span>
                      <PackageLinks github={p.github} npm={p.npm} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] uppercase tracking-[0.12em] text-foreground/40 font-mono mr-1">
              Browse by scope:
            </span>
            {(Object.keys(CATEGORY_META) as PkgCategory[]).map(cat => {
              const count = PACKAGES.filter(p => p.category === cat).length;
              if (count === 0) return null;
              const accent = CATEGORY_META[cat].accent.hex;
              return (
                <Link
                  key={cat}
                  to="/packages"
                  className="group inline-flex items-center gap-2 h-8 px-3 text-[11.5px] font-mono border bg-card/30 transition-all hover:-translate-y-0.5"
                  style={{ borderColor: `${accent}40`, color: accent }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = `${accent}14`;
                    e.currentTarget.style.borderColor = accent;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "";
                    e.currentTarget.style.borderColor = `${accent}40`;
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  {cat}
                  <span style={{ color: `${accent}99` }}>{count}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONFIG / RUNTIME EXAMPLE */}
      <div className="relative z-10 w-full border-t border-border" />
      <section className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
            configuration
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[640px] leading-[1.15]">
            One config object.<br />
            Every scope wired up.
          </h2>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CodeBlock filename="talak.config.ts" language="ts" code={CONFIG_CODE} />
            <CodeBlock filename=".env" language="env" code={ENV_CODE} showLineNumbers={false} />
          </div>
        </div>
      </section>

      {/* WALLETS + CHAINS — neutral grid */}
      <div className="relative z-10 w-full border-t border-border" />
      <section id="wallets" className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
            <span className="text-foreground/65">⌥</span> wallets &amp; chains
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[700px] leading-[1.15]">
            Every major wallet,<br />every EVM chain.
          </h2>
          <p className="mt-5 text-[14px] text-foreground/60 max-w-[560px] leading-relaxed">
            SIWE auth and RPC failover work out of the box with the wallets your users already have, on the chains your users already trust.
          </p>

          {/* Wallets row */}
          <div className="mt-12">
            <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-mono mb-3">
              Browser &amp; mobile wallets
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 border border-border">
              {WALLET_LOGOS.map(w => (
                <a
                  key={w.name}
                  href={w.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group p-5 flex flex-col items-center justify-center gap-2.5 border-b border-r border-border last:border-r-0 transition-all hover:bg-card/60"
                >
                  <div className="h-9 w-9 flex items-center justify-center transition-transform group-hover:scale-110">
                    <w.Logo className="h-9 w-9" />
                  </div>
                  <span className="text-[12px] text-foreground/85 font-medium">{w.name}</span>
                  <span className="text-[9.5px] text-foreground/40 font-mono uppercase tracking-[0.14em]">
                    {w.connector}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Chains row */}
          <div className="mt-10">
            <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-mono mb-3">
              Supported EVM chains <span className="text-foreground/30">· {CHAINS.filter(c => !c.testnet).length} mainnet · {CHAINS.filter(c => c.testnet).length} testnet</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CHAINS.map(c => (
                <a
                  key={c.id}
                  href={c.explorer}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 h-8 px-3 text-[11.5px] font-mono border bg-card/30 text-foreground/85 hover:bg-card/60 transition-all hover:-translate-y-0.5"
                  style={{ borderColor: `${c.accent}44` }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: c.accent }}
                  />
                  {c.name}
                  <span className="text-foreground/40">·</span>
                  <span className="text-foreground/55">id&nbsp;{c.id}</span>
                  {c.testnet && <span className="text-foreground/40 ml-0.5">testnet</span>}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FRAMEWORK + LANGUAGE INTEGRATIONS */}
      <div className="relative z-10 w-full border-t border-border" />
      <section className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
            works with what you already use
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[640px] leading-[1.15]">
            First-class integrations,<br />
            zero adapters required.
          </h2>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 border border-border">
            {FRAMEWORK_LOGOS.map((f) => (
              <a
                key={f.name}
                href={f.href}
                target="_blank"
                rel="noreferrer"
                className="group p-6 flex flex-col items-center justify-center gap-3 border-b border-r border-border last:border-r-0 transition-all hover:bg-card/60"
              >
                <div className="h-10 w-10 flex items-center justify-center transition-transform group-hover:scale-110">
                  <f.Logo className="h-9 w-9" />
                </div>
                <span className="text-[12.5px] text-foreground/85 font-medium">{f.name}</span>
                <span className="text-[10px] text-foreground/40 font-mono uppercase tracking-[0.14em]">official</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <div className="relative z-10 w-full border-t border-border" />
      <section className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
            one SDK vs. five
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[640px] leading-[1.15]">
            Less stack to maintain.<br />More time shipping.
          </h2>

          <div className="mt-12 border border-border overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-card/40">
                  <th className="text-left px-5 py-4 font-medium text-foreground/70 text-[12px] uppercase tracking-[0.08em]">
                    Capability
                  </th>
                  <th className="text-left px-5 py-4 font-medium text-foreground/70 text-[12px] uppercase tracking-[0.08em]">
                    Without talak-web3
                  </th>
                  <th className="text-left px-5 py-4 font-medium text-foreground text-[12px] uppercase tracking-[0.08em]">
                    With talak-web3
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["SIWE auth",         "siwe + iron-session + custom routes",     "@talak-web3/auth"],
                  ["RPC failover",      "viem + custom retry + queue",             "@talak-web3/rpc"],
                  ["Transactions",      "ethers + custom simulation + retries",    "@talak-web3/tx"],
                  ["ENS / Identity",    "ethers + ENS package + cache layer",      "@talak-web3/identity"],
                  ["Realtime / WS",     "reconnecting-ws + custom heartbeat",      "@talak-web3/realtime"],
                  ["Observability",     "otel SDK + custom exporter",              "@talak-web3/analytics-engine"],
                  ["AI agents on-chain","langchain + custom tools",                "@talak-web3/ai"],
                ].map(([cap, before, after], i) => (
                  <tr key={cap} className={i < 6 ? "border-b border-border" : ""}>
                    <td className="px-5 py-4 text-foreground font-medium">{cap}</td>
                    <td className="px-5 py-4 text-foreground/55 font-mono text-[12px]">
                      <span className="text-foreground/40 mr-1">✗</span>
                      {before}
                    </td>
                    <td className="px-5 py-4 font-mono text-[12px]">
                      <span className="text-foreground mr-1">✓</span>
                      <span className="text-foreground">{after as string}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* USAGE STATS — live from npm */}
      <div className="relative z-10 w-full border-t border-border" />
      <section className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
            by the numbers
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[640px] leading-[1.15]">
            Live from npm.<br />Refreshed every page load.
          </h2>
          <p className="mt-4 text-[12.5px] text-foreground/50 font-mono">
            source · <a className="hover:text-foreground transition-colors underline-offset-4 hover:underline" href="https://www.npmjs.com/package/talak-web3" target="_blank" rel="noreferrer">npmjs.com/package/talak-web3</a>
          </p>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 border border-border">
            <Stat label={`${PACKAGES.length}`} sub="Scope packages" />
            <Stat
              label={meta.version ? `v${meta.version}` : meta.loading ? "…" : "—"}
              sub="talak-web3 latest"
            />
            <Stat
              label={meta.monthlyDownloads !== null ? `${formatDownloads(meta.monthlyDownloads)}` : meta.loading ? "…" : "—"}
              sub="downloads / month"
            />
            <Stat
              label={meta.license ?? (meta.loading ? "…" : "MIT")}
              sub="license"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <div className="relative z-10 w-full border-t border-border" />
      <section id="faq" className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] font-mono text-foreground/55 mb-4">
            faq
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[640px] leading-[1.15]">
            Common questions<br />from teams installing today.
          </h2>

          <div className="mt-12 border border-border">
            {[
              {
                q: "Do I need every scope package?",
                a: "No. Each @talak-web3/* scope is published independently and tree-shakable. Most apps install talak-web3 (the meta package) plus the two or three scopes they actually use.",
              },
              {
                q: "Does talak-web3 lock me into a specific chain?",
                a: "No. The RPC and identity packages are chain-agnostic. EVM is supported out of the box; non-EVM chains have community adapters in the @talak-web3/adapters family.",
              },
              {
                q: "What runtimes are supported?",
                a: "Browser, Node 18+, Bun, Deno, and edge runtimes (Cloudflare Workers, Vercel Edge, Netlify). Every package ships ESM with conditional exports.",
              },
              {
                q: "How big is the bundle?",
                a: "Importing the meta package and using @talak-web3/auth + @talak-web3/rpc lands around 32 KB gzipped. Each additional scope adds 5–25 KB depending on what you call.",
              },
              {
                q: "How is upgrading handled across packages?",
                a: "Every scope follows the same major version. Run `npx talak upgrade` (from @talak-web3/cli) to bump every @talak-web3/* package in your project together with a changelog summary.",
              },
            ].map((item, i, arr) => (
              <details key={item.q} className={`group ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none hover:bg-card/40 transition-colors">
                  <span className="text-[14px] text-foreground font-medium flex items-center gap-3">
                    <Sparkles className="h-3.5 w-3.5 text-foreground/70" />
                    {item.q}
                  </span>
                  <span className="text-foreground/50 text-[18px] leading-none transition-transform group-open:rotate-45 select-none">+</span>
                </summary>
                <div className="px-6 pb-5 pl-[44px] text-[13px] leading-[1.7] text-foreground/65 max-w-[820px]">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="p-7 border-r border-b border-border last:border-r-0 max-md:[&:nth-child(2n)]:border-r-0 md:[&:nth-child(4n)]:border-r-0 max-md:[&:nth-child(n+3)]:border-b-0 md:border-b-0">
      <div className="text-[clamp(1.6rem,2.4vw,2.4rem)] font-[500] tracking-[-0.03em] text-foreground font-mono">
        {label}
      </div>
      <div className="text-[12.5px] text-foreground/55 mt-1">{sub}</div>
    </div>
  );
}

export default InstallSections;
