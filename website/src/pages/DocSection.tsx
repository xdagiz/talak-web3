import { Link, Navigate, useParams } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { CodeBlock } from "@/components/CodeBlock";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { DOC_SECTIONS, getDocSection } from "@/data/docs";

export default function DocSectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const section = slug ? getDocSection(slug) : undefined;
  if (!section) return <Navigate to="/docs" replace />;

  const idx = DOC_SECTIONS.findIndex((s) => s.slug === section.slug);
  const prev = idx > 0 ? DOC_SECTIONS[idx - 1] : undefined;
  const next = idx < DOC_SECTIONS.length - 1 ? DOC_SECTIONS[idx + 1] : undefined;

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
                  className={`text-[12.5px] block py-0.5 transition-colors ${
                    s.slug === section.slug
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <article className="min-w-0">
          <Link
            to="/docs"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All docs
          </Link>

          <header className="mb-8">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-3">
              <BookOpen className="h-3.5 w-3.5" /> Documentation
            </div>
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-[500] tracking-[-0.03em] leading-[1.1]">
              {section.title}
            </h1>
            <p className="mt-3 text-[14px] text-muted-foreground max-w-[680px] leading-[1.75]">
              {section.blurb}
            </p>
          </header>

          <div className="prose prose-invert max-w-none">
            <p className="text-[14px] text-foreground/85 leading-[1.8] mb-6">
              {section.body}
            </p>
          </div>

          {section.code && (
            <div className="mb-8">
              <CodeBlock
                filename={section.code.filename}
                language={section.code.language}
                code={section.code.code}
              />
            </div>
          )}

          {section.links && section.links.length > 0 && (
            <section className="mb-10">
              <h2 className="text-[14px] font-medium mb-3">Related</h2>
              <ul className="space-y-2">
                {section.links.map((l) => {
                  const isExternal = l.href.startsWith("http");
                  return (
                    <li key={l.href}>
                      {isExternal ? (
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-between border border-border p-3 rounded-md hover:bg-muted/30 transition-colors"
                        >
                          <span className="text-[13px]">{l.label}</span>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                        </a>
                      ) : (
                        <Link
                          to={l.href}
                          className="group flex items-center justify-between border border-border p-3 rounded-md hover:bg-muted/30 transition-colors"
                        >
                          <span className="text-[13px]">{l.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Prev / next */}
          <nav className="border-t border-border mt-12 pt-6 grid grid-cols-2 gap-3">
            {prev ? (
              <Link
                to={`/docs/${prev.slug}`}
                className="border border-border rounded-md p-4 hover:bg-muted/30 transition-colors group"
              >
                <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground inline-flex items-center gap-1.5">
                  <ArrowLeft className="h-3 w-3" /> Previous
                </p>
                <p className="mt-1 text-[13.5px] font-medium group-hover:text-foreground">
                  {prev.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                to={`/docs/${next.slug}`}
                className="border border-border rounded-md p-4 hover:bg-muted/30 transition-colors group text-right"
              >
                <p className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground inline-flex items-center gap-1.5 justify-end w-full">
                  Next <ArrowRight className="h-3 w-3" />
                </p>
                <p className="mt-1 text-[13.5px] font-medium group-hover:text-foreground">
                  {next.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </article>
      </main>
      <Footer />
    </div>
  );
}
