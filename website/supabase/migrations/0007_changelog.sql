-- talak-web3 — Changelog
-- Idempotent migration. Apply via the Supabase SQL editor or `supabase db push`.

-- ─── CHANGELOG ENTRIES ────────────────────────────────────────────────────────
create table if not exists public.changelog_entries (
  id          uuid primary key default gen_random_uuid(),
  version     text not null unique,
  date        timestamptz not null default now(),
  kind        text not null default 'patch',
  headline    text not null,
  highlights  text[] not null default '{}',
  details     text not null default '',
  upgrade     text,
  cover_url   text,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists changelog_published_idx on public.changelog_entries (published, date desc);
create index if not exists changelog_version_idx on public.changelog_entries (version);

alter table public.changelog_entries enable row level security;

drop policy if exists "changelog public read published" on public.changelog_entries;
create policy "changelog public read published"
  on public.changelog_entries for select
  using (published = true);

drop policy if exists "changelog admin read all" on public.changelog_entries;
create policy "changelog admin read all"
  on public.changelog_entries for select
  to authenticated
  using (public.has_role('admin', auth.uid()));

drop policy if exists "changelog admin insert" on public.changelog_entries;
create policy "changelog admin insert"
  on public.changelog_entries for insert
  to authenticated
  with check (public.has_role('admin', auth.uid()));

drop policy if exists "changelog admin update" on public.changelog_entries;
create policy "changelog admin update"
  on public.changelog_entries for update
  to authenticated
  using (public.has_role('admin', auth.uid()))
  with check (public.has_role('admin', auth.uid()));

drop policy if exists "changelog admin delete" on public.changelog_entries;
create policy "changelog admin delete"
  on public.changelog_entries for delete
  to authenticated
  using (public.has_role('admin', auth.uid()));

create or replace function public.touch_changelog_entries_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_changelog_entries_updated_at on public.changelog_entries;
create trigger trg_changelog_entries_updated_at
  before update on public.changelog_entries
  for each row execute procedure public.touch_changelog_entries_updated_at();

-- ─── REALTIME PUBLICATION ──────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  for t in
    select unnest(array['changelog_entries'])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
