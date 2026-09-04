-- talak-web3 — Core foundational schema
-- ────────────────────────────────────────────────────────────────────────────
-- Idempotent migration. Apply via the Supabase SQL editor or `supabase db push`.
--
-- This file consolidates the foundational (pre-blog/projects) schema:
--   • profiles            — one row per auth user
--   • user_roles          — admin / moderator / user
--   • wallets             — linked wallet addresses per user
--   • sessions            — issued auth sessions (SIWE bridge)
--   • nonces              — single-use nonces for SIWE
--   • rpc_logs            — per-call observability
--   • analytics_events    — generic in-app analytics events
--   • helper functions    — has_role(), consume_nonce(), get_team_members()
--
-- Migrations 0002+ build on top of these tables. If your project already has
-- them (initial Supabase bootstrap), this file is a safe re-apply — every
-- statement uses `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS`.

-- ─── EXTENSIONS ───────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text,
  job_title   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_user_idx on public.profiles (user_id);

alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select
  using (true);

drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert" on public.profiles for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── USER ROLES ──────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     public.app_role not null default 'user',
  unique (user_id, role)
);

create index if not exists user_roles_user_idx on public.user_roles (user_id);

alter table public.user_roles enable row level security;

drop policy if exists "user_roles self read" on public.user_roles;
create policy "user_roles self read" on public.user_roles for select
  to authenticated using (auth.uid() = user_id);

-- has_role() is the canonical "am I allowed?" check.
create or replace function public.has_role(_role public.app_role, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

drop policy if exists "user_roles admin read" on public.user_roles;
create policy "user_roles admin read" on public.user_roles for select
  to authenticated using (public.has_role('admin', auth.uid()));

drop policy if exists "user_roles admin write" on public.user_roles;
create policy "user_roles admin write" on public.user_roles for all
  to authenticated using (public.has_role('admin', auth.uid()))
  with check (public.has_role('admin', auth.uid()));

-- ─── WALLETS ─────────────────────────────────────────────────────────────────
create table if not exists public.wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  address     text not null,
  chain_id    integer not null default 1,
  is_primary  boolean not null default false,
  label       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, address)
);

create index if not exists wallets_user_idx on public.wallets (user_id);

alter table public.wallets enable row level security;

drop policy if exists "wallets self all" on public.wallets;
create policy "wallets self all" on public.wallets for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── SESSIONS (SIWE bridge) ──────────────────────────────────────────────────
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  wallet_id     uuid references public.wallets(id) on delete set null,
  token_hash    text not null,
  ip_address    text,
  user_agent    text,
  issued_at     timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz
);

create index if not exists sessions_user_idx on public.sessions (user_id, issued_at desc);

alter table public.sessions enable row level security;

drop policy if exists "sessions self read" on public.sessions;
create policy "sessions self read" on public.sessions for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "sessions self revoke" on public.sessions;
create policy "sessions self revoke" on public.sessions for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── NONCES (single-use, EIP-4361) ───────────────────────────────────────────
create table if not exists public.nonces (
  id           uuid primary key default gen_random_uuid(),
  nonce        text not null unique,
  address      text not null,
  chain_id     integer not null default 1,
  issued_at    timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '15 minutes'),
  consumed_at  timestamptz
);

create index if not exists nonces_address_idx on public.nonces (address, issued_at desc);

alter table public.nonces enable row level security;

drop policy if exists "nonces public insert" on public.nonces;
create policy "nonces public insert" on public.nonces for insert
  to anon, authenticated with check (true);

drop policy if exists "nonces public select" on public.nonces;
create policy "nonces public select" on public.nonces for select
  to anon, authenticated using (true);

create or replace function public.consume_nonce(_address text, _nonce text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean := false;
begin
  update public.nonces
    set consumed_at = now()
    where nonce = _nonce
      and lower(address) = lower(_address)
      and consumed_at is null
      and expires_at > now()
    returning true into _ok;
  return coalesce(_ok, false);
end;
$$;

-- ─── RPC LOGS ────────────────────────────────────────────────────────────────
create table if not exists public.rpc_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  method          text not null,
  provider        text not null default 'unknown',
  chain_id        integer not null default 1,
  status          text not null default '200',
  latency_ms      integer not null default 0,
  error_message   text,
  created_at      timestamptz not null default now()
);

create index if not exists rpc_logs_user_idx on public.rpc_logs (user_id, created_at desc);
create index if not exists rpc_logs_status_idx on public.rpc_logs (status, created_at desc);

alter table public.rpc_logs enable row level security;

drop policy if exists "rpc_logs self read" on public.rpc_logs;
create policy "rpc_logs self read" on public.rpc_logs for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "rpc_logs self insert" on public.rpc_logs;
create policy "rpc_logs self insert" on public.rpc_logs for insert
  to authenticated with check (auth.uid() = user_id or user_id is null);

-- ─── ANALYTICS EVENTS ────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  wallet_id   uuid references public.wallets(id) on delete set null,
  event_type  text not null,
  properties  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_user_idx on public.analytics_events (user_id, created_at desc);
create index if not exists analytics_events_type_idx on public.analytics_events (event_type, created_at desc);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events self read" on public.analytics_events;
create policy "analytics_events self read" on public.analytics_events for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "analytics_events self insert" on public.analytics_events;
create policy "analytics_events self insert" on public.analytics_events for insert
  to authenticated with check (auth.uid() = user_id or user_id is null);

-- ─── TEAM MEMBERS HELPER (admin-only roster) ─────────────────────────────────
create or replace function public.get_team_members()
returns table (
  user_id    uuid,
  full_name  text,
  avatar_url text,
  job_title  text,
  role       text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.job_title,
    coalesce(r.role::text, 'user') as role
  from public.profiles p
  left join public.user_roles r on r.user_id = p.user_id
  order by p.created_at asc;
$$;
