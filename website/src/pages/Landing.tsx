import { Link } from "react-router-dom";
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import { Logo3D } from "@/components/Logo3D";
import { SafeBoundary } from "@/components/SafeBoundary";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { StackedLogo } from "@/components/StackedLogo";
import { InstallSections } from "@/components/InstallSections";
import { TalakMark } from "@/components/TalakMark";
import { Footer } from "@/components/Footer";
import { NpmIcon } from "@/components/icons/LangIcons";
import githubLogo from "@/assets/logos/github.png";

/** Apply slate accent on mount */
const SLATE_HSL = "215 16% 47%";
const SLATE_DARK = "215 14% 55%";

const LOGO_VARIANT = 1;
const CUBE_SIZE = 840;
const CUBE_OFFSET_X = -140;
const CUBE_OFFSET_Y = -80;

const GITHUB_REPO = "dagimabebe/talak-web3";

function NpmBadge() {
  return (
    <a
      href="https://www.npmjs.com/package/talak-web3"
      target="_blank"
      rel="noreferrer"
      title="View talak-web3 on npm"
      aria-label="View talak-web3 on npm"
      className="group inline-flex items-center gap-1.5 h-7 px-2 border border-border text-[12px] text-foreground/70 hover:text-foreground hover:border-[#CB3837]/60 transition-colors"
    >
      <NpmIcon className="h-3.5 w-3.5" />
      <span>npm</span>
    </a>
  );
}

function GitHubBadge() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStars(d.stargazers_count))
      .catch(() => {});
  }, []);
  const starLabel =
    stars !== null
      ? stars >= 1000
        ? (stars / 1000).toFixed(stars >= 10000 ? 0 : 1) + "k"
        : stars.toLocaleString()
      : "★";
  return (
    <a
      href={`https://github.com/${GITHUB_REPO}`}
      target="_blank"
      rel="noreferrer"
      title={`Star talak-web3 on GitHub${stars !== null ? ` · ${stars.toLocaleString()} stars` : ""}`}
      className="group inline-flex items-stretch h-7 border border-border text-[12px] text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
    >
      <span className="inline-flex items-center gap-1.5 px-2">
        <img src={githubLogo} alt="GitHub" className="h-3.5 w-3.5 object-contain" aria-hidden="true" />
        <span>GitHub</span>
      </span>
      <span className="inline-flex items-center gap-1 px-2 border-l border-border bg-foreground/[0.04] text-foreground/85 transition-colors group-hover:bg-foreground/[0.08]">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 drop-shadow-[0_0_4px_rgba(244,185,66,0.45)] transition-transform group-hover:scale-110"
          fill="#F4B942"
          stroke="#B97E0F"
          strokeWidth="0.6"
          aria-hidden="true"
        >
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
        <span className="font-mono tabular-nums">{starLabel}</span>
      </span>
    </a>
  );
}

