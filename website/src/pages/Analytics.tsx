import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { useNeonCharts } from "@/hooks/use-neon-charts";
import { NeonPatternDefs, neonPatternId } from "@/components/NeonPatternDefs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
} from "recharts";

type RpcLog = {
  id: string;
  provider: string;
  method: string;
  status: string;
  latency_ms: number;
  chain_id: number;
  created_at: string;
};

type AnalyticsEvent = {
  id: string;
  event_type: string;
  created_at: string;
};

const PROVIDER_COLORS: Record<string, string> = {
  alchemy: "hsl(234, 55%, 60%)",
  infura: "hsl(199, 89%, 48%)",
  ankr: "hsl(38, 92%, 50%)",
  quicknode: "hsl(280, 60%, 55%)",
  public: "hsl(0, 0%, 50%)",
};

const STATUS_COLORS: Record<string, string> = {
  ok: "hsl(142, 70%, 40%)",
  error: "hsl(345, 90%, 60%)",
  timeout: "hsl(38, 92%, 50%)",
};

export default function Analytics() {
  const [rpcLogs, setRpcLogs] = useState<RpcLog[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { getFill } = useNeonCharts();

  useEffect(() => {
    Promise.all([
      supabase.from("rpc_logs").select("*").limit(1000),
      supabase.from("analytics_events").select("*").limit(1000),
    ]).then(([r, e]) => {
      setRpcLogs(r.data || []);
      setEvents(e.data || []);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const total = rpcLogs.length;
    const ok = rpcLogs.filter(l => l.status === "ok").length;
    const errors = rpcLogs.filter(l => l.status !== "ok").length;
    const avgLatency = total ? Math.round(rpcLogs.reduce((s, l) => s + l.latency_ms, 0) / total) : 0;
    const authEvents = events.filter(e => e.event_type.startsWith("auth.")).length;
    const successAuth = events.filter(e => e.event_type === "auth.success").length;
    const totalAuth = events.filter(e => e.event_type === "auth.success" || e.event_type === "auth.failed").length;
    const authRate = totalAuth ? Math.round((successAuth / totalAuth) * 100) : 0;
    return { total, errors, avgLatency, authRate, authEvents };
  }, [rpcLogs, events]);

  const providerData = useMemo(() => {
    const counts: Record<string, number> = {};
    rpcLogs.forEach(l => { counts[l.provider] = (counts[l.provider] || 0) + 1; });
    return Object.entries(counts).map(([provider, count]) => ({
      provider, count, fill: PROVIDER_COLORS[provider] || "hsl(0, 0%, 50%)",
    }));
  }, [rpcLogs]);
  const providerConfig: ChartConfig = Object.fromEntries(
    Object.keys(PROVIDER_COLORS).map(k => [k, { label: k, color: PROVIDER_COLORS[k] }])
  );

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    rpcLogs.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      name: status, value, fill: STATUS_COLORS[status] || "hsl(0, 0%, 50%)",
    }));
  }, [rpcLogs]);
  const statusConfig: ChartConfig = Object.fromEntries(
    Object.keys(STATUS_COLORS).map(k => [k, { label: k, color: STATUS_COLORS[k] }])
  );

  const trendData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) days[format(subDays(new Date(), i), "MMM dd")] = 0;
    rpcLogs.forEach(l => {
      const key = format(parseISO(l.created_at), "MMM dd");
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [rpcLogs]);
  const trendConfig: ChartConfig = { count: { label: "RPC calls", color: "hsl(234, 55%, 60%)" } };

  const latencyData = useMemo(() => {
    const days: Record<string, { sum: number; n: number }> = {};
    for (let i = 29; i >= 0; i--) days[format(subDays(new Date(), i), "MMM dd")] = { sum: 0, n: 0 };
    rpcLogs.forEach(l => {
      const key = format(parseISO(l.created_at), "MMM dd");
      if (key in days) { days[key].sum += l.latency_ms; days[key].n++; }
    });
    return Object.entries(days).map(([date, v]) => ({
      date,
      avg: v.n ? Math.round(v.sum / v.n) : 0,
    }));
  }, [rpcLogs]);
  const latencyConfig: ChartConfig = { avg: { label: "Avg latency", color: "hsl(38, 92%, 50%)" } };

  const successFailData = useMemo(() => {
    const result: { date: string; ok: number; error: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const next = startOfDay(subDays(new Date(), i - 1));
      let ok = 0, error = 0;
      rpcLogs.forEach(l => {
        const t = parseISO(l.created_at);
        if (t >= day && t < next) {
          if (l.status === "ok") ok++; else error++;
        }
      });
      result.push({ date: format(day, "MMM dd"), ok, error });
    }
    return result;
  }, [rpcLogs]);
  const successConfig: ChartConfig = {
    ok: { label: "Success", color: "hsl(142, 70%, 40%)" },
    error: { label: "Error", color: "hsl(345, 90%, 60%)" },
  };

  const eventTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.event_type] = (counts[e.event_type] || 0) + 1; });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [events]);
  const eventConfig: ChartConfig = { count: { label: "Events", color: "hsl(280, 60%, 55%)" } };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col h-full">
          <div className="px-4 md:px-6 h-11 border-b border-border flex items-center">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="px-4 md:px-6 h-11 border-b border-border flex items-center shrink-0">
          <h1 className="text-[13px] font-medium">Analytics</h1>
        </div>

        <div className="flex-1 overflow-auto">
          <NeonPatternDefs colors={[
            ...Object.values(PROVIDER_COLORS),
            ...Object.values(STATUS_COLORS),
            "hsl(234, 55%, 60%)",
            "hsl(280, 60%, 55%)",
          ]} />
          <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
              {[
                { label: "RPC calls", value: stats.total },
                { label: "Errors", value: stats.errors },
                { label: "Avg latency", value: `${stats.avgLatency}ms` },
                { label: "Auth success", value: `${stats.authRate}%` },
              ].map((stat) => (
                <div key={stat.label} className="bg-background p-4">
                  <p className="text-[12px] text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-medium mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
              {/* Provider Bar */}
              <div className="bg-background p-4">
                <p className="text-[13px] font-medium mb-1">Calls by provider</p>
                <p className="text-[12px] text-muted-foreground mb-4">Distribution across RPC providers</p>
                <ChartContainer config={providerConfig} className="h-[220px] w-full">
                  <BarChart data={providerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="provider" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={0}>
                      {providerData.map((e, i) => <Cell key={i} {...getFill(e.fill)} />)}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Status Pie */}
              <div className="bg-background p-4">
                <p className="text-[13px] font-medium mb-1">Status distribution</p>
                <p className="text-[12px] text-muted-foreground mb-4">Success vs error vs timeout</p>
                <ChartContainer config={statusConfig} className="h-[220px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {statusData.map((e, i) => <Cell key={i} {...getFill(e.fill)} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Trend Line */}
              <div className="bg-background p-4">
                <p className="text-[13px] font-medium mb-1">RPC volume</p>
                <p className="text-[12px] text-muted-foreground mb-4">Calls per day (last 30 days)</p>
                <ChartContainer config={trendConfig} className="h-[220px] w-full">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="count" stroke="hsl(234, 55%, 60%)" strokeWidth={1.5} dot={{ r: 2 }} />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* Latency Line */}
              <div className="bg-background p-4">
                <p className="text-[13px] font-medium mb-1">Latency trend</p>
                <p className="text-[12px] text-muted-foreground mb-4">Avg response time per day (ms)</p>
                <ChartContainer config={latencyConfig} className="h-[220px] w-full">
                  <LineChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="avg" stroke="hsl(38, 92%, 50%)" strokeWidth={1.5} dot={{ r: 2 }} />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* Success vs Error stacked area */}
              <div className="bg-background p-4">
                <p className="text-[13px] font-medium mb-1">Success vs error</p>
                <p className="text-[12px] text-muted-foreground mb-4">Daily breakdown over last 30 days</p>
                <ChartContainer config={successConfig} className="h-[220px] w-full">
                  <AreaChart data={successFailData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="ok" stackId="1" stroke="hsl(142, 70%, 40%)" fill={`url(#${neonPatternId("hsl(142, 70%, 40%)")})`} fillOpacity={1} strokeWidth={1.5} />
                    <Area type="monotone" dataKey="error" stackId="1" stroke="hsl(345, 90%, 60%)" fill={`url(#${neonPatternId("hsl(345, 90%, 60%)")})`} fillOpacity={1} strokeWidth={1.5} />
                  </AreaChart>
                </ChartContainer>
              </div>

              {/* Top events */}
              <div className="bg-background p-4">
                <p className="text-[13px] font-medium mb-1">Top events</p>
                <p className="text-[12px] text-muted-foreground mb-4">Most frequent analytics events</p>
                <ChartContainer config={eventConfig} className="h-[220px] w-full">
                  <BarChart data={eventTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis dataKey="type" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={110} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={0}>
                      {eventTypeData.map((_, i) => <Cell key={i} {...getFill("hsl(280, 60%, 55%)")} />)}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
