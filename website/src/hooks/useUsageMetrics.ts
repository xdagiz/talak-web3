import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Tables } from "@/integrations/supabase/types";

type UsageMetric = Tables<"usage_metrics">;

export type RangeKey = "24h" | "7d" | "30d";

export const RANGE_HOURS: Record<RangeKey, number> = {
  "24h": 24,
  "7d": 7 * 24,
  "30d": 30 * 24,
};

export function rangeStart(key: RangeKey): Date {
  return new Date(Date.now() - RANGE_HOURS[key] * 60 * 60 * 1000);
}

export function useUsageMetrics(rangeKey: RangeKey = "7d") {
  const { user } = useAuth();
  const { activeProject } = useWorkspace();
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const since = rangeStart(rangeKey).toISOString();
      let query = supabase
        .from("usage_metrics")
        .select("*")
        .eq("user_id", user.id)
        .gte("timestamp", since);
      if (activeProject) query = query.eq("project_id", activeProject.id);
      const { data, error } = await query.order("timestamp", { ascending: false });
      if (error) throw new Error(error.message);
      setMetrics((data ?? []) as UsageMetric[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage metrics");
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [user, rangeKey, activeProject]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    const total = metrics.length;
    const success = metrics.filter((m) => m.status === "success").length;
    const errors = metrics.filter((m) => m.status === "error").length;
    const totalDuration = metrics.reduce((s, m) => s + (m.duration_ms || 0), 0);
    const avgLatency = total > 0 ? Math.round(totalDuration / total) : 0;
    const errorRate = total > 0 ? Math.round((errors / total) * 1000) / 10 : 0;
    return { total, success, errors, avgLatency, errorRate };
  }, [metrics]);

  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of metrics) map.set(m.method, (map.get(m.method) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);
  }, [metrics]);

  const byChain = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of metrics) map.set(m.chain_id, (map.get(m.chain_id) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([chain_id, count]) => ({ chain_id, count }))
      .sort((a, b) => b.count - a.count);
  }, [metrics]);

  const exportCsv = useCallback(() => {
    const header = "timestamp,method,chain_id,status,duration_ms,project_id";
    const rows = metrics.map((m) =>
      [m.timestamp, m.method, m.chain_id, m.status, m.duration_ms, m.project_id ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talak-usage-${rangeKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, rangeKey]);

  return {
    metrics,
    loading,
    error,
    refresh,
    totals,
    byMethod,
    byChain,
    exportCsv,
  };
}
