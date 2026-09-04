import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

type ApiKey = {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export default function AdminApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "API keys · admin";
    supabase.from("api_keys").select("*").order("created_at", { ascending: false }).then(r => {
      setKeys((r.data as ApiKey[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query) return keys;
    const q = query.toLowerCase();
    return keys.filter(k =>
      k.name.toLowerCase().includes(q) ||
      k.prefix.toLowerCase().includes(q) ||
      k.user_id.toLowerCase().includes(q) ||
      k.scopes.some(s => s.includes(q))
    );
  }, [keys, query]);

  return (
    <AdminLayout title="API keys">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-muted-foreground">{filtered.length} of {keys.length} API keys</p>
          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name / prefix…" className="h-8 pl-7 text-[12px] w-[240px]" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center text-[13px] text-muted-foreground">No API keys found.</div>
        ) : (
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[680px]">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Name</th>
                  <th className="text-left font-medium px-3 py-2">Key</th>
                  <th className="text-left font-medium px-3 py-2">Scopes</th>
                  <th className="text-left font-medium px-3 py-2">Owner</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">Last used</th>
                  <th className="text-left font-medium px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(k => (
                  <tr key={k.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{k.name}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 font-mono text-[11.5px] text-muted-foreground">
                        <KeyRound className="h-3 w-3" />{k.prefix}…
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11.5px] text-muted-foreground">{k.user_id.slice(0, 10)}…</td>
                    <td className="px-3 py-2">
                      {k.revoked_at
                        ? <Badge variant="outline" className="text-[10px] text-red-500">revoked</Badge>
                        : <Badge className="text-[10px] bg-foreground/10 text-foreground hover:bg-foreground/15">active</Badge>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{k.last_used_at ? formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true }) : "never"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
