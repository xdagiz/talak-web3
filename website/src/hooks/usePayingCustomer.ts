import { useEffect, useState } from "react";
import { getMySubscription } from "@/integrations/supabase/subscriptions";

/**
 * True when the signed-in user has an active/trialing paid subscription
 * (i.e. any tier other than the free "hobby" tier). Returns false while
 * unknown or when the user is on the free plan.
 */
export function usePayingCustomer(): boolean {
  const [paying, setPaying] = useState(false);
  useEffect(() => {
    let alive = true;
    getMySubscription()
      .then((sub) => {
        if (!alive) return;
        setPaying(!!sub && sub.tier !== "hobby");
      })
      .catch(() => {
        if (alive) setPaying(false);
      });
    return () => { alive = false; };
  }, []);
  return paying;
}
