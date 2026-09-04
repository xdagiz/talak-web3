import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Activity, Gauge, Server, AlertTriangle, ArrowRight, Calendar, Download, PieChart as PieIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace, workspaceKey } from "@/contexts/WorkspaceContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUsageMetrics, rangeStart, type RangeKey } from "@/hooks/useUsageMetrics";
import { usageApi } from "@/lib/api/usage";
import { getChainById } from "@/data/chains";

const METHOD_COLORS = ["hsl(234, 55%, 60%)", "hsl(199, 89%, 48%)", "hsl(38, 92%, 50%)", "hsl(280, 60%, 55%)", "hsl(142, 70%, 40%)", "hsl(345, 90%, 60%)"];

type RpcLog = {
  id: string;
  method: string;
  provider: string;
  chain_id: number;
  status: string;
  latency_ms: number;
  error_message: string | null;
  created_at: string;
};

const PLAN_LIMIT_PER_MONTH = 1_000_000; // Team default — adjust once per-tier cap is wired in.

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Usage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { activeProject } = useWorkspace();
  const [logs, setLogs] = useState<RpcLog[]>([]);
  const [loading, setLoading] = useState(true);
  const range = (searchParams.get("range") as RangeKey | null) ?? "7d";
  const page = Number(searchParams.get("page") ?? "1");
  const setRange = (r: RangeKey) => {
    const p = new URLSearchParams(searchParams);
    if (r === "7d") p.delete("range"); else p.set("range", r);
    p.delete("page");
    setSearchParams(p, { replace: true });
  };
  const setPage = (n: number) => {
    const p = new URLSearchParams(searchParams);
    if (n <= 1) p.delete("page"); else p.set("page", String(n));
    setSearchParams(p, { replace: true });
  };
  const usage = useUsageMetrics(range);

  const activeProjId = activeProject?.id ?? null;
  const PAGE_SIZE = 20;
  const pageQuery = useQuery({
    queryKey: workspaceKey(activeProjId, "usage", "list", range, page),
    queryFn: async () => {
      const since = rangeStart(range);
      return usageApi.list(user?.id ?? "", activeProjId, since, PAGE_SIZE, (Math.max(1, page) - 1) * PAGE_SIZE);
    },
    enabled: !!user,
  });
  const metricRows = pageQuery.data?.rows ?? [];
  const metricTotal = pageQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(metricTotal / PAGE_SIZE));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("rpc_logs")
        .select("id,method,provider,chain_id,status,latency_ms,error_message,created_at")
        .gte("created_at", startOfMonthIso())
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error && data) setLogs(data as RpcLog[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    if (logs.length === 0) {
      return { total: 0, errors: 0, avgLatency: 0, byProvider: [] as [string, number][], byMethod: [] as [string, number][] };
    }
    const total = logs.length;
    const errors = logs.filter(l => l.status !== "200" && l.status !== "ok").length;
    const avgLatency = Math.round(logs.reduce((a, l) => a + l.latency_ms, 0) / total);

    const tally = (key: keyof RpcLog) => {
      const m = new Map<string, number>();
      for (const l of logs) {
        const k = String(l[key] ?? "—");
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    return {
      total,
      errors,
      avgLatency,
      byProvider: tally("provider").slice(0, 5),
      byMethod:   tally("method").slice(0, 8),
    };
  }, [logs]);

  const usagePct = Math.min(100, Math.round((stats.total / PLAN_LIMIT_PER_MONTH) * 100));
  const errorRate = stats.total ? Math.round((stats.errors / stats.total) * 1000) / 10 : 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1100px] px-6 py-10 space-y-10">
        {/* Header */}
        <header>
          <p className="text-[11px] uppercase tracking-[0.16em] font-mono text-muted-foreground inline-flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5" /> Usage
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[28px] font-[500] tracking-[-0.02em]">RPC &amp; quota</h1>
            <div className="flex items-center gap-2">
              <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
                <SelectTrigger className="w-[130px] h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5" onClick={usage.exportCsv}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground max-w-[640px] leading-[1.7]">
            Real-time view of RPC traffic, error rate, latency, and quota across{" "}
            {usage.totals.total.toLocaleString()} requests in the selected range. Need more headroom?{" "}
            <Link to="/billing" className="underline underline-offset-2 hover:text-foreground">
              Upgrade your plan →
            </Link>
          </p>
        </header>

        {/* KPI cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
          <Kpi
            label="Calls this month"
            value={loading ? "—" : stats.total.toLocaleString()}
            sub={loading ? "" : `of ${PLAN_LIMIT_PER_MONTH.toLocaleString()} included`}
            tone="default"
          />
          <Kpi
            label="Quota used"
            value={loading ? "—" : `${usagePct}%`}
            sub={
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/80"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            }
            tone={usagePct > 80 ? "warn" : "default"}
          />
          <Kpi
            label="Avg latency"
            value={loading ? "—" : `${stats.avgLatency} ms`}
            sub="p50 across providers"
          />
          <Kpi
            label="Error rate"
            value={loading ? "—" : `${errorRate}%`}
            sub={`${stats.errors} failed of ${stats.total}`}
            tone={errorRate > 1 ? "warn" : "default"}
          />
        </section>

        {/* Breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
          <div className="bg-background p-5">
            <h3 className="text-[13px] font-medium flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-foreground/60" /> By provider
            </h3>
            <div className="mt-4 space-y-2">
              {loading && <SkeletonRows n={4} />}
              {!loading && stats.byProvider.length === 0 && (
                <p className="text-[12.5px] text-muted-foreground">No traffic yet this month.</p>
              )}
              {stats.byProvider.map(([provider, n]) => (
                <Bar key={provider} label={provider} value={n} max={stats.total} />
              ))}
            </div>
          </div>

          <div className="bg-background p-5">
            <h3 className="text-[13px] font-medium flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-foreground/60" /> Top methods
            </h3>
            <div className="mt-4 space-y-2">
              {loading && <SkeletonRows n={6} />}
              {!loading && stats.byMethod.length === 0 && (
                <p className="text-[12.5px] text-muted-foreground">No method calls recorded.</p>
              )}
              {stats.byMethod.map(([method, n]) => (
                <Bar key={method} label={method} value={n} max={stats.total} mono />
              ))}
            </div>
          </div>
        </section>

        {/* Method distribution + chain breakdown (from usage_metrics) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
          <div className="bg-background p-5">
            <h3 className="text-[13px] font-medium flex items-center gap-2">
              <PieIcon className="h-3.5 w-3.5 text-foreground/60" /> Method distribution
            </h3>
            <div className="mt-4">
              {usage.loading && <SkeletonRows n={4} />}
              {!usage.loading && usage.byMethod.length === 0 && (
                <p className="text-[12.5px] text-muted-foreground">No usage metrics recorded in this range.</p>
              )}
              {usage.byMethod.map((m, i) => (
                <Bar key={m.method} label={m.method} value={m.count} max={usage.totals.total} mono
                  color={METHOD_COLORS[i % METHOD_COLORS.length]} />
              ))}
            </div>
          </div>
          <div className="bg-background p-5">
            <h3 className="text-[13px] font-medium flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-foreground/60" /> Requests per chain
            </h3>
            <div className="mt-4">
              {usage.loading && <SkeletonRows n={4} />}
              {!usage.loading && usage.byChain.length === 0 && (
                <p className="text-[12.5px] text-muted-foreground">No chain data in this range.</p>
              )}
              {usage.byChain.map((c, i) => {
                const chain = getChainById(c.chain_id);
                return (
                  <Bar key={c.chain_id} label={chain?.name ?? `Chain ${c.chain_id}`}
                    value={c.count} max={usage.totals.total}
                    color={METHOD_COLORS[(i + 2) % METHOD_COLORS.length]} />
                );
              })}
            </div>
          </div>
        </section>

        {/* Paginated usage_metrics table */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-[500] tracking-[-0.02em]">Usage metrics</h2>
            <span className="text-[11.5px] text-muted-foreground font-mono inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> {metricTotal.toLocaleString()} records
            </span>
          </div>
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[720px]">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Timestamp</th>
                  <th className="text-left font-medium px-3 py-2">Method</th>
                  <th className="text-left font-medium px-3 py-2">Chain</th>
                  <th className="text-right font-medium px-3 py-2">Duration (ms)</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageQuery.isLoading && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!pageQuery.isLoading && metricRows.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No usage metrics in this range.
                  </td></tr>
                )}
                {metricRows.map(m => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono text-[11.5px] text-muted-foreground">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-1.5 font-mono">{m.method}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{getChainById(m.chain_id)?.name ?? m.chain_id}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{m.duration_ms} ms</td>
                    <td className={"px-3 py-1.5 " + (m.status === "success" ? "text-emerald-500" : m.status === "error" ? "text-red-500" : "text-muted-foreground")}>
                      {m.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[12px] text-muted-foreground">Page {Math.min(page, totalPages)} of {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </section>

        {/* CTA */}
        {usagePct > 70 && (
          <section className="border border-amber-500/30 rounded-md p-5 flex items-start gap-3 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <h3 className="text-[14px] font-medium">Approaching plan limit</h3>
              <p className="mt-1 text-[12.5px] text-muted-foreground leading-[1.7]">
                You've used {usagePct}% of your monthly quota. Upgrade to Scale for 10× the headroom and dedicated nodes.
              </p>
            </div>
            <Link
              to="/billing"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[12.5px] bg-foreground text-background hover:bg-foreground/90 rounded-sm transition-colors"
            >
              Upgrade <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

function Kpi({
  label, value, sub, tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "warn";
}) {
  return (
    <div className="bg-background p-5">
      <p className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-muted-foreground">{label}</p>
      <p className={"mt-2 text-[24px] font-[500] tracking-[-0.02em] " + (tone === "warn" ? "text-amber-500" : "")}>
        {value}
      </p>
      <div className="mt-1 text-[11.5px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Bar({ label, value, max, mono, color }: { label: string; value: number; max: number; mono?: boolean; color?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className={mono ? "font-mono truncate" : "truncate"}>{label}</span>
        <span className="text-muted-foreground font-mono shrink-0">{value.toLocaleString()} · {pct}%</span>
      </div>
      <div className="mt-1 h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color ?? "var(--foreground)" }} />
      </div>
    </div>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-3 bg-muted/40 rounded animate-pulse" />
      ))}
    </>
  );
}
