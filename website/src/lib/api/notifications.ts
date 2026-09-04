import { supabase } from "@/integrations/supabase/client";

// There is no dedicated `notifications` table; the closest real user-facing
// event source is `project_events`. The bell polls these recent events as the
// unread-notification feed (adaptation of the spec's `notifications` table).

export interface NotificationItem {
  id: string;
  created_at: string;
  message: string;
  type: string;
  level: string;
  project_id: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
}

export const notificationsApi = {
  async unreadCount(userId: string, projectId: string | null): Promise<number> {
    let query = supabase
      .from("project_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    // Always include system-level events (project_id IS NULL) in addition to the
    // active project's events, so grants/billing/global notices are never hidden.
    if (projectId) query = query.or(`project_id.eq.${projectId},project_id.is.null`);
    const { count, error } = await query;
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async list(userId: string, projectId: string | null, limit = 8): Promise<NotificationItem[]> {
    let query = supabase
      .from("project_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (projectId) query = query.or(`project_id.eq.${projectId},project_id.is.null`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{
      id: string;
      created_at: string;
      message: string;
      type: string;
      level: string;
      project_id: string | null;
      metadata: Record<string, unknown> | null;
    }>).map((e) => ({ ...e, read: false }));
  },
};
