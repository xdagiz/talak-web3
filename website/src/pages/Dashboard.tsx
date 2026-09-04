import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiweAuth } from "@/contexts/SiweAuthContext";
import { useWorkspace, workspaceKey } from "@/contexts/WorkspaceContext";
import { usageApi } from "@/lib/api/usage";
import { activityApi } from "@/lib/api/activity";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Wallet as WalletIcon, Activity, Shield, Zap, CheckCircle2, AlertCircle, Radio, ArrowRight, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { NeonPatternDefs } from "@/components/NeonPatternDefs";
import { useNeonCharts } from "@/hooks/use-neon-charts";
import { Web3Tools } from "@/components/Web3Tools";
import { toast } from "@/hooks/use-toast";
import {
  detectWalletName,
  getCurrentChainId,
  isWalletAvailable,
  switchChain,
} from "@/lib/siwe";
import { CHAINS, getChainById } from "@/data/chains";
import { getMySubscription } from "@/integrations/supabase/subscriptions";
import { TeamDashboard } from "@/components/TeamDashboard";
import { ScaleDashboard } from "@/components/ScaleDashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTalakWeb3 } from "@/hooks/useTalakWeb3";
import { RPCPlayground } from "@/components/RPCPlayground";
import { APIKeyManager } from "@/components/APIKeyManager";
import alchemyLogo from "@/assets/logos/alchemy.png";
import infuraLogo from "@/assets/logos/infura.png";
import ankrLogo from "@/assets/logos/ankr.png";
import quicknodeLogo from "@/assets/logos/quicknode.png";

/**
 * talak-web3 Dashboard
 * 
 * Main dashboard component providing comprehensive Web3 interface
 * aligned with talak-web3 architecture and branding.
 */

const TIER_LABEL: Record<string, string> = {
  hobby: "Hobby",
  team: "Team",
  scale: "Scale",
  enterprise: "Enterprise",
};

type Wallet = {
  id: string;
  address: string;
  chain_id: number;
  is_primary: boolean;
  label: string | null;
  created_at: string;
};

type RpcLog = {
  id: string;
  provider: string;
  method: string;
  status: string;
  latency_ms: number;
  chain_id: number;
  created_at: string;
};

type Session = {
  id: string;
  user_agent: string | null;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string;
};

const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
  CHAINS.map(c => [c.id, c.name])
);

const PROVIDER_COLORS: Record<string, string> = {
  alchemy: "hsl(234, 55%, 60%)",
  infura: "hsl(199, 89%, 48%)",
  ankr: "hsl(38, 92%, 50%)",
  quicknode: "hsl(280, 60%, 55%)",
  public: "hsl(0, 0%, 50%)",
};

const PROVIDER_LOGOS: Record<string, string> = {
  alchemy: alchemyLogo,
  infura: infuraLogo,
  ankr: ankrLogo,
  quicknode: quicknodeLogo,
};

