import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { projectsApi, type ProjectWithCounts } from "@/lib/api/projects";
import { toast } from "@/hooks/use-toast";
import { FolderGit2, Plus, Loader2, Trash2, ArrowRight, Copy, Check, Webhook } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Environment = "development" | "staging" | "production";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export default function Projects() {
  const { user } = useAuth();
  const { activeProject, setActiveProjectId, refreshWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState<Environment>("development");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await projectsApi.listWithCounts(user.id);
      setProjects(data);
    } catch (err) {
      toast({ title: "Failed to load projects", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load + realtime subscription
  useEffect(() => {
    if (!user) return;
    void refresh();
    const ch = supabase
      .channel(`projects-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `user_id=eq.${user.id}` }, () => { void refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const slug = slugify(name);
      await projectsApi.create({
        user_id: user.id,
        name: name.trim(),
        slug,
        description: description.trim() || null,
        website: website.trim() || null,
        environment,
      });
      const eventInsert: TablesInsert<"project_events"> = {
        user_id: user.id,
        type: "system",
        level: "success",
        message: `Project "${name.trim()}" created`,
        metadata: { slug },
      };
      await supabase.from("project_events").insert(eventInsert);
      toast({ title: "Project created" });
      setName(""); setWebsite(""); setDescription(""); setEnvironment("development");
      setOpen(false);
      await refresh();
      void refreshWorkspace();
    } catch (err) {
      toast({ title: "Could not create project", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, projectName: string) => {
    if (!confirm(`Delete project "${projectName}"? This cannot be undone.`)) return;
    try {
      await projectsApi.remove(id);
      toast({ title: "Project deleted" });
      if (activeProject?.id === id) {
        const remaining = projects.filter((p) => p.id !== id);
        setActiveProjectId(remaining[0]?.id ?? null);
        void refreshWorkspace();
      }
      await refresh();
      if (activeProject?.id === id) navigate("/projects");
    } catch (err) {
      toast({ title: "Could not delete", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    }
  };

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col h-full">
          <div className="flex items-center px-4 md:px-6 h-11 border-b border-border shrink-0">
            <h1 className="text-[13px] font-medium">Projects</h1>
          </div>
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1400px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-border p-4 flex flex-col gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-full" />
                  <div className="flex justify-between mt-auto">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
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
          <h1 className="text-[13px] font-medium">Projects</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-[12px] gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-[12px]">Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My dApp" className="h-9 text-[13px] mt-1" />
                </div>
                <div>
                  <Label className="text-[12px]">Website</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://my-dapp.xyz" className="h-9 text-[13px] mt-1" />
                </div>
                <div>
                  <Label className="text-[12px]">Description</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this project do?" className="h-9 text-[13px] mt-1" />
                </div>
                <div>
                  <Label className="text-[12px]">Environment</Label>
                  <Select value={environment} onValueChange={v => setEnvironment(v as Environment)}>
                    <SelectTrigger className="h-9 text-[13px] mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={creating || !name.trim()}>
                  {creating && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Create project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {projects.length === 0 ? (
            <div className="border border-dashed border-border p-12 text-center max-w-[520px] mx-auto">
              <FolderGit2 className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-[14px] font-medium mb-1">No projects yet</h3>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-5">
                A project is a container for your RPC traffic, webhooks and analytics.
                Create one to start streaming events into the dashboard in real-time.
              </p>
              <Button size="sm" onClick={() => setOpen(true)} className="h-8 text-[12px] gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create your first project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1400px]">
              {projects.map(p => (
                <div
                  key={p.id}
                  className={cn(
                    "group border bg-card/30 hover:bg-card/60 transition-colors p-4 flex flex-col",
                    activeProject?.id === p.id
                      ? "border-primary/50 ring-1 ring-primary/20"
                      : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <Link to={`/projects/${p.slug}`} className="text-[14px] font-medium text-foreground hover:underline block truncate">
                        {p.name}
                      </Link>
                      <p className="text-[11.5px] font-mono text-muted-foreground truncate">{p.slug}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] uppercase tracking-[0.12em] font-mono px-1.5 py-0.5 border rounded-sm shrink-0",
                      p.environment === "production" && "border-success/40 text-success",
                      p.environment === "staging" && "border-warning/40 text-warning",
                      p.environment === "development" && "border-border text-muted-foreground",
                    )}>
                      {p.environment.slice(0, 4)}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground line-clamp-2 min-h-[34px]">
                    {p.description || "No description."}
                  </p>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Webhook className="h-3 w-3" />
                        {p.webhooks?.[0]?.count ?? 0} webhooks
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyId(p.id)}
                        className="h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Copy project ID"
                        title={copiedId === p.id ? "Copied!" : "Copy project ID"}
                      >
                        {copiedId === p.id ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive"
                        aria-label="Delete project"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <Link to={`/projects/${p.slug}`} className="h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Open project">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
