import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type UsageMetric = Tables<"usage_metrics">;

export interface UsageStats {
  total: number;
  successRate: number;
  avgLatencyMs: number;
  activeKeys: number;
}

export interface UsagePoint {
  date: string;
  [chain: string]: string | number;
}

export interface PaginatedUsage {
  rows: UsageMetric[];
  total: number;
}

export const usageApi = {
  async list(
    userId: string,
    projectId: string | null,
    since?: Date,
    limit = 20,
    offset = 0
  ): Promise<PaginatedUsage> {
    let base = supabase
      .from("usage_metrics")
      .select("*, count()", { count: "exact" })
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);
    if (projectId) base = base.eq("project_id", projectId);
    if (since) base = base.gte("timestamp", since.toISOString());
    const { data, error, count } = await base;
    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as UsageMetric[], total: count ?? 0 };
  },

  async stats(userId: string, projectId: string | null, sinceHours = 24): Promise<UsageStats> {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
    let query = supabase
      .from("usage_metrics")
      .select("*")
      .eq("user_id", userId)
      .gte("timestamp", since);
    if (projectId) query = query.eq("project_id", projectId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as UsageMetric[];
    const total = rows.length;
    const success = rows.filter((r) => r.status === "success").length;
    const totalDuration = rows.reduce((s, r) => s + (r.duration_ms || 0), 0);
    let keysCount = 0;
    const { count } = await supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if (count != null) keysCount = count;
    return {
      total,
      successRate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
      avgLatencyMs: total > 0 ? Math.round(totalDuration / total) : 0,
      activeKeys: keysCount,
    };
  },

  async timeSeries(
    userId: string,
    projectId: string | null,
    days = 7
  ): Promise<UsagePoint[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    let data;
    if (projectId) {
      data = await supabase
        .from("usage_metrics")
        .select("*")
        .eq("user_id", userId)
        .gte("timestamp", since)
        .eq("project_id", projectId);
    } else {
      data = await supabase
        .from("usage_metrics")
        .select("*")
        .eq("user_id", userId)
        .gte("timestamp", since);
    }
    const { error } = data;
    if (error) throw new Error(error.message);
    const rows = (data.data ?? []) as UsageMetric[];
    const byDay: Record<string, { [chain: string]: number }> = {};
    for (const r of rows) {
      const day = (r.timestamp as string).slice(0, 10);
      byDay[day] ??= {};
      const total = (byDay[day][r.chain_id] ?? 0) + 1;
      byDay[day][r.chain_id] = total;
    }
    const points: UsagePoint[] = Object.keys(byDay)
      .sort()
      .map((date) => {
        const point: UsagePoint = { date };
        for (const [chain, count] of Object.entries(byDay[date])) point[chain] = count;
        return point;
      });
    return points;
  },
};
