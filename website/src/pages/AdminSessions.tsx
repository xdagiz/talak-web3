import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, MonitorSmartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

type Session = {
  id: string;
  user_id: string;
  user_agent: string | null;
  ip_address: string | null;
  issued_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Sessions · admin";
    supabase.from("sessions").select("*").order("last_seen_at", { ascending: false }).limit(300).then(r => {
      setSessions((r.data as Session[]) ?? []);
      setLoading(false);
    });
  }, []);

  const now = new Date();

  const filtered = useMemo(() => {
    if (!query) return sessions;
    const q = query.toLowerCase();
    return sessions.filter(s =>
      s.user_id.toLowerCase().includes(q) ||
      (s.user_agent ?? "").toLowerCase().includes(q) ||
      (s.ip_address ?? "").toLowerCase().includes(q)
    );
  }, [sessions, query]);

  const status = (s: Session) => {
    if (s.revoked_at) return { label: "revoked", cls: "text-red-500" };
    if (new Date(s.expires_at) < now) return { label: "expired", cls: "text-muted-foreground" };
    return { label: "active", cls: "text-emerald-500" };
  };

  return (
    <AdminLayout title="Sessions">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-muted-foreground">{filtered.length} of {sessions.length} sessions (latest 300)</p>
          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search user / UA / IP…" className="h-8 pl-7 text-[12px] w-[240px]" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center text-[13px] text-muted-foreground">No sessions found.</div>
        ) : (
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[760px]">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">User</th>
                  <th className="text-left font-medium px-3 py-2">Device / UA</th>
                  <th className="text-left font-medium px-3 py-2">IP</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">Last seen</th>
                  <th className="text-left font-medium px-3 py-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const st = status(s);
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-[11.5px]">{s.user_id.slice(0, 12)}…</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[220px] truncate">
                        <span className="inline-flex items-center gap-1.5">
                          <MonitorSmartphone className="h-3 w-3 shrink-0" />{s.user_agent ? (s.user_agent.length > 40 ? s.user_agent.slice(0, 40) + "…" : s.user_agent) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-muted-foreground">{s.ip_address || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={st.cls}>
                          {st.label === "active" ? <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20">active</Badge>
                            : st.label === "revoked" ? <Badge variant="outline" className="text-[10px] text-red-500">revoked</Badge>
                              : <Badge variant="outline" className="text-[10px] text-muted-foreground">expired</Badge>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDistanceToNow(new Date(s.last_seen_at), { addSuffix: true })}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDistanceToNow(new Date(s.expires_at), { addSuffix: true })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