const Landing = () => {
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cubeZoom, setCubeZoom] = useState(() => {
    const w = window.innerWidth;
    return w < 1024 ? 270 : 360;
  });

  useEffect(() => {
    const handleResize = () => {
      setCubeZoom(window.innerWidth < 1024 ? 270 : 360);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDark = theme === "dark";
  const diagonalLineColor = isDark ? "hsl(240 4% 26%" : "hsl(240 4% 80%";

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark";
    const hsl = isDark ? SLATE_DARK : SLATE_HSL;
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--sidebar-ring", hsl);
  }, [theme]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-background border-b border-border px-6">
        <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 -ml-0.5" onClick={() => setMobileOpen(false)}>
            <TalakMark className="h-7 w-7 text-foreground" />
            <span className="text-[15px] font-bold text-foreground tracking-[0.04em]">talak-web3</span>
          </Link>
          <div className="hidden md:flex items-center gap-3 text-[13px] text-foreground/70">
            <a href="#install" className="hover:text-foreground transition-colors">Install</a>
            <Link to="/packages" className="hover:text-foreground transition-colors">Packages</Link>
            <NpmBadge />
            <GitHubBadge />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
              title="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
            <Link to="/auth" className="hidden sm:inline-flex">
              <button className="text-[13px] text-foreground/70 hover:text-foreground transition-colors h-8 px-3">
                Log in
              </button>
            </Link>
            <Link to="/auth" className="hidden sm:inline-flex">
              <button className="text-[13px] h-8 px-3 border border-foreground/40 text-foreground hover:bg-foreground hover:text-background transition-colors">
                Get started
              </button>
            </Link>
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="md:hidden h-8 w-8 inline-flex items-center justify-center border border-border text-foreground hover:bg-muted/40 transition-colors"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background -mx-6 px-6">
            <div className="mx-auto max-w-[1200px] py-3 flex flex-col">
              <a
                href="#install"
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-[14px] text-foreground/80 hover:text-foreground border-b border-border/60"
              >
                Install
              </a>
              <Link
                to="/packages"
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-[14px] text-foreground/80 hover:text-foreground border-b border-border/60"
              >
                Packages
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-[14px] text-foreground/80 hover:text-foreground border-b border-border/60"
              >
                Pricing
              </Link>
              <Link
                to="/docs"
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-[14px] text-foreground/80 hover:text-foreground border-b border-border/60"
              >
                Docs
              </Link>
              <Link
                to="/blog"
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-[14px] text-foreground/80 hover:text-foreground border-b border-border/60"
              >
                Blog
              </Link>
              <div className="flex items-center gap-2 mt-3">
                <NpmBadge />
                <GitHubBadge />
              </div>
              <div className="flex items-center gap-2 mt-3 pb-1">
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 inline-flex items-center justify-center h-9 text-[12.5px] border border-border"
                >
                  Log in
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 inline-flex items-center justify-center h-9 text-[12.5px] font-medium text-background bg-foreground"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-16 pb-0 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          {/* Two-column hero: text left, cube right */}
          <div className="pt-[52px] pb-16 relative flex">
            {/* Left column — text */}
            <div className="relative z-[3] flex-1 min-w-0 max-w-[540px]">
              <h1 className="text-[clamp(2rem,4vw,3.2rem)] font-[500] leading-[1.08] tracking-[-0.04em] text-foreground max-w-[540px]">
                Unified Web3 infrastructure for teams that ship fast
              </h1>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground max-w-[460px]">
                TypeScript-first SDK for SIWE auth, resilient RPC, AI utilities, and identity. Build secure, scalable dApps without fragmentation.
              </p>
              <div className="mt-10 flex items-center gap-3">
                <Link to="/auth">
                  <button className="group relative inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium bg-foreground text-background transition-all duration-200 hover:bg-foreground/90">
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </Link>
                <a href="#code" className="inline-flex items-center gap-2 px-6 py-3 text-[14px] font-medium border border-foreground/40 text-foreground hover:bg-foreground hover:text-background transition-all duration-200">
                  View Docs
                </a>
              </div>
            </div>

            {/* Right column — 3D cube */}
            <div className="hidden md:block flex-1 relative z-[1] pointer-events-none" style={{ minWidth: 0 }}>
              <div className="absolute top-1/2 right-0 -translate-y-1/2" style={{ width: CUBE_SIZE, height: CUBE_SIZE, transform: `translate(${-CUBE_OFFSET_X}px, calc(-50% + ${CUBE_OFFSET_Y}px))` }}>
                <SafeBoundary fallback={<div className="w-full h-full" style={{ background: theme === "dark" ? "#0e0e10" : "#ffffff" }} />}>
                  <Logo3D variant={LOGO_VARIANT} size={CUBE_SIZE} zoom={cubeZoom} bgHex={theme === "dark" ? "#0e0e10" : "#ffffff"} lineHex={theme === "dark" ? "#58585e" : "#c0c0c8"} />
                </SafeBoundary>
              </div>
            </div>
          </div>

          <div className="relative" style={{ overflow: "visible" }}>
            <div className="relative z-10 rounded-t-xl border border-b-0 border-border bg-card overflow-hidden">
              <div className="flex min-h-[420px]">
                {/* Sidebar mock */}
                <div className="w-[200px] border-r border-border p-3 flex flex-col gap-1 shrink-0">
                  <div className="flex items-center gap-2 px-2 h-8 mb-2">
                    <div className="h-4 w-4 rounded bg-primary/30" />
                    <div className="h-2 w-16 rounded-full bg-foreground/15" />
                  </div>
                  <div className="h-px bg-border" />
                  {['w-20', 'w-16', 'w-24', 'w-14'].map((w, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 h-7 rounded ${i === 2 ? "bg-accent" : ""}`}>
                      <div className="h-3 w-3 rounded bg-muted-foreground/15 shrink-0" />
                      <div className={`h-1.5 ${w} rounded-full ${i === 2 ? "bg-foreground/25" : "bg-muted-foreground/15"}`} />
                    </div>
                  ))}
                  <div className="h-px bg-border my-1" />
                  <div className="px-2 mb-1">
                    <div className="h-1.5 w-14 rounded-full bg-muted-foreground/10" />
                  </div>
                  {['w-24', 'w-16', 'w-20'].map((w, i) => (
                    <div key={`f-${i}`} className="flex items-center gap-2 px-2 h-7">
                      <div className="h-2 w-2 rounded-full bg-primary/30 shrink-0" />
                      <div className={`h-1.5 ${w} rounded-full bg-muted-foreground/12`} />
                    </div>
                  ))}
                </div>

                {/* Main content — issue list */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center gap-3 px-4 h-10 border-b border-border">
                    <div className="h-2 w-10 rounded-full bg-muted-foreground/15" />
                    <div className="h-2 w-8 rounded-full bg-muted-foreground/10" />
                    <div className="h-2 w-12 rounded-full bg-muted-foreground/10" />
                    <div className="ml-auto flex gap-2">
                      <div className="h-5 w-5 rounded bg-muted-foreground/8" />
                      <div className="h-5 w-5 rounded bg-muted-foreground/8" />
                    </div>
                  </div>
                  <div className="flex-1">
                    {[
                      { priority: "bg-success", id: "RPC-9421", title: "w-[180px]", status: "bg-success" },
                      { priority: "bg-destructive", id: "RPC-9418", title: "w-[220px]", status: "bg-destructive" },
                      { priority: "bg-warning", id: "RPC-9415", title: "w-[160px]", status: "bg-warning" },
                      { priority: "bg-success", id: "RPC-9412", title: "w-[200px]", status: "bg-success" },
                      { priority: "bg-primary", id: "SIWE-882", title: "w-[140px]", status: "bg-primary" },
                      { priority: "bg-success", id: "RPC-9408", title: "w-[190px]", status: "bg-success" },
                      { priority: "bg-success", id: "RPC-9404", title: "w-[170px]", status: "bg-success" },
                    ].map((row, i) => (
                      <div key={i} className={`relative flex items-center gap-3 px-4 h-9 border-b border-border transition-colors`}>
                        {i === 1 && (
                          <div className="absolute inset-0" style={{
                            backgroundImage: `repeating-linear-gradient(-45deg, ${diagonalLineColor} / 0.3) 0px, ${diagonalLineColor} / 0.3) 1px, transparent 1px, transparent 6px)`,
                          }} />
                        )}
                        <div className="h-3.5 w-3.5 rounded border border-border flex items-center justify-center shrink-0">
                          <div className={`h-1.5 w-1.5 rounded-sm ${row.priority}`} />
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono shrink-0">{row.id}</span>
                        <div className={`h-1.5 ${row.title} rounded-full bg-foreground/15`} />
                        <div className="ml-auto flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${row.status}`} />
                          <div className="h-5 w-5 rounded-full bg-muted-foreground/10" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detail panel */}
                <div className="w-[280px] border-l border-border shrink-0 hidden lg:flex flex-col">
                  <div className="flex items-center justify-between px-4 h-10 border-b border-border">
                    <div className="h-2 w-20 rounded-full bg-foreground/15" />
                    <div className="flex gap-1.5">
                      <div className="h-4 w-4 rounded bg-muted-foreground/10" />
                      <div className="h-4 w-4 rounded bg-muted-foreground/10" />
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="h-2 w-32 rounded-full bg-foreground/20" />
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full rounded-full bg-muted-foreground/10" />
                      <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/10" />
                    </div>
                    <div className="h-px bg-border" />
                    {[
                      { label: "Status", value: "bg-warning" },
                      { label: "Priority", value: "bg-destructive" },
                      { label: "Assignee", value: "bg-primary" },
                      { label: "Due", value: "bg-muted-foreground/15" },
                    ].map((prop) => (
                      <div key={prop.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{prop.label}</span>
                        <div className={`h-2.5 w-2.5 rounded-full ${prop.value}`} />
                      </div>
                    ))}
                    <div className="h-px bg-border" />
                    <div className="space-y-3 pt-1">
                      <div className="h-1.5 w-14 rounded-full bg-muted-foreground/10" />
                      {[1, 2].map((n) => (
                        <div key={n} className="flex gap-2">
                          <div className="h-5 w-5 rounded-full bg-muted-foreground/10 shrink-0 mt-0.5" />
                          <div className="space-y-1 flex-1">
                            <div className="h-1.5 w-full rounded-full bg-muted-foreground/8" />
                            <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/8" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Full-width divider */}
      <div className="relative z-10 w-full border-t border-border" />

      {/* Features */}
      <section className="relative z-10 pt-24 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] relative">
          <p className="text-[13px] uppercase tracking-[0.15em] text-muted-foreground mb-4">
            Built for builders
          </p>
          <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] tracking-[-0.03em] text-foreground max-w-[500px] leading-[1.15]">
            Less plumbing.<br />More shipping.
          </h2>

          <div className="mt-16 border border-border">
            <div className="grid grid-cols-1 md:grid-cols-3">
              {[
                {
                  title: "SIWE authentication",
                  desc: "Sign-In with Ethereum out of the box. Atomic nonce consumption, replay-safe sessions, JWT issuance — wired in minutes.",
                  graphic: "bars",
                },
                {
                  title: "Resilient RPC",
                  desc: "Multi-provider failover, retries, and rate limiting. Your dApp keeps responding when one upstream blinks.",
                  graphic: "flow",
                },
                {
                  title: "Live observability",
                  desc: "Request volume, latency p95, provider mix, error rates. Real telemetry — not vanity dashboards.",
                  graphic: "chart",
                },
              ].map((feature, i) => (
                <div
                  key={feature.title}
                  className={`p-8 ${i < 2 ? "md:border-r border-border" : ""} ${i > 0 ? "border-t md:border-t-0 border-border" : ""}`}
                >
                  <div className="mb-6 h-32 rounded-lg border border-border bg-card/30 flex items-center justify-center">
                    <div className="space-y-2 w-full px-6">
                      {feature.graphic === "bars" && (
                        <>
                          {[
                            { w: "w-full", color: "bg-destructive" },
                            { w: "w-3/4", color: "bg-warning" },
                            { w: "w-1/2", color: "bg-primary" },
                            { w: "w-1/4", color: "bg-success" },
                          ].map((bar, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <div className={`h-2 ${bar.w} rounded-full ${bar.color}`} />
                            </div>
                          ))}
                        </>
                      )}
                      {feature.graphic === "flow" && (
                        <div className="flex items-center justify-between px-2">
                          {['bg-info', 'bg-warning', 'bg-success'].map((c, j) => (
                            <div key={j} className="flex flex-col items-center gap-2">
                              <div className={`h-8 w-8 rounded-full ${c}`} />
                              <div className="h-1 w-8 rounded-full bg-muted-foreground/10" />
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.graphic === "chart" && (
                        <div className="flex items-end gap-1.5 h-16 px-2">
                          {[40, 65, 45, 80, 55, 70, 90].map((h, j) => (
                            <div key={j} className="relative flex-1 rounded-t border border-border overflow-hidden" style={{ height: `${h}%` }}>
                              <div className="absolute inset-0" style={{
                                backgroundImage: `repeating-linear-gradient(-45deg, ${diagonalLineColor} / 0.5) 0px, ${diagonalLineColor} / 0.5) 1px, transparent 1px, transparent 5px)`,
                              }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-[15px] font-medium text-foreground mb-2">{feature.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Full-width divider */}
      <div className="relative z-10 w-full border-t border-border" />

      {/* Social proof */}
      <section className="relative z-10 py-24 px-6 overflow-hidden">
        {/* Angular line shading background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              ${diagonalLineColor} / 0.55) 0px,
              ${diagonalLineColor} / 0.55) 1px,
              transparent 1px,
              transparent 8px
            )`,
            backgroundSize: "100% 100%",
          }}
        />
        <div className="mx-auto max-w-[1200px] relative">
          <div className="border border-border bg-background p-10 max-w-[720px] mx-auto">
            <blockquote className="text-[20px] font-[400] leading-[1.5] tracking-[-0.01em] text-foreground/85">
              "We swapped three Web3 libraries for one SDK. SIWE, RPC failover, and analytics — all wired in an afternoon. Our p95 latency dropped 38% the next day."
            </blockquote>
          </div>
        </div>
      </section>

      {/* New install + scope-package sections */}
      <InstallSections />

      {/* Full-width divider */}
      <div className="relative z-10 w-full border-t border-border" />

      {/* CTA */}
      <section className="relative z-10 pt-24 pb-32 px-6 overflow-hidden">
        <div className="mx-auto max-w-[1200px] text-center relative">
          <div className="mx-auto max-w-[480px] border border-border bg-card/30 overflow-hidden">
            <video
              src={`${import.meta.env.BASE_URL}talak-vid.mp4`}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="block w-full h-auto"
            />
          </div>
          <h2 className="mt-16 text-[clamp(2rem,4vw,3.2rem)] font-[500] tracking-[-0.035em] text-foreground leading-[1.1] mx-auto max-w-[560px]">
            Ship Web3 features. Skip the boilerplate.
          </h2>
          <p className="mt-5 text-[15px] text-muted-foreground max-w-[400px] mx-auto">
            Two minutes to install. Just one SDK that does the heavy lifting.
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/auth">
              <button
                className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 text-[15px] font-medium transition-all duration-200 border border-foreground/40 text-foreground hover:bg-foreground hover:text-background hover:border-foreground"
              >
                Start building
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
