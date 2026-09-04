/**
 * Manual type augmentations for tables introduced after the initial Lovable
 * generation. These mirror the SQL in
 * `supabase/migrations/0002_blog_admin_settings.sql`. When you regenerate the
 * Database types via `supabase gen types`, you can delete this file.
 */

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  tags: string[];
  published: boolean;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type BlogPostInsert = Partial<Omit<BlogPostRow, "id" | "created_at" | "updated_at">> & {
  slug: string;
  title: string;
  content: string;
};

export type SiteSettingRow = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
};

export type ApiKeyRow = {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  key_hash: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};
