import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2, Lock, Loader2, ExternalLink, Minus, Plus } from "lucide-react";
import { StripeIcon } from "@/components/icons/StripeIcon";
import { recordSubscription, type SubTier } from "@/integrations/supabase/subscriptions";

type Tier = {
  key: string;
  name: string;
  price: string;
  cadence?: string;
  blurb: string;
};

const PERIODS: { key: "monthly" | "annual"; label: string; multiplier: number; note: string }[] = [
  { key: "monthly", label: "Monthly", multiplier: 1,  note: "Cancel anytime" },
  { key: "annual",  label: "Annual",  multiplier: 10, note: "2 months free" },
];

function parseBasePrice(price: string): number | null {
  const m = price.match(/\$?([\d.,]+)/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function getStripeBuyUrl(tierKey: string): string | null {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[`VITE_STRIPE_BUY_URL_${tierKey.toUpperCase()}`] ?? null;
}

export function StripeCheckout({
  open,
  onOpenChange,
  tier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tier: Tier | null;
}) {
  const { toast } = useToast();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [seats, setSeats] = useState(1);
  const [email, setEmail] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [done, setDone] = useState(false);

  const basePrice = useMemo(() => (tier ? parseBasePrice(tier.price) : null), [tier]);
  const total = useMemo(() => {
    if (basePrice === null) return null;
    const periodMult = PERIODS.find(p => p.key === period)!.multiplier;
    const seatMult = tier?.key === "team" ? Math.max(1, seats) : 1;
    return basePrice * periodMult * seatMult;
  }, [basePrice, period, seats, tier]);

  useEffect(() => {
    if (!open) {
      setDone(false);
      setRedirecting(false);
    }
  }, [open]);

  if (!tier) return null;
  const requiresQuote = basePrice === null;
  const buyUrl = getStripeBuyUrl(tier.key);

  const continueToStripe = async () => {
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      toast({
        title: "Email required",
        description: "We'll send your receipt and license key here.",
        variant: "destructive",
      });
      return;
    }
    setRedirecting(true);
    try {
      if (buyUrl) {
        const u = new URL(buyUrl);
        u.searchParams.set("prefilled_email", email);
        if (tier.key === "team") u.searchParams.set("quantity", String(seats));
        window.open(u.toString(), "_blank", "noopener,noreferrer");

        // Record an *intent* in Supabase. A real Stripe webhook would later flip
        // status from "incomplete" to "active"; for now we trust the redirect.
        if (total !== null) {
          await recordSubscription({
            tier: tier.key as SubTier,
            billingPeriod: period,
            seats: tier.key === "team" ? seats : 1,
            amountCents: Math.round(total * 100),
            paymentMethod: "stripe",
            paymentProviderId: null,
            status: "incomplete",
            metadata: { email, buy_url_host: u.host },
          });
        }

        setDone(true);
        toast({
          title: "Stripe checkout opened",
          description: "Complete your payment in the new tab.",
        });
      } else {
        toast({
          title: "Stripe not configured",
          description: `Set VITE_STRIPE_BUY_URL_${tier.key.toUpperCase()} to enable card payments for this tier.`,
          variant: "destructive",
        });
      }
    } finally {
      setRedirecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[440px] p-0 overflow-hidden border-border gap-0 rounded-md">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/20">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[15px] font-medium tracking-[-0.01em] flex items-center gap-2">
              <StripeIcon className="h-4 w-4" />
              Pay with card
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground leading-[1.5]">
              Secure card checkout via Stripe.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="max-h-[calc(85vh-140px)] overflow-y-auto">
          {requiresQuote ? (
            <div className="p-5 text-[13px] text-muted-foreground leading-[1.65]">
              <p>
                <strong className="text-foreground">{tier.name}</strong> is priced per
                deployment. Email{" "}
                <a
                  href="mailto:sales@talak-web3.dev"
                  className="underline hover:text-foreground"
                >
                  sales@talak-web3.dev
                </a>{" "}
                and we'll send a custom Stripe invoice.
              </p>
            </div>
          ) : done ? (
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center bg-foreground/5 border border-border">
                <CheckCircle2 className="h-6 w-6 text-foreground/70" />
              </div>
              <div>
                <h3 className="text-[16px] font-medium tracking-[-0.01em]">Stripe checkout opened</h3>
                <p className="mt-1.5 text-[12.5px] text-muted-foreground leading-[1.65]">
                  Finish your payment in the Stripe tab. Your <strong className="text-foreground">{tier.name}</strong> plan activates the moment Stripe confirms.
                </p>
              </div>
              {buyUrl && (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] underline text-muted-foreground hover:text-foreground"
                >
                  Re-open checkout <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Plan summary */}
              <div className="rounded-md border border-border p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Plan</p>
                  <p className="text-[14px] font-medium mt-0.5 truncate">{tier.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[18px] font-[500] tracking-[-0.02em] tabular-nums">
                    ${total!.toLocaleString()}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {period === "annual" ? "/ year" : "/ month"}
                  </p>
                </div>
              </div>

              {/* Period */}
              <Field label="Billing period">
                <div className="grid grid-cols-2 gap-1.5">
                  {PERIODS.map(p => {
                    const active = period === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setPeriod(p.key)}
                        className={`rounded-md border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-foreground bg-foreground/5"
                            : "border-border hover:border-foreground/40"
                        }`}
                      >
                        <p className="text-[12.5px] font-medium">{p.label}</p>
                        <p className="text-[10.5px] text-muted-foreground mt-0.5">{p.note}</p>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Seats */}
              {tier.key === "team" && (
                <Field label="Seats">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 p-0 shrink-0"
                      onClick={() => setSeats(s => Math.max(1, s - 1))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={seats}
                      onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
                      className="h-9 flex-1 text-center text-[13px] tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 p-0 shrink-0"
                      onClick={() => setSeats(s => s + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-1.5 tabular-nums">
                    × ${basePrice} / seat / mo
                  </p>
                </Field>
              )}

              {/* Email */}
              <Field label="Email for receipt">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-[13px]"
                />
              </Field>

              <div className="flex items-start gap-2 text-[11px] leading-[1.6] rounded-md border border-border p-2.5 bg-muted/20">
                <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground/60" />
                <span className="text-muted-foreground">
                  Stripe handles all card data. talak-web3 only stores your subscription state.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!requiresQuote && !done && (
          <div className="px-5 py-4 border-t border-border bg-background space-y-2">
            <Button
              type="button"
              onClick={continueToStripe}
              disabled={redirecting}
              className="w-full h-10 text-[13px] gap-2"
            >
              {redirecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <StripeIcon className="h-4 w-4" />
              )}
              Continue to Stripe
              <ArrowRight className="h-4 w-4" />
            </Button>
            {!buyUrl && (
              <p className="text-[10px] text-muted-foreground text-center font-mono">
                Set VITE_STRIPE_BUY_URL_{tier.key.toUpperCase()} to enable.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
