-- talak-web3 — Projects, Project Events, Webhooks
-- Idempotent migration. Apply via the Supabase SQL editor or `supabase db push`.

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  slug         text not null,
  description  text,
  website      text,
  environment  text not null default 'development' check (environment in ('development','staging','production')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists projects_user_idx on public.projects (user_id, created_at desc);

alter table public.projects enable row level security;

drop policy if exists "projects self read" on public.projects;
create policy "projects self read" on public.projects for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "projects self insert" on public.projects;
create policy "projects self insert" on public.projects for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "projects self update" on public.projects;
create policy "projects self update" on public.projects for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects self delete" on public.projects;
create policy "projects self delete" on public.projects for delete
  to authenticated using (auth.uid() = user_id);

create or replace function public.touch_projects_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute procedure public.touch_projects_updated_at();

-- ─── PROJECT EVENTS (real-time activity feed) ────────────────────────────────
create table if not exists public.project_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  type        text not null check (type in ('rpc','tx','auth','webhook','deploy','system')),
  level       text not null default 'info' check (level in ('info','warn','error','success')),
  message     text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists project_events_user_idx on public.project_events (user_id, created_at desc);
create index if not exists project_events_project_idx on public.project_events (project_id, created_at desc);

alter table public.project_events enable row level security;

drop policy if exists "project_events self read" on public.project_events;
create policy "project_events self read" on public.project_events for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "project_events self insert" on public.project_events;
create policy "project_events self insert" on public.project_events for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "project_events self delete" on public.project_events;
create policy "project_events self delete" on public.project_events for delete
  to authenticated using (auth.uid() = user_id);

-- ─── WEBHOOKS ────────────────────────────────────────────────────────────────
create table if not exists public.webhooks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete cascade,
  url               text not null,
  events            text[] not null default '{tx.confirmed,auth.signed,rpc.error}',
  secret            text not null default encode(gen_random_bytes(24), 'hex'),
  enabled           boolean not null default true,
  last_status       int,
  last_delivered_at timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists webhooks_user_idx on public.webhooks (user_id, created_at desc);
create index if not exists webhooks_project_idx on public.webhooks (project_id);

alter table public.webhooks enable row level security;

drop policy if exists "webhooks self read" on public.webhooks;
create policy "webhooks self read" on public.webhooks for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "webhooks self insert" on public.webhooks;
create policy "webhooks self insert" on public.webhooks for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "webhooks self update" on public.webhooks;
create policy "webhooks self update" on public.webhooks for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "webhooks self delete" on public.webhooks;
create policy "webhooks self delete" on public.webhooks for delete
  to authenticated using (auth.uid() = user_id);

-- ─── REALTIME PUBLICATION ────────────────────────────────────────────────────
do $$
declare t text;
begin
  for t in
    select unnest(array['projects','project_events','webhooks'])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