const STATUS_COLORS: Record<string, string> = {
  ok: "hsl(142, 70%, 40%)",
  error: "hsl(345, 90%, 60%)",
  timeout: "hsl(38, 92%, 50%)",
};

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { activeProject } = useWorkspace();
  const {
    connectedAddr: siweAddr,
    activeChain: siweChain,
    siweLoading,
    linkWallet,
    unlinkWallet,
  } = useSiweAuth();
  const [search, setSearch] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [adding, setAdding] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const { getFill } = useNeonCharts();
  
  // Use talak-web3 SDK hook
  const {
    wallets,
    rpcLogs,
    sessions,
    loading,
    connectedAddr,
    activeChain,
    realtimeStatus,
    lastEventAt,
    setConnectedAddr,
    setActiveChain,
    setRealtimeStatus,
    setLastEventAt,
    disconnectWallet,
    addWallet,
    removeWallet,
    makeRpcCall,
    getChains,
    loadData,
  } = useTalakWeb3();

  const refresh = async () => {
    try {
      await loadData();
      const sub = await getMySubscription().catch(err => {
        console.error('Subscription load error:', err);
        return null;
      });
      setSubscription(sub);
    } catch (error) {
      console.error('Dashboard refresh error:', error);
      toast({
        title: "talak-web3 refresh failed",
        description: "Unable to refresh talak-web3 dashboard data",
        variant: "destructive",
      });
    }
  };

  // Usage analytics (auto-refreshes every 30s, refetches on project change)
  const activeProjId = activeProject?.id ?? null;
  const usageStatsQuery = useQuery({
    queryKey: workspaceKey(activeProjId, "dashboard", "stats"),
    queryFn: () => usageApi.stats(user?.id ?? "", activeProjId, 24),
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const seriesQuery = useQuery({
    queryKey: workspaceKey(activeProjId, "dashboard", "series"),
    queryFn: () => usageApi.timeSeries(user?.id ?? "", activeProjId, 7),
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const recentActivityQuery = useQuery({
    queryKey: workspaceKey(activeProjId, "dashboard", "activity"),
    queryFn: () => activityApi.recent(user?.id ?? "", activeProjId, 5),
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const stats = usageStatsQuery.data ?? { total: 0, successRate: 0, avgLatencyMs: 0, activeKeys: 0 };
  const totalCallsData = useMemo(() => {
    const raw = seriesQuery.data ?? [];
    return raw.map((p) => ({
      date: p.date,
      calls: Object.entries(p).filter(([k]) => k !== "date").reduce((s, [, v]) => s + (Number(v) || 0), 0),
    }));
  }, [seriesQuery.data]);
  const recentActivity = recentActivityQuery.data ?? [];

  // Initial fetch + realtime subscriptions
  useEffect(() => {
    if (!user) return;
    refresh();

    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets",  filter: `user_id=eq.${user.id}` }, () => { setLastEventAt(Date.now()); refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "rpc_logs", filter: `user_id=eq.${user.id}` }, () => { setLastEventAt(Date.now()); refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `user_id=eq.${user.id}` }, () => { setLastEventAt(Date.now()); refresh(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as Record<string, unknown> | null;
        const tier = row?.tier as string | undefined;
        const status = row?.status as string | undefined;
        refresh();
        if (!tier || !status || !["active", "trialing"].includes(status)) return;
        toast({
          title: `You're now on the ${TIER_LABEL[tier] ?? tier} plan`,
          description: "An admin upgraded your account. Your new billing profile is active.",
        });
      })
      .subscribe(status => {
        if (status === "SUBSCRIBED") setRealtimeStatus("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setRealtimeStatus("offline");
      });

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Detect already-connected browser wallet + listen to chain/account changes
  useEffect(() => {
    if (!isWalletAvailable()) return;
    let cancelled = false;
    (async () => {
      const id = await getCurrentChainId();
      if (!cancelled) setActiveChain(id);
    })();
    const handleChain = (...args: unknown[]) => {
      const hex = args[0] as string;
      setActiveChain(parseInt(hex, 16));
    };
    const handleAccounts = (...args: unknown[]) => {
      const accts = args[0] as string[];
      setConnectedAddr(accts?.[0]?.toLowerCase() ?? null);
    };
    window.ethereum?.on?.("chainChanged", handleChain);
    window.ethereum?.on?.("accountsChanged", handleAccounts);
    return () => {
      cancelled = true;
      window.ethereum?.removeListener?.("chainChanged", handleChain);
      window.ethereum?.removeListener?.("accountsChanged", handleAccounts);
    };
  }, []);

  const handleSiweConnect = async () => {
    if (!user) return;
    if (!isWalletAvailable()) {
      toast({
        title: "talak-web3 wallet required",
        description: "Install MetaMask or another EVM wallet to use talak-web3 services.",
        variant: "destructive",
      });
      return;
    }
    setAdding(true);
    try {
      await linkWallet();
      await refresh();
    } catch (err: unknown) {
      console.error("SIWE connect error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "talak-web3 connection failed", description: msg, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleSwitchChain = async (id: number) => {
    const ok = await switchChain(id);
    if (!ok) toast({ title: "Could not switch chain", description: "Approve the request in your wallet.", variant: "destructive" });
  };

  const handleAddWallet = async () => {
    if (!user || !newAddress.trim()) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress.trim())) {
      toast({ title: "Invalid address", description: "Enter a valid 0x… Ethereum address", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      await addWallet(newAddress.trim().toLowerCase(), 1);
      setNewAddress("");
    } catch (error) {
      console.error('Failed to add wallet:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAddWallet();
  };

  const filtered = wallets.filter(w =>
    w.address.toLowerCase().includes(search.toLowerCase()) ||
    (w.label || "").toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    wallets: wallets.length,
    activeSessions: sessions.filter(s => !s.revoked_at && new Date(s.expires_at) > new Date()).length,
    rpcCalls: rpcLogs.length,
    errorRate: rpcLogs.length
      ? Math.round((rpcLogs.filter(l => l.status !== "ok").length / rpcLogs.length) * 100)
      : 0,
  };

  const providerData = useMemo(() => {
    const counts: Record<string, number> = {};
    rpcLogs.forEach(l => { counts[l.provider] = (counts[l.provider] || 0) + 1; });
    return Object.entries(counts).map(([provider, count]) => ({
      provider,
      count,
      fill: PROVIDER_COLORS[provider] || "hsl(0, 0%, 50%)",
    }));
  }, [rpcLogs]);

  const providerConfig: ChartConfig = Object.fromEntries(
    Object.keys(PROVIDER_COLORS).map(k => [k, { label: k, color: PROVIDER_COLORS[k] }])
  );

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    rpcLogs.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      name: status,
      value,
      fill: STATUS_COLORS[status] || "hsl(0, 0%, 50%)",
    }));
  }, [rpcLogs]);

  const statusConfig: ChartConfig = Object.fromEntries(
    Object.keys(STATUS_COLORS).map(k => [k, { label: k, color: STATUS_COLORS[k] }])
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header bar - fixed in place */}
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0 fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 md:left-52">
          <div className="flex items-center gap-3">
            <h1 className="text-[13px] font-medium">Dashboard</h1>
            <span
              title={
                realtimeStatus === "live"   ? "Subscribed to wallets, rpc_logs, sessions"
                : realtimeStatus === "offline" ? "Realtime channel offline" : "Connecting…"
              }
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground"
            >
              <Radio className={cn(
                "h-3 w-3",
                realtimeStatus === "live" && "text-success animate-pulse",
                realtimeStatus === "offline" && "text-destructive",
              )} />
              {realtimeStatus}
              {lastEventAt && realtimeStatus === "live" && (
                <span className="text-muted-foreground/70">· last event {formatDistanceToNow(new Date(lastEventAt), { addSuffix: true })}</span>
              )}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto pt-11">
          <div className="p-4 md:p-6 space-y-6 max-w-[1400px]">
            {/* Show appropriate dashboard based on subscription */}
            <ErrorBoundary>
              <>
              {subscription?.tier === 'team' && (
                <TeamDashboard subscription={subscription} />
              )}
              {subscription?.tier === 'scale' && (
                <ScaleDashboard subscription={subscription} />
              )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-md overflow-hidden">
              {[
                { label: "RPC calls (24h)", value: stats.total },
                { label: "Success rate", value: `${stats.successRate}%` },
                { label: "Avg latency", value: `${stats.avgLatencyMs}ms` },
                { label: "Active API keys", value: stats.activeKeys },
              ].map((stat) => (
                <div key={stat.label} className="bg-background p-4">
                  <p className="text-[12px] text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-medium mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* 7-day usage area chart */}
            {totalCallsData.length > 0 && (
              <div className="bg-background border border-border rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] font-medium">Calls (last 7 days)</span>
                </div>
                <div className="p-3">
                  <ChartContainer config={{ calls: { label: "Calls" } }} className="h-[180px] w-full">
                    <AreaChart data={totalCallsData}>
                      <defs>
                        <linearGradient id="callsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(234, 55%, 60%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(234, 55%, 60%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="calls" stroke="hsl(234, 55%, 60%)" fill="url(#callsFill)" strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>
            )}

            {/* Recent activity feed */}
            <div className="bg-background border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium">Recent activity</span>
                <Link to="/activity" className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {recentActivity.length === 0 ? (
                <p className="p-4 text-[12.5px] text-muted-foreground">No activity yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {recentActivity.map((ev) => (
                    <div key={ev.id} className="px-3 py-2 flex items-center gap-3">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        ev.level === "success" && "bg-emerald-500",
                        ev.level === "error" && "bg-red-500",
                        (!ev.level || ev.level === "info") && "bg-amber-400",
                      )} />
                      <p className="text-[12.5px] text-foreground flex-1 truncate">{ev.message}</p>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
              <div className="bg-background p-4">
                <p className="text-[13px] font-medium mb-1">Calls by provider</p>
                <p className="text-[12px] text-muted-foreground mb-4">Distribution of recent RPC requests</p>
                <ChartContainer config={providerConfig} className="h-[200px] w-full">
                  <BarChart data={providerData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="provider" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={0}>
                      {providerData.map((entry, i) => <Cell key={i} {...getFill(entry.fill)} />)}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                {providerData.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {providerData.map(p => (
                      <span key={p.provider} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        {PROVIDER_LOGOS[p.provider] ? (
                          <img src={PROVIDER_LOGOS[p.provider]} alt={p.provider} className="h-3.5 w-3.5 rounded-full object-contain" />
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
                        )}
                        {p.provider}
                        <span className="font-mono text-foreground/80">{p.count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-background p-4">
                <p className="text-[13px] font-medium mb-1">Status distribution</p>
                <p className="text-[12px] text-muted-foreground mb-4">Success vs error vs timeout</p>
                <ChartContainer config={statusConfig} className="h-[200px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {statusData.map((entry, i) => <Cell key={i} {...getFill(entry.fill)} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>
            </div>

            {/* SIWE / browser wallet connect */}
            <div className="border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium">Sign in with Ethereum</span>
                {siweAddr && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    {detectWalletName()} · {shortAddr(siweAddr)}
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                <Button
                  size="sm"
                  onClick={handleSiweConnect}
                  disabled={adding || siweLoading}
                  className="h-8 text-[12px] gap-1.5 shrink-0"
                >
                  {adding || siweLoading
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <WalletIcon className="h-3.5 w-3.5" />}
                  {siweAddr ? "Re-sign SIWE message" : "Connect wallet & sign"}
                </Button>
                <p className="text-[11.5px] text-muted-foreground leading-snug">
                  {isWalletAvailable()
                    ? "Builds an EIP-4361 message in your browser, asks your wallet to sign it, and links the address to your account."
                    : <span className="inline-flex items-center gap-1"><AlertCircle className="h-3 w-3 text-warning" /> No browser wallet detected — install MetaMask or another EVM wallet.</span>}
                </p>
                {isWalletAvailable() && (
                  <div className="md:ml-auto flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10.5px] uppercase tracking-[0.1em] font-mono text-muted-foreground mr-1">chain:</span>
                    {CHAINS.slice(0, 6).map(c => {
                      const isActive = (siweChain ?? activeChain) === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSwitchChain(c.id)}
                          className={cn(
                            "h-6 pl-1.5 pr-2 text-[10.5px] font-mono border rounded-sm transition-colors inline-flex items-center gap-1.5",
                            isActive ? "border-foreground/40 bg-muted/60 text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                          )}
                          style={isActive ? { borderColor: c.accent } : undefined}
                          title={`Switch to ${c.name}`}
                        >
                          <img src={c.logo} alt="" className="h-3.5 w-3.5 rounded-full object-contain" aria-hidden="true" />
                          {c.shortName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Real Web3 use cases */}
            <Web3Tools wallets={wallets.map(w => ({ id: w.id, address: w.address, chain_id: w.chain_id }))} />

            {/* RPC Playground + API Keys */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border rounded-md overflow-hidden">
              <div className="bg-background">
                <RPCPlayground />
              </div>
              <div className="bg-background">
                <APIKeyManager />
              </div>
            </div>

            {/* Add wallet + search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search wallets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-[13px] bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Input
                  placeholder="0x… link a new wallet"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 text-[13px] font-mono bg-transparent"
                />
                <Button onClick={handleAddWallet} disabled={adding || !newAddress} size="sm" className="h-8 text-[12px] gap-1.5 shrink-0">
                  {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Link
                </Button>
              </div>
            </div>

            {/* Wallets table */}
            <div className="border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <WalletIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium">Wallets</span>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Address</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Chain</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Label</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Linked</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground text-[13px]">
                        No wallets linked yet
                      </td>
                    </tr>
                  ) : (
                    filtered.map((w) => (
                      <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-[12px]">
                          {shortAddr(w.address)}
                          {w.is_primary && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">primary</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{CHAIN_NAMES[w.chain_id] || `Chain ${w.chain_id}`}</td>
                        <td className="px-3 py-2 text-muted-foreground">{w.label || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                          {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Recent RPC logs */}
            <div className="border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium">Recent RPC requests</span>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Provider</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Method</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Chain</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Latency</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Status</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {rpcLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground text-[13px]">
                        No RPC activity yet
                      </td>
                    </tr>
                  ) : (
                    rpcLogs.slice(0, 25).map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">{l.provider}</td>
                        <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{l.method}</td>
                        <td className="px-3 py-2 text-muted-foreground">{CHAIN_NAMES[l.chain_id] || l.chain_id}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.latency_ms}ms</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: STATUS_COLORS[l.status] || "hsl(0,0%,50%)" }}
                            />
                            {l.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                          {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Active sessions */}
            <div className="border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium">Sessions</span>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Device</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Issued</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Expires</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">State</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground text-[13px]">
                        No active sessions
                      </td>
                    </tr>
                  ) : (
                    sessions.slice(0, 10).map((s) => {
                      const expired = new Date(s.expires_at) < new Date();
                      const state = s.revoked_at ? "revoked" : expired ? "expired" : "active";
                      const stateColor =
                        state === "active" ? STATUS_COLORS.ok : state === "expired" ? STATUS_COLORS.timeout : STATUS_COLORS.error;
                      return (
                        <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 text-[12px] text-muted-foreground truncate max-w-[260px]">
                            {s.user_agent || "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                            {formatDistanceToNow(new Date(s.issued_at), { addSuffix: true })}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                            {formatDistanceToNow(new Date(s.expires_at), { addSuffix: true })}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: stateColor }} />
                              {state}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Tip: connect your dApp to the talak-web3 SDK to start populating real RPC and session data.
              <Link to="/analytics" className="ml-1 underline">View analytics →</Link>
            </p>
              </>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
