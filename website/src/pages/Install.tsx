import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/CodeBlock";
import { TerminalInstall } from "@/components/TerminalInstall";
import { FRAMEWORK_LOGOS } from "@/components/BrandLogos";
import { WALLET_LOGOS } from "@/components/WalletLogos";
import {
  Download, Rocket, Wrench, Shield, Layers, ArrowRight,
  Terminal as TerminalIcon, Zap, KeyRound, Server, Plug, GitBranch,
} from "lucide-react";

type FrameworkKey = "react" | "nextjs" | "vue" | "svelte" | "vanilla" | "node";

const FRAMEWORK_TABS: { key: FrameworkKey; label: string; logoName: string }[] = [
  { key: "react",   label: "React",      logoName: "React"      },
  { key: "nextjs",  label: "Next.js",    logoName: "Next.js"    },
  { key: "vue",     label: "Vue",        logoName: "Vue"        },
  { key: "svelte",  label: "Svelte",     logoName: "Svelte"     },
  { key: "vanilla", label: "Vanilla TS", logoName: "TypeScript" },
  { key: "node",    label: "Node.js",    logoName: "Node.js"    },
];

const SETUP_CODE: Record<FrameworkKey, { filename: string; code: string }> = {
  react: {
    filename: "src/lib/talak.ts",
    code: `import { createTalak } from "talak-web3";
import { siwe }       from "@talak-web3/auth";
import { failover }   from "@talak-web3/rpc";

export const talak = createTalak({
  apiKey: import.meta.env.VITE_TALAK_KEY!,
  auth: siwe({ domain: window.location.host }),
  rpc: failover({
    providers: [
      "https://eth.llamarpc.com",
      "https://rpc.ankr.com/eth",
    ],
  }),
});

// In your component
import { talak } from "./lib/talak";

const session = await talak.auth.signIn();
const block   = await talak.rpc.getBlockNumber();`,
  },
  nextjs: {
    filename: "lib/talak.ts",
    code: `import { createTalak } from "talak-web3";
import { siwe }       from "@talak-web3/auth";

export const talak = createTalak({
  apiKey: process.env.NEXT_PUBLIC_TALAK_KEY!,
  auth: siwe({ domain: process.env.NEXT_PUBLIC_DOMAIN! }),
});

// app/api/auth/route.ts
import { talak } from "@/lib/talak";
export const POST = talak.auth.handler();`,
  },
  vue: {
    filename: "src/talak.ts",
    code: `import { createTalak } from "talak-web3";
import { siwe }       from "@talak-web3/auth";
import { createApp }  from "vue";
import App            from "./App.vue";

const talak = createTalak({
  apiKey: import.meta.env.VITE_TALAK_KEY!,
  auth: siwe({ domain: window.location.host }),
});

createApp(App).provide("talak", talak).mount("#app");`,
  },
  svelte: {
    filename: "src/lib/talak.ts",
    code: `import { createTalak } from "talak-web3";
import { siwe }       from "@talak-web3/auth";
import { writable }   from "svelte/store";

export const talak = createTalak({
  apiKey: import.meta.env.VITE_TALAK_KEY!,
  auth: siwe({ domain: window.location.host }),
});

export const session = writable<Awaited<ReturnType<typeof talak.auth.signIn>> | null>(null);`,
  },
  vanilla: {
    filename: "src/talak.ts",
    code: `import { createTalak } from "talak-web3";
import { siwe }       from "@talak-web3/auth";

const talak = createTalak({
  apiKey: import.meta.env.VITE_TALAK_KEY!,
  auth: siwe({ domain: window.location.host }),
});

document.querySelector("#connect")?.addEventListener("click", async () => {
  const session = await talak.auth.signIn();
  console.log("signed in", session.address);
});`,
  },
  node: {
    filename: "src/server.ts",
    code: `import { createTalak } from "talak-web3";
import { siwe, verify } from "@talak-web3/auth";
import express          from "express";

const app = express();
app.use(express.json());

const talak = createTalak({
  apiKey: process.env.TALAK_KEY!,
});

app.post("/api/verify", async (req, res) => {
  const ok = await verify(req.body.message, req.body.signature);
  res.json({ ok });
});

app.listen(3000);`,
  },
};

