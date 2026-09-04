import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Session = Tables<"sessions">;
export type WorkspaceSettings = Tables<"workspace_settings">;

export const settingsApi = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Profile | null) ?? null;
  },

  async updateProfile(userId: string, patch: Partial<Pick<Profile, "full_name" | "avatar_url" | "job_title">>): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() } as TablesUpdate<"profiles">)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Profile;
  },

  async getWorkspaceSettings(userId: string): Promise<WorkspaceSettings | null> {
    const { data, error } = await supabase
      .from("workspace_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as WorkspaceSettings | null) ?? null;
  },

  async upsertWorkspaceSettings(userId: string, input: TablesUpdate<"workspace_settings">): Promise<WorkspaceSettings> {
    const { data, error } = await supabase
      .from("workspace_settings")
      .upsert({ ...input, user_id: userId, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as WorkspaceSettings;
  },

  async listSessions(userId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Session[];
  },

  async revokeAllSessions(userId: string): Promise<void> {
    const { error } = await supabase
      .from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
  },
};
