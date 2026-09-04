import { supabase } from "@/integrations/supabase/client";
import { getTalakApiBaseUrl } from "@/lib/talak-backend";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Webhook = Tables<"webhooks">;
export type WebhookInsert = TablesInsert<"webhooks">;
export type WebhookUpdate = TablesUpdate<"webhooks">;

export interface TestDeliveryResult {
  ok: boolean;
  status: number;
  error?: string;
}

export const webhooksApi = {
  async list(userId: string, projectId: string | null): Promise<Webhook[]> {
    let query = supabase
      .from("webhooks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Webhook[];
  },

  async create(input: WebhookInsert): Promise<Webhook> {
    const { data, error } = await supabase.from("webhooks").insert(input).select().single();
    if (error) throw new Error(error.message);
    return data as Webhook;
  },

  async update(id: string, input: WebhookUpdate): Promise<Webhook> {
    const { data, error } = await supabase
      .from("webhooks")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Webhook;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("webhooks").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async testDelivery(url: string, secret?: string, event = "webhook.test"): Promise<TestDeliveryResult> {
    try {
      const res = await fetch(`${getTalakApiBaseUrl()}/webhooks/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, secret: secret ?? "", event }),
        signal: AbortSignal.timeout(12_000),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; status?: number; error?: string }
        | null;
      return { ok: data?.ok === true, status: data?.status ?? res.status, error: data?.error };
    } catch {
      return { ok: false, status: 0, error: "Talak backend unreachable" };
    }
  },
};
