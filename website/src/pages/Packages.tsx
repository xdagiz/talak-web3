import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Search, Boxes } from "lucide-react";
import { PACKAGES, CATEGORIES, CATEGORY_META, type CategoryFilter } from "@/data/packages";
import { TalakMark } from "@/components/TalakMark";
import { Footer } from "@/components/Footer";
import { PackageLinks } from "@/components/PackageLinks";
import { useNpmStats, formatDownloads } from "@/hooks/useNpmStats";
import type { Pkg } from "@/data/packages";

function PackageCard({ p }: { p: Pkg }) {
  const meta = CATEGORY_META[p.category];
  const accent = meta.accent.hex;
  const Icon = p.icon;
  const stats = useNpmStats(p.name);
  const [namePrefix, nameSuffix] = p.name.startsWith("@talak-web3/")
    ? ["@talak-web3/", p.name.slice("@talak-web3/".length)]
    : ["", p.name];

  return (
    <div
      className="group relative border border-border bg-card/30 p-5 transition-all hover:bg-card/60 hover:-translate-y-0.5 border-l-2"
      style={{ borderLeftColor: `${accent}55` }}
      onMouseEnter={e => (e.currentTarget.style.borderLeftColor = accent)}
      onMouseLeave={e => (e.currentTarget.style.borderLeftColor = `${accent}55`)}
    >
      <Link to={`/packages/${p.slug}`} className="absolute inset-0 z-0" aria-label={`View ${p.name}`} />
      <div className="relative z-[1]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className="h-10 w-10 rounded border flex items-center justify-center"
            style={{
              borderColor: `${accent}33`,
              backgroundColor: `${accent}12`,
              color: accent,
            }}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <span
            className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-1 border"
            style={{ color: accent, borderColor: `${accent}40` }}
          >
            {p.category}
          </span>
        </div>
        <h3 className="text-[14px] font-mono font-medium text-foreground mb-1.5 break-all">
          <span className="text-foreground/55">{namePrefix}</span>
          <span className="text-foreground">{nameSuffix}</span>
        </h3>
        <p className="text-[12.5px] leading-[1.55] text-foreground/60 mb-5 min-h-[3em]">
          {p.desc}
        </p>
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-3 text-[11px] text-foreground/55 font-mono">
            <span title="Latest version on npm">
              {stats.version ? `v${stats.version}` : stats.loading ? "…" : "—"}
            </span>
            <span className="text-foreground/30">·</span>
            <span title="Downloads in the last 30 days">
              {formatDownloads(stats.monthlyDownloads)}/mo
            </span>
          </div>
          <PackageLinks github={p.github} npm={p.npm} />
        </div>
      </div>
      <Link
        to={`/packages/${p.slug}`}
        className="relative z-[1] mt-4 inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground transition-colors"
      >
        View details
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

export default function Packages() {
  const [active, setActive] = useState<CategoryFilter>("All");
  const [query, setQuery] = useState("");
  const meta = useNpmStats("talak-web3");

  useEffect(() => {
    document.title = "Packages — talak-web3";
  }, []);

  const filtered = useMemo(
    () =>
      PACKAGES.filter(p => {
        const matchesCat = active === "All" || p.category === active;
        const matchesQ = !query || (p.name + " " + p.desc).toLowerCase().includes(query.toLowerCase());
        return matchesCat && matchesQ;
      }),
    [active, query]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border px-6">
        <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 -ml-0.5">
            <TalakMark className="h-7 w-7 text-foreground" />
            <span className="text-[15px] font-bold text-foreground tracking-[0.04em]">talak-web3</span>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-[13px] text-foreground/70">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/#install" className="hover:text-foreground transition-colors">Install</Link>
            <Link to="/packages" className="text-foreground">Packages</Link>
          </div>
          <Link to="/" className="text-[13px] text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </nav>

      <section className="relative pt-20 pb-12 px-6">
        <div className="relative mx-auto max-w-[1200px]">
          <p className="text-[13px] uppercase tracking-[0.18em] text-foreground/50 mb-3 font-mono">
            @talak-web3/* · scope packages
          </p>
          <h1 className="text-[clamp(2rem,4vw,3.4rem)] font-[500] tracking-[-0.035em] leading-[1.05] max-w-[820px]">
            Every scope, every version, every export.
          </h1>
          <p className="mt-5 text-[15px] text-foreground/65 max-w-[640px] leading-relaxed">
            {PACKAGES.length} independently-versioned packages, fully tree-shakable.
            Install only what you ship — versions and download counts come live from npm.
          </p>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { v: PACKAGES.length, k: "packages" },
              { v: meta.version ? `v${meta.version}` : meta.loading ? "…" : "—", k: "talak-web3 latest" },
              { v: "ESM", k: "module type" },
              { v: meta.license ?? "MIT", k: "license" },
            ].map(s => (
              <div key={s.k} className="border border-border bg-card/30 p-4">
                <div className="text-[26px] font-[500] tracking-[-0.02em] text-foreground font-mono">{s.v}</div>
                <div className="text-[12px] text-foreground/55 mt-0.5 uppercase tracking-[0.08em] font-mono">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 pb-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col md:flex-row md:items-center gap-4 sticky top-[56px] py-4 bg-background/85 backdrop-blur-md z-30 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => {
                const isActive = active === c;
                const accent = c === "All" ? "#e5e7eb" : CATEGORY_META[c].accent.hex;
                return (
                  <button
                    key={c}
                    onClick={() => setActive(c)}
                    className="h-8 px-3 text-[12px] font-medium border transition-all flex items-center gap-1.5"
                    style={
                      isActive
                        ? { borderColor: accent, color: accent, backgroundColor: `${accent}14` }
                        : undefined
                    }
                  >
                    <span
                      className={isActive ? "" : "border-border text-foreground/55"}
                      style={!isActive ? undefined : undefined}
                    >
                      {c}
                    </span>
                    {c !== "All" && (
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: isActive ? accent : "#9ca3af80" }}
                      >
                        {PACKAGES.filter(p => p.category === c).length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="md:ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search packages, descriptions…"
                className="h-9 w-full md:w-[280px] pl-9 pr-3 text-[12.5px] border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-foreground/50 transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-32">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex items-center gap-2 mb-6 text-[12px] text-foreground/50">
            <Boxes className="h-3.5 w-3.5" />
            <span>{filtered.length} of {PACKAGES.length} packages</span>
          </div>

          {filtered.length === 0 ? (
            <div className="border border-border p-16 text-center text-[14px] text-foreground/55">
              No packages match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(p => <PackageCard key={p.slug} p={p} />)}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
