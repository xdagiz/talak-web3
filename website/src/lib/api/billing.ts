import { getTalakApiBaseUrl } from "@/lib/talak-backend";

export interface BillingPortalResult {
  ok: boolean;
  url: string;
  offline?: boolean;
}

async function getJson(path: string): Promise<{ ok: boolean; url?: string; note?: string } | null> {
  try {
    const res = await fetch(`${getTalakApiBaseUrl()}${path}`, {
      signal: AbortSignal.timeout(10_000),
    });
    return (await res.json().catch(() => null)) as { ok: boolean; url?: string; note?: string } | null;
  } catch {
    return null;
  }
}

export const billingApi = {
  async getPortalUrl(): Promise<BillingPortalResult> {
    const data = await getJson("/billing/portal");
    if (!data) return { ok: false, url: "", offline: true };
    return { ok: data.ok, url: data.url ?? "" };
  },

  async getCheckoutUrl(tier = "pro", period = "monthly"): Promise<BillingPortalResult> {
    try {
      const res = await fetch(`${getTalakApiBaseUrl()}/billing/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, period }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string } | null;
      return { ok: data?.ok === true, url: data?.url ?? "" };
    } catch {
      return { ok: false, url: "", offline: true };
    }
  },
};
