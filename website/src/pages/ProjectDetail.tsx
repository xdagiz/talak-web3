import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { CodeBlock } from "@/components/CodeBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Radio, Copy, Check, Send, ExternalLink, Activity, Settings as SettingsIcon, Globe,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Project = Tables<"projects">;
type ProjectEvent = Tables<"project_events">;

const TYPE_DOT: Record<ProjectEvent["type"], string> = {
  rpc:     "bg-foreground/60",
  tx:      "bg-success",
  auth:    "bg-info",
  webhook: "bg-warning",
  deploy:  "bg-foreground",
  system:  "bg-muted-foreground",
};

const LEVEL_CLS: Record<ProjectEvent["level"], string> = {
  info:    "text-muted-foreground",
  success: "text-success",
  warn:    "text-warning",
  error:   "text-destructive",
};

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtime, setRealtime] = useState<"connecting" | "live" | "offline">("connecting");
  const [copied, setCopied] = useState(false);
  const [emitMsg, setEmitMsg] = useState("");
  const [emitting, setEmitting] = useState(false);

  const refresh = async () => {
    if (!user || !slug) return;
    const { data: p, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (projectError) {
      toast({ title: "Failed to load project", description: projectError.message, variant: "destructive" });
      setProject(null);
      setEvents([]);
      setLoading(false);
      return;
    }
    setProject(p ?? null);

    if (p) {
      const { data: ev, error: eventsError } = await supabase
        .from("project_events")
        .select("*")
        .eq("project_id", p.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (eventsError) {
        toast({ title: "Failed to load events", description: eventsError.message, variant: "destructive" });
        setEvents([]);
      } else {
        setEvents(ev ?? []);
      }
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user, slug]);

  useEffect(() => {
    if (!user || !project) return;
    const ch = supabase
      .channel(`project-${project.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_events", filter: `project_id=eq.${project.id}` },
        () => refresh()
      )
      .subscribe(s => {
        if (s === "SUBSCRIBED") setRealtime("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setRealtime("offline");
      });
    return () => { supabase.removeChannel(ch); };
  }, [user, project]);

  const onCopySlug = async () => {
    if (!project) return;
    await navigator.clipboard.writeText(project.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleEmit = async (
    type: ProjectEvent["type"] = "system",
    level: ProjectEvent["level"] = "info",
    message?: string
  ) => {
    if (!user || !project) return;
    const msg = (message ?? emitMsg).trim();
    if (!msg) return;
    setEmitting(true);
    const eventInsert: TablesInsert<"project_events"> = {
      user_id: user.id,
      project_id: project.id,
      type, level, message: msg,
      metadata: { source: "dashboard.test" },
    };
    const { error } = await supabase.from("project_events").insert(eventInsert);
    setEmitting(false);
    if (error) { toast({ title: "Failed to emit", description: error.message, variant: "destructive" }); return; }
    setEmitMsg("");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="p-8 max-w-[600px]">
          <Link to="/projects" className="text-[12.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> All projects
          </Link>
          <h2 className="text-[16px] font-medium mb-1">Project not found</h2>
          <p className="text-[13px] text-muted-foreground">
            We couldn't find a project with slug "{slug}". It may have been deleted.
          </p>
        </div>
      </AppLayout>
    );
  }

  const exampleCode = `import { createTalak } from "talak-web3";

// Use this project's ID to bind events to your dashboard
const talak = createTalak({
  projectId: "${project.id}",
  apiKey:    process.env.TALAK_API_KEY!,
  env:       "${project.environment}",
});

// Send an event — it streams to your dashboard in real-time
await talak.events.emit({
  type:    "tx",
  level:   "success",
  message: "Confirmed swap on Arbitrum",
  metadata: { txHash: "0x…" },
});
`;

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/projects" className="text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-[13px] font-medium truncate">{project.name}</h1>
            <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">/ {project.slug}</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <Radio className={cn(
                "h-3 w-3",
                realtime === "live" && "text-success animate-pulse",
                realtime === "offline" && "text-destructive",
              )} />
              {realtime}
            </span>
          </div>
          {project.website && (
            <a href={project.website} target="_blank" rel="noreferrer" className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden md:inline truncate max-w-[200px]">{project.website.replace(/^https?:\/\//, "")}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 max-w-[1400px]">
          {/* Project ID + meta */}
          <div className="border border-border rounded-md p-4 bg-card/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-1">Project ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-[12px] font-mono text-foreground/85 truncate">{project.id}</code>
                  <button onClick={onCopySlug} className="h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
                    {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-1">Environment</p>
                <p className="text-[12.5px] capitalize">{project.environment}</p>
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-1">Created</p>
                <p className="text-[12.5px] text-muted-foreground">{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-3 w-full max-w-[420px]">
              <TabsTrigger value="overview" className="text-[12.5px]">Overview</TabsTrigger>
              <TabsTrigger value="events" className="text-[12.5px]">Live events</TabsTrigger>
              <TabsTrigger value="install" className="text-[12.5px]">Install</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-4 space-y-6">
              <div className="border border-border rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] font-medium">Test the connection</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                    Emit an event from this project to confirm your dashboard is wired up.
                    The event below will stream into the live feed within ~250ms.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={emitMsg}
                      onChange={e => setEmitMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleEmit(); }}
                      placeholder="e.g. Hello from production"
                      className="h-8 text-[13px] bg-transparent"
                    />
                    <Button size="sm" disabled={emitting || !emitMsg.trim()} onClick={() => handleEmit()} className="h-8 text-[12px] gap-1.5 shrink-0">
                      {emitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Emit event
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleEmit("tx", "success", "Test transaction confirmed")}>tx · success</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleEmit("auth", "info", "Test SIWE sign-in")}>auth · info</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleEmit("rpc", "warn", "Provider failover triggered")}>rpc · warn</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleEmit("webhook", "error", "Delivery failed (HTTP 500)")}>webhook · error</Button>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                  <SettingsIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] font-medium">Connect your dApp</span>
                </div>
                <div className="p-4">
                  <CodeBlock filename="lib/talak.ts" code={exampleCode} />
                </div>
              </div>
            </TabsContent>

            {/* Live events feed */}
            <TabsContent value="events" className="mt-4">
              <div className="border border-border rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] font-medium">Live events</span>
                  <span className="ml-auto text-[11px] text-muted-foreground font-mono">{events.length} event{events.length === 1 ? "" : "s"}</span>
                </div>
                {events.length === 0 ? (
                  <div className="p-10 text-center text-[12.5px] text-muted-foreground">
                    No events yet — emit one from the Overview tab or your dApp.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {events.map(ev => (
                      <li key={ev.id} className="px-3 py-2.5 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", TYPE_DOT[ev.type])} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] text-foreground/90 truncate">{ev.message}</p>
                          <p className="text-[10.5px] font-mono text-muted-foreground">
                            <span className="uppercase tracking-[0.1em]">{ev.type}</span>
                            <span className="mx-1.5">·</span>
                            <span className={LEVEL_CLS[ev.level]}>{ev.level}</span>
                            <span className="mx-1.5">·</span>
                            {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* Install / quickstart */}
            <TabsContent value="install" className="mt-4 space-y-6">
              <CodeBlock filename="terminal" language="sh" showLineNumbers={false} code={`pnpm add talak-web3 @talak-web3/auth @talak-web3/rpc @talak-web3/tx`} />
              <CodeBlock filename="lib/talak.ts" code={exampleCode} />
              <p className="text-[12px] text-muted-foreground">
                Need to manage keys? Head to <Link to="/keys" className="underline hover:text-foreground">API keys</Link>{" "}
                or wire delivery to <Link to="/webhooks" className="underline hover:text-foreground">Webhooks</Link>.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
