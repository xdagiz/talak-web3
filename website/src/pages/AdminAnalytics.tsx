import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { useNeonCharts } from "@/hooks/use-neon-charts";
import { NeonPatternDefs, neonPatternId } from "@/components/NeonPatternDefs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";

type RpcLog = {
  id: string;
  provider: string;
  status: string;
  latency_ms: number;
  chain_id: number;
  created_at: string;
  user_id: string | null;
};

type AnalyticsEvent = { id: string; event_type: string; created_at: string };

type Growth = { created_at: string };

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

export default function AdminAnalytics() {
  const [rpcLogs, setRpcLogs] = useState<RpcLog[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [growth, setGrowth] = useState<{
    users: Growth[]; wallets: Growth[]; keys: Growth[]; projects: Growth[];
  }>({ users: [], wallets: [], keys: [], projects: [] });
  const [counts, setCounts] = useState<{
    users: number; wallets: number; keys: number; projects: number; rpc: number; events: number;
  }>({ users: 0, wallets: 0, keys: 0, projects: 0, rpc: 0, events: 0 });
  const [loading, setLoading] = useState(true);
  const { getFill } = useNeonCharts();

  useEffect(() => {
    document.title = "Analytics · admin";
    Promise.all([
      supabase.from("rpc_logs").select("id,provider,status,latency_ms,chain_id,created_at,user_id").limit(2000),
      supabase.from("analytics_events").select("id,event_type,created_at").limit(2000),
      supabase.from("profiles").select("created_at"),
      supabase.from("wallets").select("created_at"),
      supabase.from("api_keys").select("created_at"),
      supabase.from("projects").select("created_at"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("wallets").select("id", { count: "exact", head: true }),
      supabase.from("api_keys").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("rpc_logs").select("id", { count: "exact", head: true }),
      supabase.from("analytics_events").select("id", { count: "exact", head: true }),
    ]).then(([r, e, u, w, k, p, uC, wC, kC, pC, rC, eC]) => {
      setRpcLogs((r.data as RpcLog[]) ?? []);
      setEvents((e.data as AnalyticsEvent[]) ?? []);
      setGrowth({
        users: (u.data as Growth[]) ?? [],
        wallets: (w.data as Growth[]) ?? [],
        keys: (k.data as Growth[]) ?? [],
        projects: (p.data as Growth[]) ?? [],
      });
      setCounts({
        users: uC.count ?? 0, wallets: wC.count ?? 0, keys: kC.count ?? 0,
        projects: pC.count ?? 0, rpc: rC.count ?? 0, events: eC.count ?? 0,
      });
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const total = rpcLogs.length;
    const ok = rpcLogs.filter(l => l.status === "ok").length;
    const errors = total - ok;
    const avgLatency = total ? Math.round(rpcLogs.reduce((s, l) => s + l.latency_ms, 0) / total) : 0;
    const errorRate = total ? Math.round((errors / total) * 1000) / 10 : 0;
    const activeUsers = new Set(rpcLogs.map(l => l.user_id).filter(Boolean)).size;
    return { total, errors, avgLatency, errorRate, activeUsers };
  }, [rpcLogs]);

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

  const providerData = useMemo(() => {
    const counts: Record<string, number> = {};
    rpcLogs.forEach(l => { counts[l.provider] = (counts[l.provider] || 0) + 1; });
    return Object.entries(counts).map(([provider, count]) => ({
      provider, count, fill: PROVIDER_COLORS[provider] || "hsl(0, 0%, 50%)",
    })).sort((a, b) => b.count - a.count);
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

  const successFailData = useMemo(() => {
    const result: { date: string; ok: number; error: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const next = startOfDay(subDays(new Date(), i - 1));
      let ok = 0, error = 0;
      rpcLogs.forEach(l => {
        const t = parseISO(l.created_at);
        if (t >= day && t < next) { if (l.status === "ok") ok++; else error++; }
      });
      result.push({ date: format(day, "MMM dd"), ok, error });
    }
    return result;
  }, [rpcLogs]);
  const successConfig: ChartConfig = {
    ok: { label: "Success", color: "hsl(142, 70%, 40%)" },
    error: { label: "Error", color: "hsl(345, 90%, 60%)" },
  };

  const growthByKind = (rows: Growth[]) => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) days[format(subDays(new Date(), i), "MMM dd")] = 0;
    rows.forEach(r => {
      const key = format(parseISO(r.created_at), "MMM dd");
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  };
  const userGrowth = useMemo(() => growthByKind(growth.users), [growth.users]);
  const walletGrowth = useMemo(() => growthByKind(growth.wallets), [growth.wallets]);
  const keyGrowth = useMemo(() => growthByKind(growth.keys), [growth.keys]);
  const growthConfig: ChartConfig = {
    users: { label: "Users", color: "hsl(234, 55%, 60%)" },
    wallets: { label: "Wallets", color: "hsl(142, 70%, 40%)" },
    keys: { label: "API keys", color: "hsl(280, 60%, 55%)" },
  };
  const growthSeries = useMemo(() => {
    const all = new Set([...userGrowth, ...walletGrowth, ...keyGrowth].map(d => d.date));
    return Array.from(all).sort((a, b) => a.localeCompare(b)).map(date => ({
      date,
      users: userGrowth.find(d => d.date === date)?.count ?? 0,
      wallets: walletGrowth.find(d => d.date === date)?.count ?? 0,
      keys: keyGrowth.find(d => d.date === date)?.count ?? 0,
    }));
  }, [userGrowth, walletGrowth, keyGrowth]);

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
      <AdminLayout title="Analytics">
        <div className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[220px]" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statTiles = [
    { label: "Total RPC calls", value: counts.rpc.toLocaleString() },
    { label: "Active users (30d)", value: stats.activeUsers.toLocaleString() },
    { label: "Error rate", value: `${stats.errorRate}%` },
    { label: "Avg latency", value: `${stats.avgLatency}ms` },
    { label: "Users", value: counts.users.toLocaleString() },
    { label: "Wallets", value: counts.wallets.toLocaleString() },
    { label: "API keys", value: counts.keys.toLocaleString() },
    { label: "Projects", value: counts.projects.toLocaleString() },
  ];

  return (
    <AdminLayout title="Analytics">
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
          {statTiles.map(s => (
            <div key={s.label} className="bg-background p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-mono">{s.label}</p>
              <p className="text-[22px] font-mono font-medium mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <NeonPatternDefs colors={[
          "hsl(234, 55%, 60%)", "hsl(142, 70%, 40%)", "hsl(280, 60%, 55%)", "hsl(38, 92%, 50%)",
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
          <div className="bg-background p-4">
            <p className="text-[13px] font-medium mb-1">RPC volume</p>
            <p className="text-[12px] text-muted-foreground mb-4">Calls per day, platform-wide (30d)</p>
            <ChartContainer config={trendConfig} className="h-[220px] w-full">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="count" stroke="hsl(234, 55%, 60%)" fill={`url(#${neonPatternId("hsl(234, 55%, 60%)")})`} fillOpacity={1} strokeWidth={1.5} />
              </AreaChart>
            </ChartContainer>
          </div>

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

          <div className="bg-background p-4">
            <p className="text-[13px] font-medium mb-1">Platform growth</p>
            <p className="text-[12px] text-muted-foreground mb-4">New users, wallets & API keys per day (14d)</p>
            <ChartContainer config={growthConfig} className="h-[220px] w-full">
              <AreaChart data={growthSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="users" stackId="1" stroke="hsl(234, 55%, 60%)" fill={`url(#${neonPatternId("hsl(234, 55%, 60%)")})`} fillOpacity={1} strokeWidth={1.5} />
                <Area type="monotone" dataKey="wallets" stackId="1" stroke="hsl(142, 70%, 40%)" fill={`url(#${neonPatternId("hsl(142, 70%, 40%)")})`} fillOpacity={1} strokeWidth={1.5} />
                <Area type="monotone" dataKey="keys" stackId="1" stroke="hsl(280, 60%, 55%)" fill={`url(#${neonPatternId("hsl(280, 60%, 55%)")})`} fillOpacity={1} strokeWidth={1.5} />
              </AreaChart>
            </ChartContainer>
          </div>

          <div className="bg-background p-4">
            <p className="text-[13px] font-medium mb-1">Top analytics events</p>
            <p className="text-[12px] text-muted-foreground mb-4">Most frequent event types</p>
            <ChartContainer config={eventConfig} className="h-[220px] w-full">
              <BarChart data={eventTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={0}>
                  {eventTypeData.map((_, i) => <Cell key={i} {...getFill("hsl(280, 60%, 55%)")} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
