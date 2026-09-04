import { supabase } from "@/integrations/supabase/client";
import { getTalakApiBaseUrl } from "@/lib/talak-backend";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type IntegrationRow = Tables<"integrations">;

export interface ConnectIntegrationInput {
  userId: string;
  projectId: string | null;
  type: string;
  label: string;
}

export const integrationsApi = {
  async list(userId: string, projectId: string | null): Promise<IntegrationRow[]> {
    let query = supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as IntegrationRow[];
  },

  async connect(input: ConnectIntegrationInput): Promise<void> {
    const existing = await this.find(input.userId, input.projectId, input.type);
    const now = new Date().toISOString();
    const patch: TablesUpdate<"integrations"> = {
      type: input.type,
      project_id: input.projectId,
      status: "connected",
      connected_at: now,
      token_encrypted: null,
    };
    if (existing) {
      const { error } = await supabase.from("integrations").update(patch).eq("id", existing.id).eq("user_id", input.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("integrations").insert({
        user_id: input.userId,
        project_id: input.projectId,
        type: input.type,
        config: { name: input.label },
        status: "connected",
        token_encrypted: null,
        connected_at: now,
      });
      if (error) throw new Error(error.message);
    }
  },

  async disconnect(userId: string, projectId: string | null, type: string): Promise<void> {
    const existing = await this.find(userId, projectId, type);
    if (!existing) return;
    const { error } = await supabase
      .from("integrations")
      .update({ status: "disconnected", token_encrypted: null, connected_at: null })
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  async sync(userId: string, projectId: string | null, type: string): Promise<void> {
    const existing = await this.find(userId, projectId, type);
    if (!existing) return;
    const { error } = await supabase
      .from("integrations")
      .update({ status: "connected", last_sync_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  },

  async find(userId: string, projectId: string | null, type: string): Promise<IntegrationRow | null> {
    let query = supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type);
    if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      query = query.is("project_id", null);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return (data as IntegrationRow | null) ?? null;
  },

  async githubStart(userId: string, projectId: string | null, returnUrl?: string): Promise<string> {
    const params = new URLSearchParams({ userId });
    if (projectId) params.set("projectId", projectId);
    if (returnUrl) params.set("returnUrl", returnUrl);
    const res = await fetch(
      `${getTalakApiBaseUrl()}/integrations/github/start?${params.toString()}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
    if (!res.ok || !data?.ok || !data.url) {
      throw new Error(data?.error ?? "GitHub OAuth could not be started");
    }
    return data.url;
  },
};