const ENV_CODE = `# .env.local
TALAK_KEY=tk_live_xxxxxxxxxxxxxxxxxxxxxxxx     # from /keys
TALAK_DEFAULT_CHAIN="mainnet"

# Optional — bring your own RPC providers
RPC_PRIMARY="https://eth.llamarpc.com"
RPC_FALLBACK="https://rpc.ankr.com/eth"`;

const VERIFY_CODE = `npx talak doctor

✓  talak-web3@latest installed
✓  TALAK_KEY recognised
✓  RPC reachable     (eth.llamarpc.com)         210 ms
✓  Wallet provider   (window.ethereum)          present
✓  Chain reachable   (Ethereum mainnet, 19283492)
✓  All systems go.`;

const STEPS = [
  {
    Icon: Download,
    title: "1. Install the SDK",
    body: "Add the talak-web3 package with your favourite package manager. The SDK is zero-config — no build step, no peer-dep gymnastics.",
  },
  {
    Icon: KeyRound,
    title: "2. Grab an API key",
    body: "Head to the dashboard → API keys, and create a new key for this project. Keys are scoped per environment (dev / staging / prod).",
  },
  {
    Icon: Wrench,
    title: "3. Configure your client",
    body: "Pick the framework recipe below, drop the snippet into your project, and you're connected to wallets, RPC, and analytics.",
  },
  {
    Icon: Rocket,
    title: "4. Ship it",
    body: "Push to production. talak-web3 streams events to your dashboard in real time — no extra wiring required.",
  },
];

