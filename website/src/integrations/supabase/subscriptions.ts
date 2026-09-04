import { supabase } from "./client";
import type { Database } from "./types";

export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"];

export type SubTier = "hobby" | "team" | "scale" | "enterprise";
export type SubStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete";
export type BillingPeriod = "monthly" | "annual" | "one_time";
export type PaymentMethod = "stripe" | "crypto";

/**
 * True when a subscription row is an admin grant: active, charged $0, and tagged
 * with `metadata.admin_granted`. Such plans are already paid-for from the user's
 * perspective, so checkout / setup flows must not demand another payment.
 */
export function isAdminGranted(sub: SubscriptionRow | null | undefined): boolean {
  if (!sub) return false;
  const md = (sub.metadata ?? {}) as Record<string, unknown>;
  return sub.status === "active" && md.admin_granted === true;
}

export interface RecordSubscriptionInput {
  tier: SubTier;
  billingPeriod: BillingPeriod;
  seats?: number;
  amountCents: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentProviderId?: string | null;
  chainId?: number | null;
  status?: SubStatus;
  metadata?: Record<string, unknown>;
}

function periodEnd(period: BillingPeriod): string | null {
  if (period === "one_time") return null;
  const now = new Date();
  if (period === "annual") now.setFullYear(now.getFullYear() + 1);
  else now.setMonth(now.getMonth() + 1);
  return now.toISOString();
}

/**
 * Returns the active subscription for the current user, or null.
 *
 * Deliberately does NOT use `.maybeSingle()`: if stale or duplicate active rows
 * exist (e.g. the `subscriptions_one_active_per_user` partial index isn't
 * enforced yet on a given DB), `.maybeSingle()` errors on multiple rows and we'd
 * wrongly report no plan. Taking the newest matching row is always correct.
 */
export async function getMySubscription(): Promise<SubscriptionRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("[subscriptions] getMySubscription: no authenticated user");
    return null;
  }
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.warn("[subscriptions] getMySubscription failed", user.id, error.message, error);
    return null;
  }
  console.warn("[subscriptions] getMySubscription result", user.id, data);
  return data?.[0] ?? null;
}

/**
 * Records (or replaces) the current user's subscription.
 * Cancels any prior active row first so the partial-unique index stays happy.
 */
export async function recordSubscription(
  input: RecordSubscriptionInput,
): Promise<SubscriptionRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("[subscriptions] no authenticated user — skipping write");
    return null;
  }

  // Soft-cancel any existing active row(s) so the new insert can land.
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", cancel_at_period_end: true })
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"]);

  const payload: SubscriptionInsert = {
    user_id: user.id,
    tier: input.tier,
    status: input.status ?? "active",
    billing_period: input.billingPeriod,
    seats: input.seats ?? 1,
    amount_cents: input.amountCents,
    currency: input.currency ?? "usd",
    payment_method: input.paymentMethod,
    payment_provider_id: input.paymentProviderId ?? null,
    chain_id: input.chainId ?? null,
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd(input.billingPeriod),
    metadata: (input.metadata ?? {}) as SubscriptionInsert["metadata"],
  };

  const { data, error } = await supabase
    .from("subscriptions")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[subscriptions] recordSubscription failed", error.message);
    return null;
  }
  return data;
}

/**
 * Marks the user's current active subscription as canceled.
 */
export async function cancelMySubscription(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", cancel_at_period_end: true })
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"]);
  if (error) {
    console.error("[subscriptions] cancel failed", error.message);
    return false;
  }
  return true;
}
