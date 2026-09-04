-- talak-web3 — Blog, Admin, Site Settings + API Keys
-- Idempotent migration. Apply via the Supabase SQL editor or `supabase db push`.

-- ─── BLOG POSTS ────────────────────────────────────────────────────────────────
create table if not exists public.blog_posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  excerpt     text,
  content     text not null default '',
  cover_url   text,
  tags        text[] not null default '{}',
  published   boolean not null default false,
  author_id   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists blog_posts_published_idx on public.blog_posts (published, published_at desc);
create index if not exists blog_posts_slug_idx on public.blog_posts (slug);

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts public read published" on public.blog_posts;
create policy "blog_posts public read published"
  on public.blog_posts for select
  using (published = true);

drop policy if exists "blog_posts admin read all" on public.blog_posts;
create policy "blog_posts admin read all"
  on public.blog_posts for select
  to authenticated
  using (public.has_role('admin', auth.uid()));

drop policy if exists "blog_posts admin insert" on public.blog_posts;
create policy "blog_posts admin insert"
  on public.blog_posts for insert
  to authenticated
  with check (public.has_role('admin', auth.uid()));

drop policy if exists "blog_posts admin update" on public.blog_posts;
create policy "blog_posts admin update"
  on public.blog_posts for update
  to authenticated
  using (public.has_role('admin', auth.uid()))
  with check (public.has_role('admin', auth.uid()));

drop policy if exists "blog_posts admin delete" on public.blog_posts;
create policy "blog_posts admin delete"
  on public.blog_posts for delete
  to authenticated
  using (public.has_role('admin', auth.uid()));

create or replace function public.touch_blog_posts_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute procedure public.touch_blog_posts_updated_at();

-- ─── SITE SETTINGS (singleton key/value) ───────────────────────────────────────
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read"
  on public.site_settings for select
  using (true);

drop policy if exists "site_settings admin write" on public.site_settings;
create policy "site_settings admin write"
  on public.site_settings for all
  to authenticated
  using (public.has_role('admin', auth.uid()))
  with check (public.has_role('admin', auth.uid()));

-- Seed defaults (idempotent)
insert into public.site_settings (key, value) values
  ('hero',             '{"badge":"v1.0 — production ready","title":"The all-in-one Web3 SDK","subtitle":"Auth · RPC · Tx · Identity · AI agents — one cohesive surface."}'::jsonb),
  ('announcement',     '{"enabled":false,"text":"","href":""}'::jsonb),
  ('socials',          '{"github":"https://github.com/dagimabebe/talak-web3","x":"","discord":""}'::jsonb)
on conflict (key) do nothing;

-- ─── API KEYS (per-user) ───────────────────────────────────────────────────────
create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  prefix        text not null,
  key_hash      text not null,
  scopes        text[] not null default '{rpc,read}',
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index if not exists api_keys_user_idx on public.api_keys (user_id, created_at desc);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys self read" on public.api_keys;
create policy "api_keys self read" on public.api_keys for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "api_keys self insert" on public.api_keys;
create policy "api_keys self insert" on public.api_keys for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "api_keys self update" on public.api_keys;
create policy "api_keys self update" on public.api_keys for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "api_keys self delete" on public.api_keys;
create policy "api_keys self delete" on public.api_keys for delete
  to authenticated using (auth.uid() = user_id);

-- ─── REALTIME PUBLICATION ──────────────────────────────────────────────────────
-- Add the new tables (and existing dashboard tables) to the realtime publication.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'blog_posts',
      'site_settings',
      'api_keys',
      'wallets',
      'rpc_logs',
      'sessions'
    ])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
