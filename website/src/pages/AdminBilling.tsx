import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, BadgeCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { SubscriptionRow } from "@/integrations/supabase/subscriptions";

const TIER_LABEL: Record<string, string> = {
  hobby: "Hobby", team: "Team", scale: "Scale", enterprise: "Enterprise",
};
const TIERS = ["team", "scale", "enterprise"];

const STATUS_TONE: Record<string, string> = {
  active: "text-emerald-500",
  trialing: "text-amber-500",
  past_due: "text-red-500",
  canceled: "text-muted-foreground",
  incomplete: "text-amber-500",
};

type Profile = { id: string; user_id: string; full_name: string | null };

export default function AdminBilling() {
  const { toast } = useToast();
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantTier, setGrantTier] = useState<string>("team");

  const load = async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id,user_id,full_name").order("full_name"),
    ]);
    setSubs((s.data as SubscriptionRow[]) ?? []);
    setProfiles((p.data as Profile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Billing · admin";
    load();
    const ch = supabase
      .channel("admin-billing")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const isGrant = (sub: SubscriptionRow) => {
    const md = (sub.metadata ?? {}) as Record<string, unknown>;
    return md.admin_granted === true;
  };

  const payingById = new Set(
    subs
      .filter(s => s.tier !== "hobby" && (s.status === "active" || s.status === "trialing"))
      .map(s => s.user_id),
  );
  const nameById = new Map(profiles.map(p => [p.user_id, p.full_name]));

  const grantPlan = async () => {
    if (!grantUserId) { toast({ title: "Select a user", variant: "destructive" }); return; }
    setGranting(true);
    try {
      // Preferred path: atomic `admin_grant_plan` RPC (cancel + insert in one
      // transaction, security definer → no RLS/unique-index collision).
      // The RPC may THROW (e.g. "Cannot read properties of undefined (reading
      // 'rest')") when the function isn't deployed yet, so guard the call and
      // fall back to the two-step client write on any RPC failure.
      let rpcGranted = false;
      try {
        const res = await (supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message?: string } | null }>)(
          "admin_grant_plan",
          { p_user_id: grantUserId, p_tier: grantTier },
        );
        if (res && !res.error) rpcGranted = true;
      } catch {
        rpcGranted = false;
      }

      if (rpcGranted) {
        toast({ title: `${TIER_LABEL[grantTier] ?? grantTier} granted` });
        setGrantUserId(""); setGrantTier("team");
        void load();
        return;
      }

      const now = new Date();
      const end = new Date(); end.setFullYear(end.getFullYear() + 1);

      const { error: cancelError, data: cancelled } = await supabase
        .from("subscriptions")
        .update({ status: "canceled", cancel_at_period_end: true })
        .eq("user_id", grantUserId)
        .in("status", ["active", "trialing"])
        .select("id");
      if (cancelError) throw cancelError;

      const { error: insertError } = await supabase.from("subscriptions").insert({
        user_id: grantUserId,
        tier: grantTier,
        status: "active",
        billing_period: "annual",
        seats: 1,
        amount_cents: 0,
        currency: "usd",
        payment_method: "stripe",
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: false,
        metadata: { admin_granted: true, granted_at: now.toISOString() },
      });
      if (insertError) {
        // The old active row apparently wasn't cleared (RLS/Cancel missed it).
        throw new Error(
          (cancelled ?? []).length === 0
            ? `No active subscription was cancelled for this user — the insert collided with the one-active-per-user constraint. ${insertError.message}`
            : insertError.message,
        );
      }
      toast({ title: `${TIER_LABEL[grantTier] ?? grantTier} granted` });
      setGrantUserId(""); setGrantTier("team");
      void load();
    } catch (err) {
      const msg = (err && typeof err === "object" && "message" in err)
        ? String((err as { message?: unknown }).message ?? err)
        : String(err);
      toast({
        title: "Could not grant plan",
        description: msg || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGranting(false);
    }
  };

  const revokeGrant = async (id: string) => {
    setRevoking(id);
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled", cancel_at_period_end: true })
      .eq("id", id);
    if (error) toast({ title: "Could not revoke", description: error.message, variant: "destructive" });
    else toast({ title: "Grant revoked" });
    setRevoking(null);
    void load();
  };

  return (
    <AdminLayout title="Billing">
      <div className="p-4 md:p-6 space-y-6 max-w-[1100px]">
        {/* Override panel */}
        <section className="border border-border rounded-md overflow-hidden">
          <header className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-foreground/60" />
            <h2 className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Grant a plan (no charge)
            </h2>
          </header>
          <div className="p-4 space-y-4">
            <p className="text-[12.5px] text-muted-foreground">
              Upgrade a user to a paid tier at no cost. The subscription is marked as
              <code className="font-mono text-[11px]"> admin_granted</code> and billed at $0.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono">User</span>
                <select
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value)}
                  className="w-full h-9 text-[13px] px-2 bg-background border border-input rounded-md"
                >
                  <option value="">Select user…</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.user_id}>
                      {(p.full_name || "(no name)") + (payingById.has(p.user_id) ? " ✓" : "")} — {p.user_id.slice(0, 8)}…
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono">Plan</span>
                <select
                  value={grantTier}
                  onChange={e => setGrantTier(e.target.value)}
                  className="w-full h-9 text-[13px] px-2 bg-background border border-input rounded-md"
                >
                  {TIERS.map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                </select>
              </label>
              <div className="flex items-end">
                <Button onClick={grantPlan} disabled={granting || !grantUserId} className="h-9 w-full text-[12px] gap-1.5">
                  {granting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  Grant {grantTier ? TIER_LABEL[grantTier] : ""}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Subscriptions table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-[500] tracking-[-0.02em]">Subscriptions</h2>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={load}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : subs.length === 0 ? (
            <div className="border border-border rounded-md p-10 text-center text-[13px] text-muted-foreground">No subscriptions yet.</div>
          ) : (
            <div className="border border-border rounded-md overflow-x-auto">
              <table className="w-full text-[12.5px] min-w-[760px]">
                <thead className="bg-muted/20 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">User</th>
                    <th className="text-left font-medium px-3 py-2">Plan</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                    <th className="text-left font-medium px-3 py-2">Period</th>
                    <th className="text-right font-medium px-3 py-2">Amount</th>
                    <th className="text-left font-medium px-3 py-2">Source</th>
                    <th className="text-right font-medium px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[11.5px]">
                        {nameById.get(s.user_id) || s.user_id.slice(0, 12)}
                        {payingById.has(s.user_id) && <BadgeCheck className="h-3 w-3 text-emerald-500 ml-1.5 inline-block align-[-1px]" aria-label="Paying customer" />}
                      </td>
                      <td className="px-3 py-2">{TIER_LABEL[s.tier] ?? s.tier}</td>
                      <td className={"px-3 py-2 capitalize " + (STATUS_TONE[s.status] ?? "")}>{s.status}</td>
                      <td className="px-3 py-2 capitalize text-muted-foreground">
                        {s.billing_period}
                        {s.current_period_end ? ` · ends ${formatDistanceToNow(new Date(s.current_period_end), { addSuffix: true })}` : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {s.amount_cents === 0 ? <span className="text-emerald-500">$0</span> : `$${(s.amount_cents / 100).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2">
                        {isGrant(s)
                          ? <span className="text-[11px] font-mono px-1.5 py-0.5 border border-emerald-500/40 text-emerald-500 rounded-sm inline-flex items-center gap-1"><BadgeCheck className="h-3 w-3" /> admin grant</span>
                          : <span className="text-[11px] font-mono text-muted-foreground">{s.payment_method}</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isGrant(s) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-red-500 hover:text-red-400"
                            disabled={revoking === s.id}
                            onClick={() => revokeGrant(s.id)}
                          >
                            {revoking === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revoke"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
