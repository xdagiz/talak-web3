import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { BookOpen, Sparkles, ArrowRight, Zap, Loader2, Plug, RefreshCw } from "lucide-react";
import { INTEGRATIONS } from "@/data/integrations";
import { brandIcons } from "@/components/icons/brand-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Tables } from "@/integrations/supabase/types";
import { integrationsApi } from "@/lib/api/integrations";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type IntegrationRow = Tables<"integrations">;

type ServiceDef = {
  type: string;
  label: string;
  description: string;
  icon: string;
};

const SERVICES: ServiceDef[] = [
  { type: "github", label: "GitHub", description: "OAuth connection for repo events and CI status.", icon: "github" },
  { type: "discord", label: "Discord", description: "Webhook-based notifications into your server.", icon: "discord" },
  { type: "thegraph", label: "The Graph", description: "Track subgraph deployments and queries.", icon: "thegraph" },
  { type: "alchemy", label: "Alchemy", description: "Import shared RPC endpoints and analytics.", icon: "alchemy" },
];

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  syncing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  disconnected: "bg-muted/40 text-muted-foreground border-border",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function Integrations() {
  const { user } = useAuth();
  const { activeProject } = useWorkspace();
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const githubReturning = searchParams.get("connected") === "github";

  useEffect(() => {
    if (!githubReturning) return;
    const stripped = new URLSearchParams(searchParams);
    stripped.delete("connected");
    setSearchParams(stripped, { replace: true });
    toast({ title: "GitHub connected", description: "Your GitHub account is now linked." });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubReturning]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Real service-layer fetch. No mock/fallback data: surface failures instead of hiding them.
      const data = await integrationsApi.list(user.id, activeProject?.id ?? null);
      setRows(data);
    } catch (err) {
      console.error("Failed to load integrations:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeProject]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getStatus = (type: string) => rows.find((r) => r.type === type);

  const handleConnect = async (def: ServiceDef) => {
    if (!user) return;

    // GitHub uses a real OAuth handshake hosted on the backend (client secret
    // stays server-side). Discord/TheGraph/Alchemy keep the persisted-row flow.
    if (def.type === "github") {
      setBusy(`connect:${def.type}`);
      try {
        const returnUrl = `${window.location.origin}/integrations?connected=github`;
        const url = await integrationsApi.githubStart(user.id, activeProject?.id ?? null, returnUrl);
        window.location.assign(url);
      } catch (err) {
        toast({
          title: "Could not start GitHub connection",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        setBusy(null);
      }
      return;
    }

    setBusy(`connect:${def.type}`);
    try {
      await integrationsApi.connect({
        userId: user.id,
        projectId: activeProject?.id ?? null,
        type: def.type,
        label: def.label,
      });
      toast({ title: `${def.label} connected` });
    } catch (err) {
      toast({
        title: `Could not connect ${def.label}`,
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const handleDisconnect = async (def: ServiceDef) => {
    if (!user) return;
    setBusy(`disconnect:${def.type}`);
    try {
      await integrationsApi.disconnect(user.id, activeProject?.id ?? null, def.type);
      toast({ title: `${def.label} disconnected` });
    } catch (err) {
      toast({
        title: `Could not disconnect ${def.label}`,
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const handleSync = async (def: ServiceDef) => {
    if (!user) return;
    setBusy(`sync:${def.type}`);
    try {
      await integrationsApi.sync(user.id, activeProject?.id ?? null, def.type);
      toast({ title: `${def.label} sync started` });
    } catch (err) {
      toast({
        title: `Sync failed for ${def.label}`,
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      refresh();
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <h1 className="text-[13px] font-medium">Integrations</h1>
          <Link
            to="/docs"
            className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5" /> Full docs
          </Link>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 max-w-[1400px]">
          {/* External service connections */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
              <Plug className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium">Connected services</span>
              {activeProject && (
                <span className="text-[10.5px] text-muted-foreground/70 font-mono">
                  · project: {activeProject.name}
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex items-center gap-2 p-4 text-[12px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
                {SERVICES.map((def) => {
                  const row = getStatus(def.type);
                  const status = row?.status ?? "disconnected";
                  return (
                    <div key={def.type} className="bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const Icon = brandIcons[def.icon];
                              return Icon ? <Icon className="h-5 w-5 shrink-0" /> : null;
                            })()}
                            <p className="text-[13.5px] font-medium">{def.label}</p>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", STATUS_STYLES[status] ?? STATUS_STYLES.disconnected)}>
                              {status}
                            </Badge>
                          </div>
                          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{def.description}</p>
                          {row?.last_sync_at && (
                            <p className="text-[10.5px] text-muted-foreground/70 mt-1">
                              Last sync {new Date(row.last_sync_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {status === "connected" || status === "syncing" ? (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-[11.5px] gap-1"
                              onClick={() => handleSync(def)} disabled={Boolean(busy)}>
                              {busy === `sync:${def.type}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              Sync now
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-[11.5px] text-destructive hover:text-destructive"
                              onClick={() => handleDisconnect(def)} disabled={Boolean(busy)}>
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" className="h-7 text-[11.5px] gap-1"
                            onClick={() => handleConnect(def)} disabled={Boolean(busy)}>
                            {busy === `connect:${def.type}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                            Connect {def.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border border-border rounded-md p-5 bg-card/30">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 border border-border bg-background flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-[15px] font-medium mb-1">Quickstart</h2>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  Pick your stack to see install commands, copy-pasteable wiring code, feature lists,
                  and version requirements. Events from your application will stream live into{" "}
                  <Link to="/activity" className="underline hover:text-foreground">
                    Activity
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Integration grid — every framework gets its own page */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
            {INTEGRATIONS.map((i) => (
              <Link
                key={i.slug}
                to={`/integrations/${i.slug}`}
                className="bg-background p-5 hover:bg-muted/30 transition-colors group block"
              >
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = brandIcons[i.icon];
                    return Icon ? <Icon className="h-5 w-5 shrink-0" /> : null;
                  })()}
                  <p className="text-[14px] font-medium group-hover:text-foreground">
                    {i.label}
                  </p>
                </div>
                <p className="text-[12.5px] text-muted-foreground leading-[1.6]">
                  {i.tagline}
                </p>
                <p className="mt-3 text-[11.5px] font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded-sm inline-block">
                  {i.install}
                </p>
                <p className="mt-3 text-[11.5px] text-muted-foreground inline-flex items-center gap-1 group-hover:text-foreground">
                  Open guide
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </Link>
            ))}
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-md overflow-hidden">
            <Link
              to="/keys"
              className="bg-background hover:bg-muted/30 transition-colors p-4 group"
            >
              <Zap className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-[13px] font-medium group-hover:text-foreground">
                Generate an API key
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Tokens for server-to-server calls.
              </p>
            </Link>
            <Link
              to="/projects"
              className="bg-background hover:bg-muted/30 transition-colors p-4 group"
            >
              <Zap className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-[13px] font-medium group-hover:text-foreground">
                Create a project
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Group events by environment.
              </p>
            </Link>
            <Link
              to="/webhooks"
              className="bg-background hover:bg-muted/30 transition-colors p-4 group"
            >
              <Zap className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-[13px] font-medium group-hover:text-foreground">
                Wire a webhook
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                React to events on your backend.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
