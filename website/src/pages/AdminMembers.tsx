import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, ShieldOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  created_at: string;
};

type Role = { user_id: string; role: string };

export default function AdminMembers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const refresh = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles((p.data as Profile[]) ?? []);
    const map = new Map<string, Set<string>>();
    for (const row of (r.data as Role[]) ?? []) {
      const set = map.get(row.user_id) ?? new Set();
      set.add(row.role);
      map.set(row.user_id, set);
    }
    setRoles(map);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Members · admin";
    refresh();
    const ch = supabase
      .channel("admin-members")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setRole = async (userId: string, role: "admin", grant: boolean) => {
    setWorking(userId);
    if (grant) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error && !error.message.includes("duplicate")) {
        toast({ title: "Could not grant role", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Admin role granted" });
      }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) toast({ title: "Could not revoke role", description: error.message, variant: "destructive" });
      else toast({ title: "Admin role revoked" });
    }
    setWorking(null);
  };

  const filtered = profiles.filter(p => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (p.full_name ?? "").toLowerCase().includes(q)
        || (p.job_title ?? "").toLowerCase().includes(q)
        || p.user_id.toLowerCase().includes(q);
  });

  return (
    <AdminLayout title="Members">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-muted-foreground">{filtered.length} of {profiles.length} members</p>
          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 pl-7 text-[12px] w-[220px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {filtered.map(p => {
              const isAdmin = roles.get(p.user_id)?.has("admin") ?? false;
              const isSelf = user?.id === p.user_id;
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="h-7 w-7 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-medium shrink-0 overflow-hidden">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (p.full_name ?? "?").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium truncate">{p.full_name || "(no name)"}</span>
                      {isAdmin && <Badge className="text-[10px] h-4 px-1 bg-foreground/10 text-foreground hover:bg-foreground/15">admin</Badge>}
                      {isSelf && <Badge variant="outline" className="text-[10px] h-4 px-1">you</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{p.job_title || "—"}</span>
                      <span>·</span>
                      <span className="font-mono">{p.user_id.slice(0, 8)}…</span>
                      <span>·</span>
                      <span>joined {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={working === p.user_id || isSelf}
                    onClick={() => setRole(p.user_id, "admin", !isAdmin)}
                    className="h-7 text-[11px] gap-1.5"
                  >
                    {working === p.user_id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : isAdmin
                        ? <><ShieldOff className="h-3 w-3" /> Revoke admin</>
                        : <><ShieldCheck className="h-3 w-3" /> Make admin</>}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
