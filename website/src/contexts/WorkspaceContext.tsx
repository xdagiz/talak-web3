import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type Project = Tables<"projects">;

interface WorkspaceContextType {
  projects: Project[];
  activeProject: Project | null;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  refreshWorkspace: () => Promise<void>;
  refreshData: () => void;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = "talak-workspace-active-project";
const WORKSPACE_QUERY_PREFIX = ["workspace"] as const;

export function workspaceKey(projectId: string | null, ...rest: unknown[]): unknown[] {
  return [...WORKSPACE_QUERY_PREFIX, projectId ?? "all", ...rest];
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("get_my_projects");
      if (error) throw new Error(error.message);
      setProjects((data as Project[] | null) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project workspace");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["workspace"] });
  }, [queryClient]);

  const appliedProjectId = activeProjectId ?? projects[0]?.id ?? null;
  const prevProjectId = React.useRef<string | null>(appliedProjectId);
  React.useEffect(() => {
    if (prevProjectId.current !== appliedProjectId) {
      prevProjectId.current = appliedProjectId;
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    }
  }, [appliedProjectId, queryClient]);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return projects[0] ?? null;
    return projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;
  }, [activeProjectId, projects]);

  const value = useMemo(
    () => ({
      projects,
      activeProject,
      activeProjectId: activeProject?.id ?? null,
      setActiveProjectId,
      refreshWorkspace,
      refreshData,
      isLoading,
      error,
    }),
    [projects, activeProject, setActiveProjectId, refreshWorkspace, refreshData, isLoading, error]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
};
