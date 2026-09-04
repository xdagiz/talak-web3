import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Compass } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNav />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-[480px]">
          <div
            className="mx-auto mb-6 h-14 w-14 rounded-md border flex items-center justify-center"
            style={{ borderColor: "var(--brand-coral)", color: "var(--brand-coral)" }}
          >
            <Compass className="h-6 w-6" />
          </div>
          <p
            className="text-[11px] uppercase tracking-[0.18em] font-mono mb-3"
            style={{ color: "var(--brand-coral)" }}
          >
            404 · page not found
          </p>
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-[500] tracking-[-0.02em] leading-[1.1]">
            We can't find{" "}
            <span className="font-mono text-[0.8em] px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">
              {location.pathname}
            </span>
          </h1>
          <p className="mt-4 text-[14px] text-muted-foreground leading-[1.7]">
            The link may be broken, or the page may have moved. Try heading back home or browse the docs.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] border rounded-sm hover:text-foreground transition-colors"
              style={{ borderColor: "var(--brand-cyan)", color: "var(--brand-cyan)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              Browse the docs
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
