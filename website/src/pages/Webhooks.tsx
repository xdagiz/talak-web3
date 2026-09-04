import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getTalakApiBaseUrl } from "@/lib/talak-backend";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { Webhook, Plus, Loader2, Radio, Trash2, Copy, Check, Send, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Hook = Tables<"webhooks">;
type PEvent = Tables<"project_events">;

type Project = Pick<Tables<"projects">, "id" | "name" | "slug">;

const ALL_EVENTS = ["tx.confirmed", "tx.failed", "auth.signed", "rpc.error", "webhook.test"];

export default function Webhooks() {
  const { user } = useAuth();
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["tx.confirmed", "rpc.error"]));
  const [copied, setCopied] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<"connecting" | "live" | "offline">("connecting");
  const [openId, setOpenId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, PEvent[]>>({});
  const [deliveriesLoading, setDeliveriesLoading] = useState<string | null>(null);

  const refresh = async () => {
    if (!user) return;
    const [{ data: h, error: hooksError }, { data: p, error: projectsError }] = await Promise.all([
      supabase.from("webhooks").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("id,name,slug").order("created_at", { ascending: false }),
    ]);
    if (hooksError) {
      toast({ title: "Failed to load webhooks", description: hooksError.message, variant: "destructive" });
      setHooks([]);
    } else {
      setHooks(h ?? []);
    }
    if (projectsError) {
      toast({ title: "Failed to load projects", description: projectsError.message, variant: "destructive" });
      setProjects([]);
    } else {
      setProjects(p ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    const ch = supabase
      .channel(`webhooks-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "webhooks", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe(s => {
        if (s === "SUBSCRIBED") setRealtime("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setRealtime("offline");
      });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const toggle = (e: string) => {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(e)) next.delete(e); else next.add(e);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user || !url.trim()) return;
    try { new URL(url.trim()); } catch { toast({ title: "Invalid URL", variant: "destructive" }); return; }
    setCreating(true);
    const hookInsert: TablesInsert<"webhooks"> = {
      user_id: user.id,
      project_id: projectId || null,
      url: url.trim(),
      events: Array.from(selected),
      enabled: true,
    };
    const { error } = await supabase.from("webhooks").insert(hookInsert);
    setCreating(false);
    if (error) { toast({ title: "Could not create webhook", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Webhook created" });
    setUrl(""); setProjectId(""); setSelected(new Set(["tx.confirmed", "rpc.error"]));
    setOpen(false); refresh();
  };

  const handleToggle = async (h: Hook) => {
    const { error } = await supabase.from("webhooks").update({ enabled: !h.enabled }).eq("id", h.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    const { error } = await supabase.from("webhooks").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    refresh();
  };

  const handleTest = async (h: Hook) => {
    if (!user) return;
    // Deliver a real ping through the Hono backend. No mock/fallback: if the
    // call fails or the endpoint is unreachable, surface the error.
    let res: Response;
    try {
      res = await fetch(`${getTalakApiBaseUrl()}/webhooks/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: h.url, secret: h.secret ?? "", event: "webhook.test" }),
        signal: AbortSignal.timeout(12_000),
      });
    } catch (err) {
      toast({
        title: "Test delivery failed",
        description: "Could not reach the Talak backend. Is it running on port 8787?",
        variant: "destructive",
      });
      return;
    }

    const data = (await res.json().catch(() => null)) as
      | { ok: boolean; status?: number; error?: string }
      | null;
    const ok = data?.ok === true;
    const statusNum = data?.status ?? res.status;

    await Promise.all([
      supabase.from("project_events").insert({
        user_id: user.id,
        project_id: h.project_id,
        type: "webhook",
        level: ok ? "info" : "error",
        message: `Test ping → ${h.url}`,
        metadata: { events: h.events, deliveryStatus: statusNum },
      }),
      supabase.from("webhooks")
        .update({
          last_status: statusNum,
          last_delivered_at: new Date().toISOString(),
        } as TablesUpdate<"webhooks">)
        .eq("id", h.id),
    ]);
    toast({
      title: ok ? `Test ping delivered (HTTP ${statusNum})` : "Test delivery failed",
      description: ok ? `Received HTTP ${statusNum} from ${h.url}` : data?.error ?? "The endpoint rejected the ping.",
      variant: ok ? "default" : "destructive",
    });
    refresh();
  };

  const onCopy = async (s: string) => {
    await navigator.clipboard.writeText(s);
    setCopied(s);
    setTimeout(() => setCopied(null), 1200);
  };

  const toggleDeliveries = async (h: Hook) => {
    if (openId === h.id) { setOpenId(null); return; }
    setOpenId(h.id);
    if (!user) return;
    if (deliveries[h.id]) return;
    setDeliveriesLoading(h.id);
    const { data, error } = await supabase
      .from("project_events")
      .select("*")
      .eq("type", "webhook")
      .eq("user_id", user.id)
      .ilike("message", `%${h.url}%`)
      .order("created_at", { ascending: false })
      .limit(6);
    setDeliveriesLoading(null);
    if (error) { toast({ title: "Could not load deliveries", description: error.message, variant: "destructive" }); return; }
    setDeliveries(prev => ({ ...prev, [h.id]: data ?? [] }));
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
            <h1 className="text-[13px] font-medium">Webhooks</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <Radio className={cn(
                "h-3 w-3",
                realtime === "live" && "text-success animate-pulse",
                realtime === "offline" && "text-destructive",
              )} />
              {realtime}
            </span>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-[12px] gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create webhook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-[12px]">Endpoint URL</Label>
                  <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/webhooks/talak" className="h-9 text-[13px] mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-[12px]">Project (optional)</Label>
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="w-full h-9 text-[13px] mt-1 px-2 bg-background border border-input rounded-md"
                  >
                    <option value="">All projects</option>
                    {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <Label className="text-[12px] mb-2 block">Events</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_EVENTS.map(e => (
                      <label key={e} className="flex items-center gap-2 text-[12.5px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(e)}
                          onChange={() => toggle(e)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="font-mono text-[12px]">{e}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={creating || !url.trim() || selected.size === 0}>
                  {creating && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 max-w-[1400px]">
          {hooks.length === 0 ? (
            <div className="border border-dashed border-border p-12 text-center max-w-[520px] mx-auto">
              <Webhook className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-[14px] font-medium mb-1">No webhooks configured</h3>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-5">
                Webhooks deliver real-time event notifications to your backend. Use them to react to confirmed
                transactions, failed RPC calls, and SIWE sign-ins.
              </p>
              <Button size="sm" onClick={() => setOpen(true)} className="h-8 text-[12px] gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create your first webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {hooks.map(h => (
                <div key={h.id} className="border border-border rounded-md p-4 bg-card/30">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-mono truncate text-foreground/90">{h.url}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {h.events.map(e => (
                          <span key={e} className="text-[10.5px] font-mono px-1.5 py-0.5 border border-border rounded-sm text-muted-foreground">{e}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={h.enabled} onCheckedChange={() => handleToggle(h)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      Secret:
                      <code className="font-mono text-[11px] truncate max-w-[180px]">{h.secret.slice(0, 12)}…</code>
                      <button onClick={() => onCopy(h.secret)} className="text-muted-foreground hover:text-foreground">
                        {copied === h.secret ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </span>
                    <span>·</span>
                    <span>last delivery: {h.last_delivered_at ? `${formatDistanceToNow(new Date(h.last_delivered_at), { addSuffix: true })} (${h.last_status ?? "—"})` : "never"}</span>
                    <span className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => handleTest(h)}>
                        <Send className="h-3 w-3" /> Send test
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(h.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </span>
                  </div>

                  <button
                    onClick={() => toggleDeliveries(h)}
                    className="mt-3 w-full flex items-center justify-between text-[11.5px] text-muted-foreground hover:text-foreground border-t border-border pt-3 transition-colors"
                    aria-expanded={openId === h.id}
                  >
                    <span>Recent deliveries</span>
                    <span className="inline-flex items-center gap-1.5">
                      {deliveriesLoading === h.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      {(deliveries[h.id]?.length ?? 0) > 0 && (
                        <span className="font-mono">{deliveries[h.id].length}</span>
                      )}
                      {openId === h.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </button>

                  {openId === h.id && (
                    <div className="mt-2 border border-border rounded-md overflow-hidden">
                      {deliveriesLoading === h.id ? (
                        <div className="p-4 text-[12px] text-muted-foreground">Loading deliveries…</div>
                      ) : (deliveries[h.id] ?? []).length === 0 ? (
                        <div className="p-4 text-[12px] text-muted-foreground">
                          No deliveries yet. Send a test ping to populate this log.
                        </div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {deliveries[h.id].map(ev => {
                            const md = (ev.metadata ?? {}) as { deliveryStatus?: number | string };
                            return (
                              <li key={ev.id} className="px-3 py-2 flex items-center gap-3 text-[11.5px]">
                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ev.level === "error" ? "bg-destructive" : "bg-success")} />
                                <span className="flex-1 min-w-0 truncate font-mono text-foreground/80">{ev.message}</span>
                                {md.deliveryStatus != null && (
                                  <span className={cn("font-mono", ev.level === "error" ? "text-red-500" : "text-emerald-500")}>
                                    HTTP {md.deliveryStatus}
                                  </span>
                                )}
                                <span className="text-muted-foreground shrink-0">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {hooks.length > 0 && (
            <div className="border border-border rounded-md p-4 bg-card/30 max-w-[860px]">
              <h4 className="text-[12.5px] font-medium mb-1.5 flex items-center gap-2">
                <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
                Receiving webhook payloads
              </h4>
              <p className="text-[12px] text-muted-foreground leading-[1.7] mb-3">
                Talak POSTs the event JSON to your endpoint. Keep your endpoint secret hidden and verify the
                request source before trusting the payload.
              </p>
              <pre className="text-[12px] font-mono bg-foreground/[0.03] border border-border rounded-md p-3 overflow-x-auto">
{`# Expose your secret once, then verify every request
WEBHOOK_SECRET="${hooks[0].secret}"

# Example — verify the signature header (if signed) before processing`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
