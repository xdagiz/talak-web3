import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, FolderGit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

type Project = {
  id: string;
  name: string;
  slug: string;
  environment: string;
  user_id: string;
  created_at: string;
};

type Owner = { user_id: string; full_name: string | null };

type WebhookCount = { project_id: string | null; count: number };
type EventCount = { project_id: string | null; count: number };

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [owners, setOwners] = useState<Map<string, string>>(new Map());
  const [whCounts, setWhCounts] = useState<Map<string, number>>(new Map());
  const [evCounts, setEvCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Projects · admin";
    Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id,full_name"),
      supabase.from("webhooks").select("project_id"),
      supabase.from("project_events").select("project_id"),
    ]).then(([p, o, w, e]) => {
      setProjects((p.data as Project[]) ?? []);
      const om = new Map<string, string>();
      (o.data as Owner[] ?? []).forEach(ow => om.set(ow.user_id, ow.full_name ?? "(no name)"));
      setOwners(om);
      const wm = new Map<string, number>();
      (w.data as WebhookCount[] ?? []).forEach(r => { if (r.project_id) wm.set(r.project_id, (wm.get(r.project_id) ?? 0) + 1); });
      setWhCounts(wm);
      const em = new Map<string, number>();
      (e.data as EventCount[] ?? []).forEach(r => { if (r.project_id) em.set(r.project_id, (em.get(r.project_id) ?? 0) + 1); });
      setEvCounts(em);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!query) return projects;
    const q = query.toLowerCase();
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (owners.get(p.user_id) ?? "").toLowerCase().includes(q)
    );
  }, [projects, query, owners]);

  return (
    <AdminLayout title="Projects">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-muted-foreground">{filtered.length} of {projects.length} projects</p>
          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" className="h-8 pl-7 text-[12px] w-[220px]" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center text-[13px] text-muted-foreground">No projects found.</div>
        ) : (
          <div className="border border-border rounded-md overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[680px]">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Project</th>
                  <th className="text-left font-medium px-3 py-2">Owner</th>
                  <th className="text-left font-medium px-3 py-2">Environment</th>
                  <th className="text-right font-medium px-3 py-2">Webhooks</th>
                  <th className="text-right font-medium px-3 py-2">Events</th>
                  <th className="text-left font-medium px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">/{p.slug}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{owners.get(p.user_id) ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">{p.environment}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{whCounts.get(p.id) ?? 0}</td>
                    <td className="px-3 py-2 text-right font-mono">{evCounts.get(p.id) ?? 0}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</td>
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
