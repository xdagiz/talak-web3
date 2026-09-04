import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { TerminalInstall } from "@/components/TerminalInstall";
import { BookOpen, Compass, ArrowRight } from "lucide-react";
import { DOC_SECTIONS } from "@/data/docs";

export default function Docs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="mx-auto max-w-[1200px] px-6 py-12 grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-10">
        {/* Side nav */}
        <aside className="hidden md:block sticky top-20 self-start">
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3">
            Docs
          </p>
          <ul className="space-y-1.5">
            {DOC_SECTIONS.map((s) => (
              <li key={s.slug}>
                <Link
                  to={`/docs/${s.slug}`}
                  className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors block py-0.5"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <article className="space-y-10 min-w-0">
          <header>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3">
              <BookOpen className="h-3.5 w-3.5" /> Documentation
            </div>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-[500] tracking-[-0.03em] leading-[1.1]">
              Build a Web3 app in one afternoon.
            </h1>
            <p className="mt-4 text-[15px] text-muted-foreground max-w-[640px] leading-[1.7]">
              talak-web3 is a single SDK for sign-in with Ethereum, RPC failover, transaction orchestration,
              identity, and dashboard analytics. Pick a topic below — each is a focused page you can read in a minute.
            </p>
            <div className="mt-6">
              <TerminalInstall />
            </div>
          </header>

          {/* Section index */}
          <section>
            <h2 className="text-[16px] font-medium mb-3">All sections</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
              {DOC_SECTIONS.map((s) => (
                <li key={s.slug} className="bg-background">
                  <Link
                    to={`/docs/${s.slug}`}
                    className="block p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <h3 className="text-[14px] font-medium group-hover:text-foreground">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-[12.5px] text-muted-foreground leading-[1.6]">
                      {s.blurb}
                    </p>
                    <p className="mt-2 text-[11.5px] text-muted-foreground inline-flex items-center gap-1">
                      Open
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-border rounded-md p-6 bg-card/30">
            <div className="flex items-start gap-3">
              <Compass className="h-4 w-4 text-foreground mt-0.5" />
              <div className="flex-1">
                <h3 className="text-[14px] font-medium mb-1">Stuck somewhere?</h3>
                <p className="text-[12.5px] text-muted-foreground mb-3 leading-relaxed">
                  Pop into our Discord, drop a message in Telegram, or open an issue on GitHub. We answer fast.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://discord.gg/talak-web3"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] border border-border px-3 py-1.5 hover:border-foreground/40 transition-colors"
                  >
                    Discord
                  </a>
                  <a
                    href="https://t.me/talakweb3"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] border border-border px-3 py-1.5 hover:border-foreground/40 transition-colors"
                  >
                    Telegram
                  </a>
                  <a
                    href="https://github.com/dagimabebe/talak-web3"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] border border-border px-3 py-1.5 hover:border-foreground/40 transition-colors"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
