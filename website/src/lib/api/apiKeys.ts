import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { generateKey, sha256 } from "@/lib/api-keys";

export type ApiKey = Tables<"api_keys">;
export type ApiKeyInsert = TablesInsert<"api_keys">;
export type ApiKeyUpdate = TablesUpdate<"api_keys">;

export interface CreateKeyInput {
  userId: string;
  name: string;
  scopes?: string[];
}

export interface CreatedKey {
  record: ApiKey;
  rawKey: string;
}

export const apiKeysApi = {
  async list(userId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ApiKey[];
  },

  async create(input: CreateKeyInput): Promise<CreatedKey> {
    const rawKey = generateKey();
    const keyHash = await sha256(rawKey);
    const record: ApiKey = {
      id: crypto.randomUUID(),
      user_id: input.userId,
      name: input.name,
      prefix: "tk_",
      key_hash: keyHash,
      scopes: input.scopes ?? [],
      created_at: new Date().toISOString(),
      last_used_at: null,
      revoked_at: null,
    };
    const { error } = await supabase.from("api_keys").insert(record as TablesInsert<"api_keys">);
    if (error) throw new Error(error.message);
    return { record, rawKey };
  },

  async update(id: string, input: ApiKeyUpdate): Promise<ApiKey> {
    const { data, error } = await supabase
      .from("api_keys")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ApiKey;
  },

  async revoke(id: string): Promise<void> {
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
