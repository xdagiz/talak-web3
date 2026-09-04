import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectUpdate = TablesUpdate<"projects">;

export type ProjectWithCounts = Project & { webhooks?: { count: number }[] };

type ProjectName = Pick<Project, "id" | "name" | "slug">;

export const projectsApi = {
  async list(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Project[];
  },

  async listWithCounts(userId: string): Promise<ProjectWithCounts[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("*, webhooks(count)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectWithCounts[];
  },

  async listNames(userId: string): Promise<ProjectName[]> {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, slug")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProjectName[];
  },

  async get(id: string): Promise<Project | null> {
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
    if (error) return null;
    return data as Project;
  },

  async create(input: ProjectInsert): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .insert(input)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Project;
  },

  async update(id: string, input: ProjectUpdate): Promise<Project> {
    const { data, error } = await supabase
      .from("projects")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Project;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
