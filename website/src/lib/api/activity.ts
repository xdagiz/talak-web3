import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ActivityLog {
  created_at: string;
  id: string;
  level: string;
  message: string;
  metadata: Json;
  project_id: string | null;
  type: string;
  user_id: string;
}

export interface PaginatedActivity {
  rows: ActivityLog[];
  total: number;
}

export const activityApi = {
  async list(
    userId: string,
    projectId: string | null,
    opts: { limit?: number; offset?: number; types?: string[] } = {}
  ): Promise<PaginatedActivity> {
    const { limit = 20, offset = 0, types } = opts;
    let query = supabase
      .from("project_events")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (projectId) query = query.eq("project_id", projectId);
    if (types && types.length > 0) query = query.in("type", types);
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as ActivityLog[], total: count ?? 0 };
  },

  async recent(userId: string, projectId: string | null, limit = 5): Promise<ActivityLog[]> {
    let query = supabase
      .from("project_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivityLog[];
  },
};
