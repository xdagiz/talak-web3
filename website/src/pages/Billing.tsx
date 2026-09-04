import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt, CreditCard, AlertTriangle, ArrowRight, Wallet, ExternalLink, Check,
  CalendarClock, Download,
} from "lucide-react";
import {
  cancelMySubscription,
  getMySubscription,
  type SubscriptionRow,
} from "@/integrations/supabase/subscriptions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
type BillingRow = {
  id: string;
  amount_cents: number;
  currency: string;
  payment_method: string;
  status: string;
  description: string | null;
  invoice_url: string | null;
  created_at: string;
};

const TIER_LABEL: Record<string, string> = {
  hobby:      "Hobby",
  team:       "Team",
  scale:      "Scale",
  enterprise: "Enterprise",
};

const STATUS_TONE: Record<string, string> = {
  active:     "text-emerald-500",
  trialing:   "text-amber-500",
  past_due:   "text-red-500",
  canceled:   "text-muted-foreground",
  incomplete: "text-amber-500",
  succeeded:  "text-emerald-500",
  pending:    "text-amber-500",
  failed:     "text-red-500",
  refunded:   "text-muted-foreground",
};

function fmtMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function Billing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [history, setHistory] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [current, hist] = await Promise.all([
      getMySubscription(),
      supabase
        .from("billing_history")
        .select("id,amount_cents,currency,payment_method,status,description,invoice_url,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setSub(current);
    console.warn("[billing] viewing user.id", user?.id, "sub", current);
    if (hist.error) {
      toast({
        title: "Billing history unavailable",
        description: hist.error.message,
        variant: "destructive",
      });
      setHistory([]);
    } else {
      const rows = hist.data;
      setHistory(rows ?? []);
    }
    if (!hist.data && !hist.error) {
      setHistory([]);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  // Live update: poll the current subscription so a newly admin-granted active
  // row shows up in the billing profile and fires a popup — no reload needed and
  // independent of whether realtime is enabled on `subscriptions`.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    let isFirst = true;
    const prevIdRef: { current: string | null } = { current: null };

    const poll = async () => {
      const cur = await getMySubscription().catch(() => null);
      if (!alive) return;
      const isNewGrant =
        !isFirst &&
        !!cur &&
        (cur.metadata as Record<string, unknown> | null)?.admin_granted === true &&
        cur.id !== prevIdRef.current;
      prevIdRef.current = cur?.id ?? null;
      isFirst = false;
      if (isNewGrant) {
        toast({
          title: `You're now on the ${TIER_LABEL[cur?.tier ?? ""] ?? cur?.tier} plan`,
          description: "An admin upgraded your account. Your new billing profile is active.",
        });
      }
      setSub(cur);
    };

    void poll();
    const t = setInterval(() => void poll(), 15_000);
    return () => { alive = false; clearInterval(t); };
  }, [user?.id]);

  async function handleCancel() {
    if (!sub) return;
    if (!confirm("Cancel your subscription at the end of the current period?")) return;
    setBusy(true);
    const ok = await cancelMySubscription();
    setBusy(false);
    if (ok) {
      toast({ title: "Subscription canceled", description: "Access continues until the end of your billing period." });
      void load();
    } else {
      toast({
        title: "Couldn't cancel",
        description: "Something went wrong. Try again or contact support.",
        variant: "destructive",
      });
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[980px] px-6 py-10 space-y-10">
        {/* Header */}
        <header>
          <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-muted-foreground inline-flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5" /> Billing
          </p>
          <h1 className="mt-2 text-[28px] font-[500] tracking-[-0.02em]">Plan &amp; payments</h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground max-w-[640px] leading-[1.7]">
            Manage your subscription, view past charges, and download invoices.
          </p>
        </header>

        {/* Current plan card */}
        <section className="border border-border rounded-md overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 bg-muted/20">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
                Current plan
              </p>
              <h2 className="mt-1 text-[18px] font-[500] tracking-[-0.01em]">
                {loading ? "Loading…" : sub ? TIER_LABEL[sub.tier] ?? sub.tier : "Hobby (Free)"}
              </h2>
            </div>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[12.5px] bg-foreground text-background hover:bg-foreground/90 rounded-sm transition-colors"
            >
              {sub ? "Change plan" : "Upgrade"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {sub ? (
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
              <Field label="Status">
                <span className={STATUS_TONE[sub.status] ?? ""}>
                  {sub.status}
                </span>
                {sub.cancel_at_period_end && (
                  <span className="ml-2 text-[10.5px] uppercase tracking-[0.14em] font-mono text-amber-500">
                    canceling
                  </span>
                )}
              </Field>
              <Field label="Billing">
                <span className="capitalize">{sub.billing_period}</span>
              </Field>
              <Field label="Amount">
                <span className="font-mono">{fmtMoney(sub.amount_cents, sub.currency)}</span>
                <span className="text-muted-foreground"> / {sub.billing_period === "annual" ? "yr" : sub.billing_period === "monthly" ? "mo" : "once"}</span>
              </Field>
              <Field label="Renews">
                <span className="font-mono">{fmtDate(sub.current_period_end)}</span>
              </Field>
            </div>
          ) : (
            <div className="px-5 py-6 text-[13px] text-muted-foreground">
              You're on the <span className="text-foreground">free Hobby plan</span> — 5K calls/day, 1 project,
              SIWE auth, 30-day retention.{" "}
              <Link to="/pricing" className="underline underline-offset-2 hover:text-foreground">
                See paid plans →
              </Link>
            </div>
          )}

          {sub && !sub.cancel_at_period_end && (
            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-4">
              <p className="text-[12.5px] text-muted-foreground inline-flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5" /> Cancel anytime — keep access through the current period.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={busy}
                className="text-[12px] text-red-500 hover:text-red-400 h-8"
              >
                Cancel subscription
              </Button>
            </div>
          )}
        </section>

        {/* Payment method strip */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
          <Method
            Icon={CreditCard}
            title="Card via Stripe"
            body="Industry-standard PCI-DSS pipeline. Auto-renew, prorated upgrades."
            cta="Update card"
            to="/pricing"
            active={sub?.payment_method === "stripe"}
          />
          <Method
            Icon={Wallet}
            title="Crypto stablecoin"
            body="USDC / USDT on Ethereum, Base, Arbitrum, Polygon, Optimism."
            cta="Top up"
            to="/pricing"
            active={sub?.payment_method === "crypto"}
          />
        </section>

        {/* History */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[18px] font-[500] tracking-[-0.02em]">Payment history</h2>
            <span className="text-[11.5px] text-muted-foreground font-mono">{history.length} entries</span>
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Date</th>
                  <th className="text-left font-medium px-3 py-2">Description</th>
                  <th className="text-left font-medium px-3 py-2">Method</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-right font-medium px-3 py-2">Amount</th>
                  <th className="text-right font-medium px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!loading && history.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No payments yet — once you upgrade, charges will land here.
                  </td></tr>
                )}
                {history.map(row => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-[12px]">{fmtDate(row.created_at)}</td>
                    <td className="px-3 py-2">{row.description ?? "Subscription"}</td>
                    <td className="px-3 py-2 capitalize text-muted-foreground">{row.payment_method}</td>
                    <td className={`px-3 py-2 capitalize ${STATUS_TONE[row.status] ?? ""}`}>
                      {row.status === "succeeded" ? <Check className="h-3.5 w-3.5 inline -mt-0.5" /> : null}{" "}
                      {row.status}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {fmtMoney(row.amount_cents, row.currency)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {row.invoice_url ? (
                        <a
                          href={row.invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground inline-flex"
                          aria-label="Open invoice"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer help */}
        <section className="border-t border-border pt-6 flex items-start gap-3 text-[13px] text-muted-foreground">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-foreground/60 shrink-0" />
          <p className="leading-[1.7]">
            Need a custom contract, EU/UK invoice format, or wire transfer?{" "}
            <a href="mailto:billing@talak-web3.dev" className="underline underline-offset-2 hover:text-foreground">
              billing@talak-web3.dev
            </a>{" "}
            <ExternalLink className="h-3 w-3 inline -mt-0.5" />
          </p>
        </section>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[14px]">{children}</p>
    </div>
  );
}

function Method({
  Icon, title, body, cta, to, active,
}: {
  Icon: typeof CreditCard;
  title: string;
  body: string;
  cta: string;
  to: string;
  active?: boolean;
}) {
  return (
    <div className="bg-background p-5">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-foreground/60" />
        {active && (
          <span className="text-[10px] uppercase tracking-[0.14em] font-mono px-1.5 py-0.5 border border-emerald-500/40 text-emerald-500 rounded-sm">
            Active
          </span>
        )}
      </div>
      <h3 className="mt-3 text-[13.5px] font-medium tracking-[-0.01em]">{title}</h3>
      <p className="mt-1 text-[12.5px] text-muted-foreground leading-[1.65]">{body}</p>
      <Link
        to={to}
        className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-foreground hover:underline underline-offset-2"
      >
        {cta} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
