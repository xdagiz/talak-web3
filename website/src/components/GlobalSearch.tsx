import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FolderGit2, KeyRound, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Results {
  projects: { id: string; name: string; slug: string }[];
  keys: { id: string; name: string; prefix: string }[];
  events: { id: string; message: string; type: string }[];
}

const EMPTY: Results = { projects: [], keys: [], events: [] };

export function GlobalSearch() {
  const { user } = useAuth();
  const { setActiveProjectId } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 300);

  useEffect(() => {
    if (!user || debounced.trim().length === 0) {
      setResults(EMPTY);
      return;
    }
    let cancelled = false;
    const q = debounced.trim();
    setLoading(true);
    async function run() {
      const like = `%${q}%`;
      const [p, k, e] = await Promise.all([
        supabase.from("projects").select("id, name, slug").eq("user_id", user.id).ilike("name", like).limit(5).order("name"),
        supabase.from("api_keys").select("id, name, prefix").eq("user_id", user.id).ilike("name", like).limit(5).order("created_at"),
        supabase.from("project_events").select("id, message, type").eq("user_id", user.id).ilike("message", like).limit(5).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setResults({
        projects: (p.data ?? []) as Results["projects"],
        keys: (k.data ?? []) as Results["keys"],
        events: (e.data ?? []) as Results["events"],
      });
      setLoading(false);
      setOpen(true);
    }
    void run().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced, user]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => debounced.trim() && setOpen(true)}
            placeholder="Search…"
            className="h-7 pl-7 text-[12px] rounded-md"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        {loading && <p className="text-[12px] text-muted-foreground px-2 py-1">Searching…</p>}
        {!loading &&
          results.projects.length === 0 &&
          results.keys.length === 0 &&
          results.events.length === 0 && (
            <p className="text-[12px] text-muted-foreground px-2 py-1">No matches</p>
          )}

        {results.projects.length > 0 && (
          <div className="mb-1">
            <p className="px-2 py-0.5 text-[10px] uppercase text-muted-foreground">Projects</p>
            {results.projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProjectAndGo(p.id);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-[12.5px] text-left hover:bg-accent"
              >
                <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {results.keys.length > 0 && (
          <div className="mb-1">
            <p className="px-2 py-0.5 text-[10px] uppercase text-muted-foreground">API Keys</p>
            {results.keys.map((k) => (
              <button
                key={k.id}
                onClick={() => { setOpen(false); navigate("/keys"); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-[12.5px] text-left hover:bg-accent"
              >
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {k.name}
              </button>
            ))}
          </div>
        )}

        {results.events.length > 0 && (
          <div>
            <p className="px-2 py-0.5 text-[10px] uppercase text-muted-foreground">Activity</p>
            {results.events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => { setOpen(false); navigate("/activity"); }}
                className="flex w-full items-start gap-2 rounded px-2 py-1 text-[12px] text-left hover:bg-accent"
              >
                <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                <span className="truncate">{ev.message}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  function setActiveProjectAndGo(id: string) {
    setActiveProjectId(id);
    setOpen(false);
    navigate("/projects");
  }
}
