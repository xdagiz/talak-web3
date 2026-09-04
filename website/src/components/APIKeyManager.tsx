import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Loader2, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { sha256, generateKey } from "@/lib/api-keys";
import { cn } from "@/lib/utils";

/**
 * API Key Manager.
 *
 * Persists API keys to the Supabase `api_keys` table. For security we only
 * store the SHA-256 hash + a short prefix; the full plaintext key is shown
 * exactly once immediately after creation so it can be copied.
 */

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
};

export function APIKeyManager() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const loadKeys = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setKeys((data ?? []) as ApiKeyRow[]);
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!user) return;
    const name = newName.trim();
    if (!name) {
      toast({ title: "Enter a key name", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const plain = generateKey();
      const prefix = plain.slice(0, 10);
      const keyHash = await sha256(plain);
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          name,
          key_hash: keyHash,
          prefix,
          scopes: ["rpc:read"],
        })
        .select("id, name, prefix, scopes, created_at, revoked_at, last_used_at")
        .single();
      if (error) throw error;

      // Reveal the plaintext key exactly once.
      const row = data as ApiKeyRow;
      setKeys((prev) => [row, ...prev.filter((k) => k.id !== row.id)]);
      setRevealed((prev) => ({ ...prev, [row.id]: plain }));
      setNewName("");
      setShowCreate(false);
      void navigator.clipboard
        .writeText(plain)
        .then(() => toast({ title: "API key created", description: "Copied to clipboard." }))
        .catch(() => toast({ title: "API key created", description: "Copy the key below." }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create key";
      toast({ title: "Create failed", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)));
      toast({ title: "Key revoked" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke key";
      toast({ title: "Revoke failed", description: msg, variant: "destructive" });
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard.writeText(value).then(() => toast({ title: "Copied" }));
  };

  const activeKeys = keys.filter((k) => !k.revoked_at);

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
        <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-medium">API Keys</span>
        <span className="text-[10.5px] text-muted-foreground/70 font-mono">
          · {activeKeys.length} active
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCreate((s) => !s)}
          className="ml-auto h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
        >
          {showCreate ? null : <Plus className="h-3 w-3" />}
          {showCreate ? "Close" : "Create key"}
        </Button>
      </div>

      <div className="p-3 space-y-3">
        {showCreate && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Key name (e.g. Production, Development)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="h-8 flex-1 text-[13px] bg-transparent"
            />
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} size="sm" className="h-8 text-[12px] gap-1.5 shrink-0">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading keys…
          </div>
        ) : keys.length === 0 ? (
          <div className="py-6 text-center text-[12.5px] text-muted-foreground">
            No API keys yet. Create one to start using talak-web3 RPC.
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => {
              const plain = revealed[k.id];
              const isRevoked = Boolean(k.revoked_at);
              return (
                <div
                  key={k.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-border p-2",
                    isRevoked && "opacity-50"
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium truncate">{k.name}</span>
                      {isRevoked && (
                        <span className="text-[10px] uppercase tracking-wider text-destructive">revoked</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground">
                      <span className={plain ? "text-foreground" : ""}>{plain ?? `${k.prefix}••••••••••`}</span>
                      <button onClick={() => copy(plain ?? k.prefix)} className="hover:text-foreground" title="Copy">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground/70">
                      Created {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  {!isRevoked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(k.id)}
                      className="h-7 px-2 text-[11px] text-destructive hover:text-destructive gap-1 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" /> Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
