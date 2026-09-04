-- talak-web3 — Dashboard extensions: integrations, workspace_settings, usage_metrics.
-- ────────────────────────────────────────────────────────────────────────────
-- Idempotent. Apply via the Supabase SQL editor or `supabase db push`.

-- ─── INTEGRATIONS ───────────────────────────────────────────────────────────
-- External service connections (GitHub, Discord, TheGraph, Alchemy/Infura).
-- One row per (user, service) optionally scoped to a project. Status drives the
-- Connect/Disconnect/Syncing UI badges. Tokens are stored (encrypted placeholder)
-- so Connect is a persisted, reversible action rather than pure UI state.
create table if not exists public.integrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  type          text not null,   -- github | discord | thegraph | alchemy
  config        jsonb not null default '{}'::jsonb,
  status        text not null default 'disconnected'
                  check (status in ('connected','disconnected','syncing','error')),
  token_encrypted text,
  connected_at  timestamptz,
  last_sync_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, project_id, type)
);

create index if not exists integrations_user_idx on public.integrations (user_id);
create index if not exists integrations_project_idx on public.integrations (project_id, type);

alter table public.integrations enable row level security;

drop policy if exists "integrations self read" on public.integrations;
create policy "integrations self read" on public.integrations for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "integrations self insert" on public.integrations;
create policy "integrations self insert" on public.integrations for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "integrations self update" on public.integrations;
create policy "integrations self update" on public.integrations for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "integrations self delete" on public.integrations;
create policy "integrations self delete" on public.integrations for delete
  to authenticated using (auth.uid() = user_id);

-- ─── WORKSPACE SETTINGS ─────────────────────────────────────────────────────
-- User preferences (default chain, notification toggles, theme). Writes use
-- upsert so a single row exists per authenticated user.
create table if not exists public.workspace_settings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  default_chain integer not null default 1,
  notifications jsonb not null default '{"email": true, "rpc_alerts": false, "webhook_failures": true}'::jsonb,
  theme         text not null default 'dark',
  updated_at    timestamptz not null default now(),
  unique (user_id)
);

alter table public.workspace_settings enable row level security;

drop policy if exists "workspace_settings self read" on public.workspace_settings;
create policy "workspace_settings self read" on public.workspace_settings for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "workspace_settings self insert" on public.workspace_settings;
create policy "workspace_settings self insert" on public.workspace_settings for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "workspace_settings self update" on public.workspace_settings;
create policy "workspace_settings self update" on public.workspace_settings for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── USAGE METRICS ──────────────────────────────────────────────────────────
-- Per-request RPC usage for charts/analytics. Preferred over the raw rpc_logs
-- table for aggregations so charts stay cheap and queryable by project+chain.
create table if not exists public.usage_metrics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  chain_id      integer not null,
  method        text not null,
  status        text not null check (status in ('success','error')),
  duration_ms   integer not null default 0,
  timestamp     timestamptz not null default now()
);

create index if not exists usage_metrics_user_idx on public.usage_metrics (user_id, timestamp desc);
create index if not exists usage_metrics_project_idx on public.usage_metrics (project_id, timestamp desc);
create index if not exists usage_metrics_chain_idx on public.usage_metrics (project_id, chain_id, timestamp desc);

alter table public.usage_metrics enable row level security;

drop policy if exists "usage_metrics self read" on public.usage_metrics;
create policy "usage_metrics self read" on public.usage_metrics for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "usage_metrics self insert" on public.usage_metrics;
create policy "usage_metrics self insert" on public.usage_metrics for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "usage_metrics self delete" on public.usage_metrics;
create policy "usage_metrics self delete" on public.usage_metrics for delete
  to authenticated using (auth.uid() = user_id);

-- Add the new tables to realtime so dashboards can subscribe live.
alter publication supabase_realtime add table public.integrations;
alter publication supabase_realtime add table public.workspace_settings;
alter publication supabase_realtime add table public.usage_metrics;
