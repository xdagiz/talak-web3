import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ChevronsUpDown, FolderGit2, Loader2 } from "lucide-react";

export function ProjectSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { projects, activeProject, setActiveProjectId, isLoading } = useWorkspace();

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-1.5">
        <FolderGit2 className="h-4 w-4 text-sidebar-foreground/60" />
      </div>
    );
  }

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-sidebar-foreground/60">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading projects…
      </div>
    );
  }

  return (
    <div className="px-2 pb-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-8 px-2 text-[12.5px] font-normal border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent/60"
          >
            <span className="flex items-center gap-2 truncate">
              <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/70" />
              <span className="truncate">{activeProject?.name ?? "Select project"}</span>
            </span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {projects.length === 0 && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No projects yet
            </DropdownMenuItem>
          )}
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setActiveProjectId(p.id)}
              className={p.id === activeProject?.id ? "bg-sidebar-accent" : ""}
            >
              {p.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="px-1 mt-1 truncate text-[10px] text-sidebar-foreground/50">
        {activeProject ? activeProject.slug : "No active project"}
      </p>
    </div>
  );
}
