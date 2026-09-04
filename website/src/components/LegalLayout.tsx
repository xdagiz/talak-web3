import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ChevronRight } from "lucide-react";

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/legal/terms"          },
  { label: "Privacy Policy",   href: "/legal/privacy"        },
  { label: "Security",         href: "/legal/security"       },
  { label: "Cookie Policy",    href: "/legal/cookies"        },
  { label: "Acceptable Use",   href: "/legal/acceptable-use" },
];

export function LegalLayout({
  title,
  effectiveDate,
  intro,
  children,
}: {
  title: string;
  effectiveDate: string;
  intro: string;
  /**
   * @deprecated Kept for backward compatibility — accent colors were removed
   * from the legal pages for a calmer, document-first reading experience.
   */
  accent?: string;
  children: ReactNode;
}) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNav />

      <main className="flex-1 mx-auto w-full max-w-[1100px] px-6 py-12">
        <nav className="mb-8 flex items-center gap-1.5 text-[12px] text-muted-foreground font-mono">
          <Link to="/" className="hover:text-foreground">home</Link>
          <ChevronRight className="h-3 w-3" />
          <span>legal</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{title.toLowerCase()}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <p className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-muted-foreground mb-3">
              Legal
            </p>
            <ul className="space-y-1">
              {LEGAL_LINKS.map(l => {
                const active = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      to={l.href}
                      className={
                        "flex items-center justify-between gap-2 px-2.5 py-2 rounded-sm text-[12.5px] border transition-colors " +
                        (active
                          ? "border-border bg-muted/40 text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")
                      }
                    >
                      <span>{l.label}</span>
                      <ChevronRight
                        className={
                          "h-3 w-3 transition-opacity " +
                          (active ? "opacity-100" : "opacity-30")
                        }
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 rounded-md border border-border p-3 text-[11.5px] leading-[1.6] text-muted-foreground">
              Questions? Email{" "}
              <a href="mailto:legal@talak-web3.dev" className="underline text-foreground">
                legal@talak-web3.dev
              </a>.
            </div>
          </aside>

          <article>
            <div className="border-l-2 border-border pl-4 mb-6">
              <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
                Effective {effectiveDate}
              </p>
              <h1 className="mt-1.5 text-[clamp(1.8rem,3.5vw,2.6rem)] font-[500] tracking-[-0.025em] leading-[1.1]">
                {title}
              </h1>
              <p className="mt-3 text-[14px] text-muted-foreground leading-[1.75] max-w-[760px]">
                {intro}
              </p>
            </div>

            <div
              className="prose prose-invert max-w-none
                         prose-headings:font-medium prose-headings:tracking-[-0.02em]
                         prose-h2:text-[20px] prose-h2:mt-10 prose-h2:mb-3
                         prose-h3:text-[15.5px] prose-h3:mt-6 prose-h3:mb-2
                         prose-p:text-[13.5px] prose-p:leading-[1.75] prose-p:text-foreground/80
                         prose-li:text-[13.5px] prose-li:leading-[1.7] prose-li:text-foreground/80
                         prose-strong:text-foreground prose-strong:font-medium
                         prose-a:text-foreground prose-a:underline prose-a:underline-offset-2
                         prose-th:text-[12.5px] prose-td:text-[12.5px]"
            >
              {children}
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
