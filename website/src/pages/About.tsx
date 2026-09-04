import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowRight, MapPin, Mail, Github, Twitter } from "lucide-react";
import { TEAM } from "@/data/team";

const VALUES: { title: string; body: string }[] = [
  {
    title: "Boring infrastructure",
    body: "We obsess over the dull stuff — connection pooling, retry budgets, idempotency keys — so your team can ship the interesting stuff.",
  },
  {
    title: "Open by default",
    body: "The SDK is MIT. Our APIs are documented. Our roadmap is public. We treat trust as the asset, not the API key.",
  },
  {
    title: "Operator empathy",
    body: "Every engineer here has carried a pager. We design dashboards we'd actually want to read at 3am.",
  },
];

const TIMELINE: { year: string; title: string; body: string }[] = [
  {
    year: "2024",
    title: "Built in the open from day one",
    body: "Started as an internal tool we built solo to keep three production dApps from waking us up at 3am.",
  },
  {
    year: "2025",
    title: "Public beta",
    body: "Onboarded the first wave of teams shipping on talak-web3. Stayed under 0.001% error rate through every migration.",
  },
  {
    year: "2026",
    title: "1.0 GA",
    body: "Stable APIs, multi-region infrastructure, card + crypto billing live, and a dashboard people actually love.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="mx-auto max-w-[1100px] px-6 py-16">
        {/* Hero */}
        <header className="max-w-[760px] mb-16">
          <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
            About
          </span>
          <h1 className="mt-3 text-[clamp(2.2rem,4.5vw,3.6rem)] font-[500] tracking-[-0.03em] leading-[1.05]">
            We build the infrastructure that lets the next billion users use Web3 without thinking about it.
          </h1>
          <p className="mt-5 text-[15px] text-muted-foreground leading-[1.75]">
            talak-web3 is the developer platform for production Web3 applications: a single SDK for sign-in,
            RPC, transactions, and analytics, paired with a real-time dashboard your operators will actually
            keep open. Built solo, in public, with help from a small group of early contributors.
          </p>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-md overflow-hidden mb-20">
          {[
            ["1,200+", "teams shipping"],
            ["38",     "supported chains"],
            ["99.99%", "API uptime"],
            ["1",      "solo founder"],
          ].map(([v, l]) => (
            <div key={l} className="bg-background p-5">
              <p className="text-[24px] font-[500] tracking-[-0.02em]">{v}</p>
              <p className="text-[12.5px] text-muted-foreground mt-1">{l}</p>
            </div>
          ))}
        </section>

        {/* Values */}
        <section className="mb-20">
          <h2 className="text-[22px] font-[500] tracking-[-0.02em] mb-6">
            What we believe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
            {VALUES.map((v, i) => (
              <div key={v.title} className="bg-background p-5">
                <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] mb-2 text-muted-foreground">
                  0{i + 1}
                </p>
                <h3 className="text-[15px] font-medium mb-1.5">{v.title}</h3>
                <p className="text-[12.5px] text-muted-foreground leading-[1.7]">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-20">
          <h2 className="text-[22px] font-[500] tracking-[-0.02em] mb-6">Where we've been</h2>
          <ol className="space-y-6 relative pl-7">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
            {TIMELINE.map(t => (
              <li key={t.year} className="relative">
                <span className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border border-border bg-background flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                </span>
                <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  {t.year}
                </p>
                <h3 className="text-[15px] font-medium mt-0.5">{t.title}</h3>
                <p className="text-[12.5px] text-muted-foreground leading-[1.7] mt-1">{t.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* People — each links to its own page */}
        <section className="mb-20">
          <h2 className="text-[22px] font-[500] tracking-[-0.02em] mb-2">The people behind talak-web3</h2>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-[560px] leading-[1.7]">
            talak-web3 is a solo project, built and maintained by a single founder, with thanks to early
            contributors who shaped what it is today. Click any card for the full profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
            {TEAM.map(p => (
              <Link
                key={p.slug}
                to={`/about/${p.slug}`}
                className="bg-background p-6 group hover:bg-muted/30 transition-colors block"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={`https://github.com/${p.github}.png?size=128`}
                    alt={`${p.name} avatar`}
                    width={56}
                    height={56}
                    loading="lazy"
                    className="h-14 w-14 rounded-full border border-border object-cover bg-muted shrink-0"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = null;
                      img.src =
                        `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 56 56'><rect width='56' height='56' fill='%23222'/><text x='50%' y='54%' font-family='monospace' font-size='22' fill='%23999' text-anchor='middle' dominant-baseline='middle'>${p.name.charAt(0)}</text></svg>`;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{p.name}</p>
                    <p className="text-[11px] font-mono uppercase tracking-[0.14em] mt-0.5 text-muted-foreground">
                      {p.role}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[13px] text-muted-foreground leading-[1.75]">{p.bio}</p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 h-7 px-2 text-[11.5px] border border-border rounded-sm text-muted-foreground">
                    <Github className="h-3 w-3" /> {p.github}
                  </span>
                  {p.x && (
                    <span className="inline-flex items-center gap-1.5 h-7 px-2 text-[11.5px] border border-border rounded-sm text-muted-foreground">
                      <Twitter className="h-3 w-3" /> {p.x.replace("@", "")}
                    </span>
                  )}
                  <span className="ml-auto text-[12px] text-muted-foreground inline-flex items-center gap-1 group-hover:text-foreground">
                    Read profile
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="border border-border rounded-md p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono mb-2 text-muted-foreground">
              Get in touch
            </p>
            <a href="mailto:hi@talak-web3.dev" className="text-[14px] font-medium hover:underline inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> hi@talak-web3.dev
            </a>
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono mb-2 text-muted-foreground">
              Where we are
            </p>
            <p className="text-[13px] inline-flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Built remotely · open to collaborators
            </p>
          </div>
          <div className="md:text-right">
            <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono mb-2 text-muted-foreground">
              Contribute
            </p>
            <Link
              to="/docs"
              className="text-[14px] font-medium inline-flex items-center gap-1.5 hover:underline"
            >
              Read the contributor guide <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
