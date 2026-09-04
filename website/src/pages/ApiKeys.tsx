import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { sha256, generateKey } from "@/lib/api-keys";
import { getTalakApiBaseUrl } from "@/lib/talak-backend";
import { KeyRound, Plus, Loader2, Radio, Trash2, Copy, Check, ShieldAlert, Pencil, Terminal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type ApiKey = Tables<"api_keys">;

const SCOPE_OPTIONS = ["rpc:read", "rpc:write", "admin"];

async function genKey(): Promise<{ full: string; prefix: string; hash: string }> {
  const full = generateKey();
  const prefix = full.slice(0, 10);
  const hash = await sha256(full);
  return { full, prefix, hash };
}

export default function ApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["rpc:read"]);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<{ id: string; full: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [realtime, setRealtime] = useState<"connecting" | "live" | "offline">("connecting");

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    setKeys((data as ApiKey[] | null) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    const ch = supabase
      .channel(`api-keys-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "api_keys", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe(s => {
        if (s === "SUBSCRIBED") setRealtime("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setRealtime("offline");
      });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    const { full, prefix, hash } = await genKey();
    const keyInsert: TablesInsert<"api_keys"> = {
      user_id: user.id,
      name: name.trim(),
      prefix,
      key_hash: hash,
      scopes,
    };
    const { data, error } = await supabase.from("api_keys").insert(keyInsert).select("id").single();
    setCreating(false);
    if (error || !data) {
      toast({ title: "Could not create key", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }
    setRevealed({ id: data.id, full });
    setName("");
    setScopes(["rpc:read"]);
    setOpen(false);
    refresh();
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? Apps using it will stop working.")) return;
    const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Could not revoke", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Key revoked" });
    refresh();
  };

  const openEdit = (k: ApiKey) => {
    setEditing(k);
    setEditScopes(k.scopes ?? []);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase.from("api_keys").update({ scopes: editScopes }).eq("id", editing.id);
    if (error) { toast({ title: "Could not update key", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Key updated" });
    setEditing(null);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this key?")) return;
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) { toast({ title: "Could not delete", description: error.message, variant: "destructive" }); return; }
    refresh();
  };

  const onCopy = async (s: string) => {
    await navigator.clipboard.writeText(s);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const active = useMemo(() => keys.filter(k => !k.revoked_at), [keys]);
  const revoked = useMemo(() => keys.filter(k => k.revoked_at), [keys]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col h-full">
          <div className="flex items-center px-4 md:px-6 h-11 border-b border-border shrink-0">
            <h1 className="text-[13px] font-medium">API keys</h1>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-6 max-w-[1200px]">
            <div className="border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30">
                <Skeleton className="h-3 w-24" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-3 py-3 border-b border-border last:border-0">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20 ms-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 h-11 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[13px] font-medium">API keys</h1>
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
                New key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-[12px]">Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Production server" className="h-9 text-[13px] mt-1" />
                </div>
                <div>
                  <Label className="text-[12px]">Scopes</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {SCOPE_OPTIONS.map(s => {
                      const checked = scopes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setScopes(prev => checked ? prev.filter(x => x !== s) : [...prev, s])}
                          className={cn(
                            "text-[11px] font-mono px-2 py-1 border rounded-sm transition-colors",
                            checked ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-foreground/30"
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  We'll show the full key once. Store it in a secret manager — it won't be visible again.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 max-w-[1200px]">
          {/* One-time reveal banner */}
          {revealed && (
            <div className="border border-warning/40 bg-warning/5 p-4 rounded-md">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium mb-1">Copy your new key now</p>
                  <p className="text-[12px] text-muted-foreground mb-3">
                    This is the only time we'll show the full secret. Treat it like a password.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-[12px] font-mono bg-background border border-border px-2 py-1.5 flex-1 truncate">
                      {revealed.full}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => onCopy(revealed.full)} className="h-8 text-[12px] gap-1.5 shrink-0">
                      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      Copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRevealed(null)} className="h-8 text-[12px] shrink-0">
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active keys table */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium">Active keys ({active.length})</span>
            </div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Name</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Prefix</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Scopes</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Last used</th>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Created</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {active.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground text-[13px]">
                      No active keys. Create one to start authenticating requests.
                    </td>
                  </tr>
                ) : (
                  active.map(k => (
                    <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{k.name}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{k.prefix}…</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map(s => (
                            <span key={s} className="text-[10.5px] font-mono px-1.5 py-0.5 border border-border rounded-sm">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                        {k.last_used_at ? formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                        {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" className="h-7 text-[11.5px] text-muted-foreground hover:text-foreground" onClick={() => openEdit(k)}>
                          <Pencil className="h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11.5px] text-muted-foreground hover:text-destructive" onClick={() => handleRevoke(k.id)}>
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Revoked */}
          {revoked.length > 0 && (
            <div className="border border-border rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium">Revoked ({revoked.length})</span>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Name</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Prefix</th>
                    <th className="text-left font-medium text-muted-foreground px-3 py-2">Revoked</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {revoked.map(k => (
                    <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground line-through">{k.name}</td>
                      <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{k.prefix}…</td>
                      <td className="px-3 py-2 text-muted-foreground text-[12px] whitespace-nowrap">
                        {k.revoked_at ? formatDistanceToNow(new Date(k.revoked_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-[11.5px] text-muted-foreground hover:text-destructive" onClick={() => handleDelete(k.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11.5px] text-muted-foreground">
            Keys are scoped to your account. Use them in `Authorization: Bearer tk_…`. Hashes are stored server-side.
          </p>

          {/* Quickstart */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium">Quickstart — use your key</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[12px] text-muted-foreground leading-[1.7]">
                Pass your key as a <code className="font-mono text-[11px]">Bearer</code> token when calling the Talak RPC
                proxy. Scope limits are enforced on every request.
              </p>
              <pre className="text-[12px] font-mono bg-foreground/[0.03] border border-border rounded-md p-3 overflow-x-auto">
{`curl -X POST ${getTalakApiBaseUrl()}/v1/jsonrpc/1 \\
  -H "Authorization: Bearer ${active[0]?.prefix ?? "tk_live_…"}…" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`}
              </pre>
              <p className="text-[12px] text-muted-foreground leading-[1.7]">
                For the full SDK walkthrough (SIWE, RPC failover, transactions) see{" "}
                <Link to="/install" className="text-blue-500 hover:text-blue-600 underline underline-offset-2">
                  the quickstart guide
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit key scopes</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <p className="text-[12.5px] text-muted-foreground mb-2">{editing?.name}</p>
            <div className="flex flex-wrap gap-2">
              {SCOPE_OPTIONS.map(s => {
                const checked = editScopes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditScopes(prev => checked ? prev.filter(x => x !== s) : [...prev, s])}
                    className={cn(
                      "text-[11px] font-mono px-2 py-1 border rounded-sm transition-colors",
                      checked ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-foreground/30"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
