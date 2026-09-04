import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { Tag, ArrowRight, Loader2 } from "lucide-react";
import { ROADMAP } from "@/data/releases";
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

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Changelog — talak-web3";
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("changelog_entries")
        .select("*")
        .eq("published", true)
        .order("date", { ascending: false });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setEntries([]);
      } else {
        setError(null);
        setEntries((data as ChangelogEntry[]) ?? []);
      }
    };
    load();
    const channel = supabase
      .channel("public-changelog")
      .on("postgres_changes", { event: "*", schema: "public", table: "changelog_entries" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="mx-auto max-w-[900px] px-6 py-16">
        <header className="mb-12">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-mono">
            Changelog
          </span>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-[500] tracking-[-0.03em] leading-[1.1]">
            Every release, in one place.
          </h1>
          <p className="mt-4 text-[15px] text-muted-foreground max-w-[600px] leading-[1.7]">
            Click any version for the full release notes. Subscribe to the RSS feed, follow{" "}
            <a
              href="https://x.com/talakweb3"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              @talakweb3
            </a>
            , or join{" "}
            <a
              href="https://discord.gg/talak-web3"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Discord
            </a>{" "}
            to be the first to know.
          </p>
        </header>

        {entries === null ? (
          <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="border border-border p-8 text-[13px] text-muted-foreground">
            The changelog isn't reachable yet — make sure the <code className="font-mono">changelog_entries</code> table is created.
          </div>
        ) : entries.length === 0 ? (
          <div className="border border-border p-12 text-center">
            <p className="text-[14px] text-foreground/70">No entries yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {entries.map((e) => {
              const date = e.date;
              return (
                <Link
                  key={e.id}
                  to={`/changelog/${e.version}`}
                  className="group block border border-border rounded-lg overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  {e.cover_url && (
                    <div className="relative h-36 overflow-hidden">
                      <img 
                        src={e.cover_url} 
                        alt="" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h2 className="text-[16px] font-medium font-mono">v{e.version}</h2>
                      <span
                        className={`inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 border rounded-sm ${
                          KIND_CLS[e.kind] || KIND_CLS.patch
                        }`}
                      >
                        <Tag className="h-2.5 w-2.5" /> {e.kind}
                      </span>
                      <span className="text-[12px] text-muted-foreground">{format(new Date(date), "MMM d, yyyy")}</span>
                      <span className="ml-auto text-[12px] text-muted-foreground inline-flex items-center gap-1 group-hover:text-foreground">
                        Read
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                    <p className="text-[14px] text-foreground/85 leading-[1.6] mb-3">
                      {e.headline}
                    </p>
                    {e.highlights.length > 0 && (
                      <ul className="space-y-1.5 text-[12.5px] text-muted-foreground leading-[1.7]">
                        {e.highlights.slice(0, 3).map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-muted-foreground/50 mt-1.5 shrink-0">·</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Roadmap */}
        <section id="roadmap" className="mt-20">
          <h2 className="text-[22px] font-[500] tracking-[-0.02em] mb-1">Roadmap</h2>
          <p className="text-[13px] text-muted-foreground mb-6">
            What we're shipping next. Dates are intentions, not promises.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
            {ROADMAP.map((r) => (
              <div key={r.title} className="bg-background p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-[13.5px] font-medium">{r.title}</h3>
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                    {r.eta}
                  </span>
                </div>
                <p className="text-[12.5px] text-muted-foreground leading-[1.6]">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
          <Link
            to="/blog"
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            Read engineering deep-dives
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
