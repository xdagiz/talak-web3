import { Link, useParams } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getStepConfig } from "@/data/step-config";

type TierKey = "hobby" | "team" | "scale" | "enterprise";

function isTierKey(value: string | undefined): value is TierKey {
  return value === "hobby" || value === "team" || value === "scale" || value === "enterprise";
}

export default function PricingSteps() {
  const { tier } = useParams<{ tier: string }>();
  const selected = isTierKey(tier) ? getStepConfig(tier) : null;

  if (!selected) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PublicNav />
        <main className="mx-auto max-w-[900px] px-6 py-16">
          <h1 className="text-[26px] font-medium tracking-[-0.02em]">Pricing plan not found</h1>
          <p className="mt-3 text-muted-foreground">Pick a valid plan to view onboarding steps.</p>
          <Link to="/pricing" className="mt-6 inline-flex items-center gap-2 text-sm underline">
            <ArrowLeft className="h-4 w-4" />
            Back to pricing
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const ctaIsExternal = selected.ctaHref.startsWith("mailto:");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="mx-auto max-w-[900px] px-6 py-16">
        <Link to="/pricing" className="inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to pricing
        </Link>

        <header className="mt-6">
          <h1 className="text-[30px] font-[500] tracking-[-0.03em]">{selected.title}</h1>
          <p className="mt-3 text-[14px] text-muted-foreground leading-[1.7]">{selected.subtitle}</p>
        </header>

        <section className="mt-8 border border-border rounded-md overflow-hidden">
          <ol className="divide-y divide-border">
            {selected.steps.map((step, idx) => (
              <li key={step.title} className="p-4 flex items-start gap-3">
                <span className="h-6 w-6 rounded-full border border-border inline-flex items-center justify-center text-[11px] font-mono">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <Link 
                    to={`/pricing/${tier}/step/${idx + 1}`}
                    className="text-[14px] font-medium inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Check className="h-3.5 w-3.5 text-success" />
                    {step.title}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <p className="mt-1 text-[12.5px] text-muted-foreground leading-[1.7]">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {ctaIsExternal ? (
          <a href={selected.ctaHref} className="mt-8 inline-flex items-center gap-2 h-10 px-4 bg-foreground text-background text-[13px]">
            {selected.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </a>
        ) : (
          <Link to={selected.ctaHref} className="mt-8 inline-flex items-center gap-2 h-10 px-4 bg-foreground text-background text-[13px]">
            {selected.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </main>
      <Footer />
    </div>
  );
}
