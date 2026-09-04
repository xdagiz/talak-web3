import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Activity as ActivityIcon, Loader2, Radio, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { checkTalakBackendHealth, checkTalakRpc } from "@/lib/talak-backend";

type ProjectEvent = Tables<"project_events">;
type Project = Pick<Tables<"projects">, "id" | "name" | "slug">;

const TYPES: ProjectEvent["type"][] = ["rpc", "tx", "auth", "webhook", "deploy", "system"];
const LEVELS: ProjectEvent["level"][] = ["info", "success", "warn", "error"];

const LEVEL_DOT: Record<ProjectEvent["level"], string> = {
  info:    "bg-muted-foreground",
  success: "bg-success",
  warn:    "bg-warning",
  error:   "bg-destructive",
};

const LEVEL_TEXT: Record<ProjectEvent["level"], string> = {
  info:    "text-muted-foreground",
  success: "text-success",
  warn:    "text-warning",
  error:   "text-destructive",
};

export default function Activity() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(200);
  const [realtime, setRealtime] = useState<"connecting" | "live" | "offline">("connecting");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<ProjectEvent["type"]>>(new Set(TYPES));
  const [levelFilter, setLevelFilter] = useState<Set<ProjectEvent["level"]>>(new Set(LEVELS));
  const [talakStatus, setTalakStatus] = useState<"checking" | "connected" | "degraded">("checking");

  const refresh = async () => {
    if (!user) return;
    const [{ data: ev, error: evError }, { data: pr, error: prError }] = await Promise.all([
      supabase.from("project_events").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("projects").select("id,name,slug"),
    ]);
    if (evError) {
      toast({ title: "Failed to load activity", description: evError.message, variant: "destructive" });
      setEvents([]);
    } else {
      setEvents(ev ?? []);
    }
    if (prError) {
      toast({ title: "Failed to load projects", description: prError.message, variant: "destructive" });
      setProjects([]);
    } else {
      setProjects(pr ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    const ch = supabase
      .channel(`activity-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_events", filter: `user_id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe(s => {
        if (s === "SUBSCRIBED") setRealtime("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setRealtime("offline");
      });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    let mounted = true;
    async function checkBackend() {
      try {
        await checkTalakBackendHealth();
        await checkTalakRpc(1);
        if (mounted) setTalakStatus("connected");
      } catch {
        if (mounted) setTalakStatus("degraded");
      }
    }
    void checkBackend();
    return () => { mounted = false; };
  }, []);

  const projectMap = useMemo(() => {
    const m = new Map<string, Project>();
    projects.forEach(p => m.set(p.id, p));
    return m;
  }, [projects]);

  const filtered = events.filter(ev =>
    typeFilter.has(ev.type) &&
    levelFilter.has(ev.level) &&
    (!search || ev.message.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = <T,>(set: Set<T>, setter: (s: Set<T>) => void, val: T) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
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

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[13px] font-medium">Activity</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <Radio className={cn(
                "h-3 w-3",
                realtime === "live" && "text-success animate-pulse",
                realtime === "offline" && "text-destructive",
              )} />
              {realtime}
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {filtered.length} / {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4 max-w-[1400px]">
          {realtime === "offline" && (
            <div role="status" className="flex items-center gap-2.5 border border-amber-500/30 rounded-md px-3 py-2.5 text-[12px] bg-amber-500/5 text-amber-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Connection lost — reconnecting to realtime stream…
            </div>
          )}

          <div className="border border-border rounded-md p-3 text-[12px] flex items-center justify-between gap-2">
            <span className="text-muted-foreground">
              talak-web3 backend status
            </span>
            <span className={cn(
              "font-mono uppercase tracking-[0.08em]",
              talakStatus === "connected" && "text-success",
              talakStatus === "degraded" && "text-warning",
              talakStatus === "checking" && "text-muted-foreground"
            )}>
              {talakStatus}
            </span>
          </div>

          {/* Filters */}
          <div className="border border-border rounded-md p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages…"
                className="h-8 text-[13px] bg-transparent flex-1"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">Type</span>
              </div>
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => toggle(typeFilter, setTypeFilter, t)}
                  className={cn(
                    "h-6 px-2 text-[10.5px] font-mono uppercase tracking-[0.08em] border rounded-sm transition-colors",
                    typeFilter.has(t)
                      ? "border-foreground/40 bg-muted/50 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground font-mono">Level</span>
              </div>
              {LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => toggle(levelFilter, setLevelFilter, l)}
                  className={cn(
                    "h-6 px-2 text-[10.5px] font-mono uppercase tracking-[0.08em] border rounded-sm transition-colors inline-flex items-center gap-1.5",
                    levelFilter.has(l)
                      ? "border-foreground/40 bg-muted/50 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", LEVEL_DOT[l])} />
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Stream */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
              <ActivityIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium">Event stream</span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-[12.5px] text-muted-foreground">
                {events.length === 0 ? (
                  <>
                    No events yet. Create a <Link to="/projects" className="underline hover:text-foreground">project</Link> and emit a test event.
                  </>
                ) : "No events match the current filters."}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map(ev => {
                  const proj = ev.project_id ? projectMap.get(ev.project_id) : null;
                  return (
                    <li key={ev.id} className="px-3 py-2.5 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                      <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", LEVEL_DOT[ev.level])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] text-foreground/90">{ev.message}</p>
                        <p className="text-[10.5px] font-mono text-muted-foreground mt-0.5">
                          <span className="uppercase tracking-[0.1em]">{ev.type}</span>
                          <span className="mx-1.5">·</span>
                          <span className={LEVEL_TEXT[ev.level]}>{ev.level}</span>
                          {proj && (
                            <>
                              <span className="mx-1.5">·</span>
                              <Link to={`/projects/${proj.slug}`} className="hover:text-foreground underline decoration-muted-foreground/30">
                                {proj.name}
                              </Link>
                            </>
                          )}
                          <span className="mx-1.5">·</span>
                          {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {filtered.length > 0 && events.length >= limit && (
              <div className="border-t border-border p-3 flex justify-center">
                <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setLimit(l => l + 200)}>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5" /> Load more
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