export default function Install() {
  const [framework, setFramework] = useState<FrameworkKey>("react");
  const example = SETUP_CODE[framework];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNav />

      <main className="flex-1 mx-auto w-full max-w-[1200px] px-6 py-12 space-y-16">
        {/* Hero */}
        <header className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 items-end border-b border-border pb-10">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-mono text-muted-foreground mb-3">
              <TerminalIcon className="h-3.5 w-3.5" /> Install · v0.x
            </p>
            <h1 className="text-[clamp(2rem,4.4vw,3.4rem)] font-[500] tracking-[-0.03em] leading-[1.05]">
              From zero to <span className="font-mono text-[0.85em]">signIn()</span><br />in under five minutes.
            </h1>
            <p className="mt-5 text-[15px] text-muted-foreground max-w-[620px] leading-[1.7]">
              talak-web3 is a single SDK for Sign-in with Ethereum, RPC failover, transactions,
              identity, and analytics. Pick a package manager below — everything else is one
              snippet.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#quickstart"
                className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] bg-foreground text-background hover:bg-foreground/90 rounded-sm transition-colors"
              >
                <Zap className="h-3.5 w-3.5" /> Quickstart
              </a>
              <Link
                to="/docs"
                className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] border border-border text-foreground hover:border-foreground/50 rounded-sm transition-colors"
              >
                Read the docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Spec card */}
          <div className="rounded-md border border-border p-5 space-y-3 bg-card/40">
            <p className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
              At a glance
            </p>
            <ul className="space-y-2.5 text-[12.5px]">
              {[
                ["Bundle size",  "~14 KB gzipped"],
                ["Runtime",      "Node 18+, browsers, Bun, Deno"],
                ["Languages",    "TypeScript, JavaScript"],
                ["Frameworks",   "React, Next.js, Vue, Svelte, vanilla"],
                ["License",      "MIT (client SDK)"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono text-[12px]">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        {/* Steps */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
          {STEPS.map(({ Icon, title, body }) => (
            <div key={title} className="bg-background p-5">
              <Icon className="h-4 w-4 text-foreground/55 mb-3" />
              <h3 className="text-[13.5px] font-medium tracking-[-0.01em]">{title}</h3>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-[1.65]">{body}</p>
            </div>
          ))}
        </section>

        {/* Quickstart */}
        <section id="quickstart" className="space-y-5">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-[22px] font-[500] tracking-[-0.02em]">Quickstart</h2>
            <p className="text-[12.5px] text-muted-foreground">Pick a package manager — same install for every framework.</p>
          </div>
          <TerminalInstall />
        </section>

        {/* Env */}
        <section className="space-y-4">
          <h2 className="text-[22px] font-[500] tracking-[-0.02em]">Set environment variables</h2>
          <p className="text-[13.5px] text-muted-foreground leading-[1.7] max-w-[680px]">
            Create your API key in the{" "}
            <Link to="/keys" className="underline underline-offset-2 hover:text-foreground">
              dashboard
            </Link>{" "}
            and drop it into a local <code className="font-mono">.env</code>. The SDK reads
            it at startup — never bake keys into source.
          </p>
          <CodeBlock filename=".env.local" code={ENV_CODE} />
        </section>

        {/* Framework picker */}
        <section className="space-y-5">
          <div>
            <h2 className="text-[22px] font-[500] tracking-[-0.02em]">Wire up your framework</h2>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-[1.7] max-w-[680px]">
              Drop the snippet for your stack. Every recipe gets you a typed client + a
              one-call sign-in flow.
            </p>
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <div className="flex flex-wrap border-b border-border bg-muted/20">
              {FRAMEWORK_TABS.map(tab => {
                const Logo = FRAMEWORK_LOGOS.find(l => l.name === tab.logoName)?.Logo;
                const active = framework === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFramework(tab.key)}
                    className={
                      "inline-flex items-center gap-2 px-4 h-10 text-[12.5px] border-r border-border transition-colors " +
                      (active
                        ? "bg-background text-foreground border-b-2 border-b-foreground -mb-px"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50")
                    }
                  >
                    {Logo && <Logo className="h-4 w-4" />}
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="p-4 sm:p-5 bg-background">
              <CodeBlock filename={example.filename} code={example.code} />
            </div>
          </div>
        </section>

        {/* Verify */}
        <section className="space-y-4">
          <h2 className="text-[22px] font-[500] tracking-[-0.02em]">Verify your setup</h2>
          <p className="text-[13.5px] text-muted-foreground leading-[1.7] max-w-[680px]">
            Run the doctor command — it pings your RPC, validates your key, and confirms
            wallet plumbing is live.
          </p>
          <CodeBlock filename="terminal" code={VERIFY_CODE} />
        </section>

        {/* Wallets + chains compatibility strip */}
        <section className="space-y-5">
          <h2 className="text-[22px] font-[500] tracking-[-0.02em]">Works with what you already use</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
            <div className="bg-background p-6">
              <p className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-4">Wallets</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {WALLET_LOGOS.map(w => (
                  <a
                    key={w.name}
                    href={w.href}
                    target="_blank"
                    rel="noreferrer"
                    title={w.name}
                    className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <w.Logo className="h-7 w-7" />
                    <span>{w.name}</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-background p-6">
              <p className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-4">Frameworks &amp; runtimes</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {FRAMEWORK_LOGOS.map(f => (
                  <a
                    key={f.name}
                    href={f.href}
                    target="_blank"
                    rel="noreferrer"
                    title={f.name}
                    className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <f.Logo className="h-7 w-7" />
                    <span>{f.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Next */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
          {[
            { Icon: Shield, title: "Secure your app", body: "Best-practice key rotation, scoped tokens, audit trail.", to: "/docs#auth" },
            { Icon: Server, title: "Add webhooks",    body: "Stream on-chain + auth events into your own backend.",  to: "/webhooks" },
            { Icon: Layers, title: "Browse packages", body: "Each scope (auth, rpc, tx, ai…) ships independently.",   to: "/packages" },
            { Icon: Plug,   title: "Add integrations",body: "Stripe, Slack, Sentry, GitHub, Discord — one click.",    to: "/integrations" },
            { Icon: GitBranch, title: "Read the changelog", body: "Every release noted. Semver respected.",           to: "/changelog" },
            { Icon: Rocket, title: "Talk to a human",  body: "Stuck? Drop us a line and we'll pair on it.",           to: "/about" },
          ].map(({ Icon, title, body, to }) => (
            <Link
              key={title}
              to={to}
              className="bg-background p-5 hover:bg-muted/30 transition-colors group"
            >
              <Icon className="h-4 w-4 text-foreground/55 mb-3" />
              <h3 className="text-[13.5px] font-medium tracking-[-0.01em] flex items-center justify-between">
                {title}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-[1.65]">{body}</p>
            </Link>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
