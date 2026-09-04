import { useEffect, useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Tag,
  Download,
  Package as PackageIcon,
  Scale,
  Calendar,
  HardDrive,
  FileCode,
} from "lucide-react";
import { getPackageBySlug, PACKAGES, CATEGORY_META } from "@/data/packages";
import { TalakMark } from "@/components/TalakMark";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/CodeBlock";
import { PackageLinks } from "@/components/PackageLinks";
import { useNpmStats, formatDownloads, formatBytes } from "@/hooks/useNpmStats";

export default function PackageDetail() {
  const { slug } = useParams<{ slug: string }>();
  const pkg = slug ? getPackageBySlug(slug) : undefined;
  const stats = useNpmStats(pkg?.name);

  useEffect(() => {
    if (pkg) document.title = `${pkg.name} — talak-web3`;
  }, [pkg]);

  const related = useMemo(() => {
    if (!pkg) return [];
    return PACKAGES.filter(p => p.category === pkg.category && p.slug !== pkg.slug).slice(0, 3);
  }, [pkg]);

  if (!pkg) return <Navigate to="/packages" replace />;

  const Icon = pkg.icon;
  const accent = CATEGORY_META[pkg.category].accent.hex;
  const [namePrefix, nameSuffix] = pkg.name.startsWith("@talak-web3/")
    ? ["@talak-web3/", pkg.name.slice("@talak-web3/".length)]
    : ["", pkg.name];

  const importExample = `import { ${pkg.exports
    .filter(e => !e.includes("(binary)"))
    .slice(0, 3)
    .map(e => e.split(" ")[0])
    .join(", ")} } from "${pkg.name}";

// Initialize and use immediately — fully typed
const result = await ${(pkg.exports[0] ?? "init").split(" ")[0]}({
  apiKey: process.env.TALAK_KEY,
});
`;

  const publishedRel = stats.publishedAt ? formatRelative(stats.publishedAt) : null;

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
            <Link to="/packages" className="hover:text-foreground transition-colors">Packages</Link>
          </div>
          <Link to="/packages" className="text-[13px] text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            All packages
          </Link>
        </div>
      </nav>

      <section className="relative pt-16 pb-12 px-6">
        <div className="relative mx-auto max-w-[1200px]">
          <div className="text-[12px] font-mono text-foreground/50 mb-5 flex items-center gap-2">
            <Link to="/packages" className="hover:text-foreground transition-colors">packages</Link>
            <span>/</span>
            <span className="text-foreground/65">{pkg.category.toLowerCase()}</span>
            <span>/</span>
            <span className="text-foreground">{pkg.slug}</span>
          </div>

          <div className="flex items-start gap-5 flex-wrap">
            <div
              className="h-16 w-16 rounded border flex items-center justify-center"
              style={{
                borderColor: `${accent}40`,
                backgroundColor: `${accent}14`,
                color: accent,
                boxShadow: `0 0 0 1px ${accent}10, 0 8px 24px -12px ${accent}50`,
              }}
            >
              <Icon className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-[clamp(1.6rem,3vw,2.4rem)] font-[500] tracking-[-0.025em] font-mono break-all">
                  <span className="text-foreground/55">{namePrefix}</span>
                  <span className="text-foreground">{nameSuffix}</span>
                </h1>
                <span
                  className="text-[10.5px] font-mono uppercase tracking-[0.12em] px-2 py-1 border"
                  style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}10` }}
                >
                  {pkg.category}
                </span>
                {stats.version && (
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.12em] px-2 py-1 border border-border text-foreground/70">
                    v{stats.version}
                  </span>
                )}
              </div>
              <p className="text-[15px] leading-relaxed text-foreground/70 max-w-[760px]">
                {pkg.long}
              </p>
              <div className="mt-5">
                <PackageLinks github={pkg.github} npm={pkg.npm} size="md" />
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border border-border">
            {[
              { I: Tag,       k: "Version",    v: stats.version ? `v${stats.version}` : stats.loading ? "…" : "—" },
              { I: Download,  k: "Downloads",  v: stats.monthlyDownloads !== null ? `${formatDownloads(stats.monthlyDownloads)}/mo` : stats.loading ? "…" : "—" },
              { I: HardDrive, k: "Unpacked",   v: formatBytes(stats.unpackedSize) },
              { I: Scale,     k: "License",    v: stats.license ?? "—" },
              { I: Calendar,  k: "Published",  v: publishedRel ?? (stats.loading ? "…" : "—") },
              { I: PackageIcon, k: "Module",   v: "ESM" },
            ].map(s => {
              const SI = s.I;
              return (
                <div key={s.k} className="p-5 border-r border-b border-border last:border-r-0 [&:nth-child(2n)]:max-md:border-r-0 [&:nth-child(3n)]:max-lg:md:border-r-0">
                  <div className="flex items-center gap-2 text-[11px] text-foreground/50 uppercase tracking-[0.1em] font-mono mb-2">
                    <SI className="h-3 w-3" />
                    {s.k}
                  </div>
                  <div className="text-[16px] font-[500] tracking-[-0.01em] text-foreground font-mono break-all">
                    {s.v}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-[1200px] grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-mono mb-3">
              Install
            </div>
            <div className="border border-border bg-[#0a0d12]">
              <div className="flex items-center gap-3 px-4 h-9 border-b border-[#1f242c] bg-[#161b22]">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <span className="text-[11px] text-white/50 font-mono ml-2">terminal</span>
              </div>
              <div className="p-4 font-mono text-[12.5px] space-y-2.5">
                {[
                  ["npm",  `npm install ${pkg.name}`],
                  ["pnpm", `pnpm add ${pkg.name}`],
                  ["yarn", `yarn add ${pkg.name}`],
                  ["bun",  `bun add ${pkg.name}`],
                ].map(([pm, cmd]) => (
                  <div key={pm} className="flex items-center gap-3">
                    <span className="text-white/40 w-10 text-[10.5px] uppercase tracking-[0.12em]">{pm}</span>
                    <span className="text-white/40">$</span>
                    <span className="text-white/85 truncate">{cmd}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border border-border p-5 bg-card/30">
              <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-mono mb-3">
                Exports
              </div>
              <ul className="space-y-2">
                {pkg.exports.map(e => (
                  <li key={e} className="flex items-center gap-3 font-mono text-[12.5px] text-foreground/80">
                    <FileCode className="h-3 w-3 text-foreground/40" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-mono mb-3">
              Quick start
            </div>
            <CodeBlock filename={`${pkg.slug}.ts`} language="ts" code={importExample} />

            <div className="mt-8 grid grid-cols-2 gap-3">
              <Link
                to="/#quickstart"
                className="border border-border p-4 hover:border-foreground/30 hover:bg-card/60 transition-all flex items-center justify-between text-[13px]"
              >
                <span className="text-foreground/80">View full quick start</span>
                <ArrowRight className="h-4 w-4 text-foreground/50" />
              </Link>
              <Link
                to="/packages"
                className="border border-border p-4 hover:border-foreground/30 hover:bg-card/60 transition-all flex items-center justify-between text-[13px]"
              >
                <span className="text-foreground/80">Browse all packages</span>
                <PackageIcon className="h-4 w-4 text-foreground/50" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-[1200px]">
            <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/50 font-mono mb-5">
              More in {pkg.category}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map(rp => {
                const RIcon = rp.icon;
                return (
                  <Link
                    key={rp.slug}
                    to={`/packages/${rp.slug}`}
                    className="group border border-border bg-card/30 p-5 transition-all hover:bg-card/60 border-l-2"
                    style={{ borderLeftColor: `${accent}55` }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="h-9 w-9 rounded border flex items-center justify-center"
                        style={{ borderColor: `${accent}33`, backgroundColor: `${accent}12`, color: accent }}
                      >
                        <RIcon className="h-4 w-4" />
                      </div>
                      <h3 className="text-[13px] font-mono font-medium text-foreground break-all">
                        {rp.name}
                      </h3>
                    </div>
                    <p className="text-[12px] leading-[1.55] text-foreground/55">
                      {rp.desc}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 24 * 3600 * 1000;
  if (diff < day) return "today";
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo ago`;
  return `${Math.floor(diff / (365 * day))}y ago`;
}
