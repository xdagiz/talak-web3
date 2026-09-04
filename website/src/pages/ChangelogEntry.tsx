import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Tag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type ChangelogEntry = {
  id: string;
  version: string;
  date: string;
  kind: string;
  headline: string;
  highlights: string[];
  details: string;
  upgrade: string | null;
  cover_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const KIND_CLS: Record<string, string> = {
  major: "border-success/40 text-success bg-success/10",
  minor: "border-info/40 text-info bg-info/10",
  patch: "border-border text-muted-foreground bg-muted/20",
  security: "border-warning/40 text-warning bg-warning/10",
};

export default function ChangelogEntry() {
  const { version } = useParams<{ version: string }>();
  const [entry, setEntry] = useState<ChangelogEntry | null | undefined>(undefined);
  const [allEntries, setAllEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    if (!version) return;
    let cancelled = false;
    const load = async () => {
      const [entryRes, allRes] = await Promise.all([
        supabase
          .from("changelog_entries")
          .select("*")
          .eq("version", version)
          .eq("published", true)
          .maybeSingle(),
        supabase
          .from("changelog_entries")
          .select("id, version, date")
          .eq("published", true)
          .order("date", { ascending: false }),
      ]);
      if (cancelled) return;
      const e = (entryRes.data as ChangelogEntry) ?? null;
      setEntry(e);
      setAllEntries((allRes.data as ChangelogEntry[]) ?? []);
      if (e) {
        document.title = `v${e.version} — talak-web3 changelog`;
        
        // Update meta tags
        const updateMeta = (name: string, content: string, isProperty = false) => {
          let meta = document.querySelector(isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`);
          if (!meta) {
            meta = document.createElement("meta");
            if (isProperty) {
              meta.setAttribute("property", name);
            } else {
              meta.setAttribute("name", name);
            }
            document.head.appendChild(meta);
          }
          meta.setAttribute("content", content);
        };
        
        const url = window.location.href;
        const description = e.headline || "A release from talak-web3";
        const image = e.cover_url || "https://eshyhdttxyumbmyenpso.supabase.co/storage/v1/object/public/public/opengraph.jpg";
        
        updateMeta("description", description);
        updateMeta("og:title", `v${e.version} — talak-web3 changelog`, true);
        updateMeta("og:description", description, true);
        updateMeta("og:type", "article", true);
        updateMeta("og:url", url, true);
        updateMeta("og:image", image, true);
        updateMeta("twitter:card", "summary_large_image");
        updateMeta("twitter:title", `v${e.version} — talak-web3 changelog`);
        updateMeta("twitter:description", description);
        updateMeta("twitter:image", image);
      }
    };
    load();
    const channel = supabase
      .channel(`changelog-entry-${version}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "changelog_entries", filter: `version=eq.${version}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [version]);

  if (entry === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (entry === null) return <Navigate to="/changelog" replace />;

  const idx = allEntries.findIndex((e) => e.id === entry.id);
  const prev = idx < allEntries.length - 1 ? allEntries[idx + 1] : undefined;
  const next = idx > 0 ? allEntries[idx - 1] : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="mx-auto max-w-[820px] px-6 py-12">
        <Link
          to="/changelog"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Changelog
        </Link>

        {entry.cover_url && (
          <div className="mb-8 relative overflow-hidden rounded-lg border border-border">
            <img 
              src={entry.cover_url} 
              alt="" 
              className="w-full max-h-80 object-cover"
            />
          </div>
        )}

        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-[500] font-mono tracking-[-0.02em]">
              v{entry.version}
            </h1>
            <span
              className={`inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 border rounded-sm ${
                KIND_CLS[entry.kind] || KIND_CLS.patch
              }`}
            >
              <Tag className="h-2.5 w-2.5" /> {entry.kind}
            </span>
            <span className="text-[12.5px] text-muted-foreground">{format(new Date(entry.date), "MMM d, yyyy")}</span>
          </div>
          <p className="mt-3 text-[16px] text-foreground/85 leading-[1.6]">
            {entry.headline}
          </p>
        </header>

        {entry.highlights.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[14px] font-medium mb-3">What changed</h2>
            <ul className="space-y-2 text-[13.5px] text-foreground/85 leading-[1.7]">
              {entry.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-1.5 shrink-0">·</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {entry.details && (
          <section className="mb-10">
            <h2 className="text-[14px] font-medium mb-3">Details</h2>
            <div className="text-[13.5px] text-foreground/85 leading-[1.8]">
              {renderMarkdownBlocks(entry.details)}
            </div>
          </section>
        )}

        {entry.upgrade && (
          <section className="mb-10 border border-border rounded-md p-5 bg-card/30">
            <h2 className="text-[13px] font-medium mb-2">Upgrade notes</h2>
            <p className="text-[13px] text-muted-foreground leading-[1.75]">
              {entry.upgrade}
            </p>
          </section>
        )}

        <nav className="border-t border-border mt-12 pt-6 grid grid-cols-2 gap-3">
          {prev ? (
            <Link
              to={`/changelog/${prev.version}`}
              className="border border-border rounded-md p-4 hover:bg-muted/30 transition-colors group"
            >
              <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground inline-flex items-center gap-1.5">
                <ArrowLeft className="h-3 w-3" /> Older
              </p>
              <p className="mt-1 text-[13.5px] font-medium font-mono group-hover:text-foreground">
                v{prev.version}
              </p>
              <p className="text-[11.5px] text-muted-foreground">{format(new Date(prev.date), "MMM d, yyyy")}</p>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              to={`/changelog/${next.version}`}
              className="border border-border rounded-md p-4 hover:bg-muted/30 transition-colors group text-right"
            >
              <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground inline-flex items-center gap-1.5 justify-end w-full">
                Newer <ArrowRight className="h-3 w-3" />
              </p>
              <p className="mt-1 text-[13.5px] font-medium font-mono group-hover:text-foreground">
                v{next.version}
              </p>
              <p className="text-[11.5px] text-muted-foreground">{format(new Date(next.date), "MMM d, yyyy")}</p>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </main>
      <Footer />
    </div>
  );
}

function renderMarkdownBlocks(src: string): React.ReactNode[] {
  const lines = src.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const start = i + 1;
      let end = start;
      while (end < lines.length && !lines[end].startsWith("```")) end++;
      const code = lines.slice(start, end).join("\n");
      out.push(
        <pre
          key={key++}
          className="my-5 rounded border border-border bg-[#0d1117] text-foreground/90 px-4 py-3 overflow-x-auto text-[12.5px] font-mono leading-[1.65]"
        >
          {lang && <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">{lang}</div>}
          <code>{code}</code>
        </pre>
      );
      i = end + 1;
      continue;
    }

    // Headings
    if (/^###\s+/.test(line)) {
      out.push(<h3 key={key++} className="mt-7 mb-2 text-[15px] font-medium">{line.replace(/^###\s+/, "")}</h3>);
      i++; continue;
    }
    if (/^##\s+/.test(line)) {
      out.push(<h2 key={key++} className="mt-9 mb-3 text-[19px] font-medium tracking-[-0.01em]">{line.replace(/^##\s+/, "")}</h2>);
      i++; continue;
    }
    if (/^#\s+/.test(line)) {
      out.push(<h1 key={key++} className="mt-10 mb-4 text-[24px] font-medium tracking-[-0.02em]">{line.replace(/^#\s+/, "")}</h1>);
      i++; continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const start = i;
      while (i < lines.length && lines[i].startsWith(">")) i++;
      const text = lines.slice(start, i).map(l => l.replace(/^>\s?/, "")).join(" ");
      out.push(
        <blockquote key={key++} className="my-5 border-l-2 border-border pl-4 text-foreground/70 italic">
          {renderInline(text)}
        </blockquote>
      );
      continue;
    }

    // List
    if (/^[-*]\s+/.test(line)) {
      const start = i;
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) i++;
      out.push(
        <ul key={key++} className="my-4 space-y-1.5 list-disc list-outside pl-5 text-foreground/85">
          {lines.slice(start, i).map((l, idx) => (
            <li key={idx} className="text-[14px] leading-[1.7]">{renderInline(l.replace(/^[-*]\s+/, ""))}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") { i++; continue; }

    // Paragraph
    const start = i;
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("```") && !lines[i].startsWith(">") && !/^[-*]\s+/.test(lines[i])) i++;
    const text = lines.slice(start, i).join(" ");
    out.push(<p key={key++} className="my-4 text-[14.5px] leading-[1.75] text-foreground/80">{renderInline(text)}</p>);
  }
  return out;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0; let key = 0;
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      parts.push(<code key={key++} className="font-mono text-[13px] px-1 py-0.5 rounded bg-muted text-foreground">{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**")) {
      parts.push(<strong key={key++} className="text-foreground font-medium">{tok.slice(2, -2)}</strong>);
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (linkMatch) parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-4 hover:text-foreground/80">
          {linkMatch[1]}
        </a>
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

