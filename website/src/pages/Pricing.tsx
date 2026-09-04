import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CryptoCheckout } from "@/components/CryptoCheckout";
import { StripeCheckout } from "@/components/StripeCheckout";
import { StripeIcon } from "@/components/icons/StripeIcon";
import { MetaMaskLogo } from "@/components/WalletLogos";
import { 
  getPricingTiers, 
  getFAQ, 
  getPricingTier, 
  calculatePrice,
  getTierLimits,
  getTierSupport,
  getTierInfrastructure,
  type PricingTier 
} from "@/data/pricing-config";

type Tier = PricingTier;

const TIERS = getPricingTiers();
const FAQ = getFAQ();

export default function Pricing() {
  const [openCryptoTier, setOpenCryptoTier] = useState<Tier | null>(null);
  const [openStripeTier, setOpenStripeTier] = useState<Tier | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="mx-auto max-w-[1200px] px-6 py-16">
        {/* Header */}
        <header className="text-center max-w-[680px] mx-auto mb-12">
          <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
            Pricing
          </span>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-[500] tracking-[-0.03em] leading-[1.1]">
            Simple plans. No surprises.
          </h1>
          <p className="mt-4 text-[15px] text-muted-foreground leading-[1.7]">
            Start free, upgrade when your project ships. Pay by card or stablecoin — whichever fits your stack.
          </p>
        </header>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
          {TIERS.map(t => (
            <div
              key={t.key}
              className={cn(
                "bg-background p-6 flex flex-col",
                t.highlight && "ring-1 ring-foreground/20"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-[14px] font-medium">{t.name}</h3>
                {t.highlight && (
                  <span className="text-[10px] uppercase tracking-[0.12em] font-mono px-1.5 py-0.5 border border-foreground/30 rounded-sm">
                    popular
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-muted-foreground min-h-[36px] leading-[1.5]">{t.blurb}</p>
              <div className="mt-4 mb-5">
                <span className="text-[28px] font-[500] tracking-[-0.02em]">{t.price}</span>
                {t.cadence && (
                  <span className="text-[12.5px] text-muted-foreground ml-1">{t.cadence}</span>
                )}
              </div>

              {t.primaryCta.href.startsWith("mailto:") ? (
                <a
                  href={t.primaryCta.href}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 h-9 text-[12.5px] border transition-colors",
                    t.highlight
                      ? "bg-foreground text-background border-foreground hover:bg-foreground/90"
                      : "border-border text-foreground hover:border-foreground/60"
                  )}
                >
                  {t.primaryCta.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link
                  to={t.primaryCta.href}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 h-9 text-[12.5px] border transition-colors",
                    t.highlight
                      ? "bg-foreground text-background border-foreground hover:bg-foreground/90"
                      : "border-border text-foreground hover:border-foreground/60"
                  )}
                >
                  {t.primaryCta.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}

              <Link
                to={`/pricing/${t.key}/step/1`}
                className="mt-2 inline-flex items-center justify-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
              >
                View setup steps
                <ArrowRight className="h-3 w-3" />
              </Link>

              {t.payable && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
                    or pay
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenCryptoTier(t)}
                    aria-label="Pay with crypto wallet (MetaMask, Rabby, Coinbase, …)"
                    title="Pay with crypto wallet"
                    className="h-8 w-8 inline-flex items-center justify-center border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
                  >
                    <MetaMaskLogo className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenStripeTier(t)}
                    aria-label="Pay with card via Stripe"
                    title="Pay with card via Stripe"
                    className="h-8 w-8 inline-flex items-center justify-center border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
                  >
                    <StripeIcon className="h-4 w-4" />
                  </button>
                </div>
              )}

              <ul className="mt-5 space-y-2 flex-1">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground/60" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compare */}
        <section className="mt-20">
          <h2 className="text-[20px] font-[500] tracking-[-0.02em] mb-6">
            Compare features
          </h2>
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Feature</th>
                  {TIERS.map(t => (
                    <th key={t.key} className="text-left px-3 py-2 font-medium">
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: "RPC calls",
                    getValue: (tier: PricingTier) => getTierLimits(tier.key)?.rpcCalls || "—"
                  },
                  {
                    feature: "Projects",
                    getValue: (tier: PricingTier) => getTierLimits(tier.key)?.projects || "—"
                  },
                  {
                    feature: "Webhooks",
                    getValue: (tier: PricingTier) => tier.features.some(f => f.includes("webhook")) ? "✓" : "—"
                  },
                  {
                    feature: "Support",
                    getValue: (tier: PricingTier) => getTierSupport(tier.key)?.type || "—"
                  },
                  {
                    feature: "Event retention",
                    getValue: (tier: PricingTier) => getTierLimits(tier.key)?.retention || "—"
                  },
                  {
                    feature: "Infrastructure",
                    getValue: (tier: PricingTier) => getTierInfrastructure(tier.key)?.nodes || "—"
                  },
                  {
                    feature: "Payment methods",
                    getValue: (tier: PricingTier) => tier.payable ? "Card / Crypto" : "—"
                  },
                  {
                    feature: "Response time",
                    getValue: (tier: PricingTier) => getTierSupport(tier.key)?.responseTime || "—"
                  }
                ].map(({ feature, getValue }) => (
                  <tr key={feature} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{feature}</td>
                    {TIERS.map(tier => (
                      <td key={tier.key} className="px-3 py-2 text-muted-foreground">
                        {getValue(tier)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20 max-w-[820px]">
          <h2 className="text-[20px] font-[500] tracking-[-0.02em] mb-6">
            Frequently asked
          </h2>
          <div className="space-y-3">
            {FAQ.map(item => (
              <details key={item.q} className="group border border-border rounded-md p-4 open:bg-card/30">
                <summary className="cursor-pointer list-none flex items-center justify-between text-[13.5px] font-medium">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45 text-[18px] leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[12.5px] text-muted-foreground leading-[1.7]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      <CryptoCheckout
        open={!!openCryptoTier}
        onOpenChange={(v) => { if (!v) setOpenCryptoTier(null); }}
        tier={openCryptoTier}
      />
      <StripeCheckout
        open={!!openStripeTier}
        onOpenChange={(v) => { if (!v) setOpenStripeTier(null); }}
        tier={openStripeTier}
      />
    </div>
  );
}
