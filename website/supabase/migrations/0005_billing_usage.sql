-- talak-web3 — Billing history, usage counters, team invites, project members,
-- notifications, and audit logs.
-- ────────────────────────────────────────────────────────────────────────────
-- Idempotent. Apply via the Supabase SQL editor or `supabase db push`.

-- ─── BILLING HISTORY ─────────────────────────────────────────────────────────
-- One row per attempted/captured payment. Distinct from `subscriptions`,
-- which only holds the *current* state per user.
create table if not exists public.billing_history (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  subscription_id       uuid references public.subscriptions(id) on delete set null,
  amount_cents          integer not null check (amount_cents >= 0),
  currency              text not null default 'usd',
  payment_method        text not null check (payment_method in ('stripe','crypto')),
  payment_provider_id   text,         -- stripe charge / payment-intent id, or tx hash
  chain_id              integer,      -- crypto only
  status                text not null default 'succeeded'
                          check (status in ('pending','succeeded','failed','refunded')),
  description           text,
  invoice_url           text,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists billing_history_user_idx
  on public.billing_history (user_id, created_at desc);
create index if not exists billing_history_status_idx
  on public.billing_history (status, created_at desc);

alter table public.billing_history enable row level security;

drop policy if exists "billing_history self read" on public.billing_history;
create policy "billing_history self read" on public.billing_history for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "billing_history self insert" on public.billing_history;
create policy "billing_history self insert" on public.billing_history for insert
  to authenticated with check (auth.uid() = user_id);

-- ─── USAGE COUNTERS ──────────────────────────────────────────────────────────
-- Rolling per-project per-month counter for billable units (RPC calls,
-- webhook deliveries, AI tokens, etc.). Single row per (user, project,
-- period_start, metric).
create table if not exists public.usage_counters (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  metric        text not null check (metric in ('rpc_calls','webhook_deliveries','ai_tokens','realtime_messages','tx_submitted')),
  period_start  date not null,                -- first day of billing month
  value         bigint not null default 0 check (value >= 0),
  updated_at    timestamptz not null default now(),
  unique (user_id, project_id, metric, period_start)
);

create index if not exists usage_counters_user_idx
  on public.usage_counters (user_id, period_start desc);

alter table public.usage_counters enable row level security;

drop policy if exists "usage_counters self read" on public.usage_counters;
create policy "usage_counters self read" on public.usage_counters for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "usage_counters self upsert" on public.usage_counters;
create policy "usage_counters self upsert" on public.usage_counters for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "usage_counters self update" on public.usage_counters;
create policy "usage_counters self update" on public.usage_counters for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atomic increment helper — preferred over read-modify-write from the client.
create or replace function public.increment_usage(
  _project_id uuid,
  _metric     text,
  _delta      bigint default 1
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  _user uuid := auth.uid();
  _period date := date_trunc('month', now())::date;
  _val    bigint;
begin
  if _user is null then
    raise exception 'must be authenticated';
  end if;

  insert into public.usage_counters (user_id, project_id, metric, period_start, value, updated_at)
  values (_user, _project_id, _metric, _period, _delta, now())
  on conflict (user_id, project_id, metric, period_start)
  do update set value = public.usage_counters.value + excluded.value,
                updated_at = now()
  returning value into _val;

  return _val;
end;
$$;

-- ─── PROJECT MEMBERS (multi-user projects) ───────────────────────────────────
create table if not exists public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'editor' check (role in ('owner','admin','editor','viewer')),
  invited_by  uuid references auth.users(id) on delete set null,
  joined_at   timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members (user_id);
create index if not exists project_members_project_idx on public.project_members (project_id);

alter table public.project_members enable row level security;

drop policy if exists "project_members self read" on public.project_members;
create policy "project_members self read" on public.project_members for select
  to authenticated using (
    auth.uid() = user_id
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id    = auth.uid()
    )
    or exists (
      select 1 from public.projects p
      where p.id = project_members.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "project_members owner write" on public.project_members;
create policy "project_members owner write" on public.project_members for all
  to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = project_members.project_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = project_members.project_id and p.user_id = auth.uid()
    )
  );

-- ─── TEAM INVITES ────────────────────────────────────────────────────────────
create table if not exists public.team_invites (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  email        text not null,
  role         text not null default 'editor' check (role in ('admin','editor','viewer')),
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by   uuid not null references auth.users(id) on delete cascade,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists team_invites_project_idx on public.team_invites (project_id);
create index if not exists team_invites_email_idx   on public.team_invites (lower(email));

alter table public.team_invites enable row level security;

drop policy if exists "team_invites owner all" on public.team_invites;
create policy "team_invites owner all" on public.team_invites for all
  to authenticated using (
    invited_by = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = team_invites.project_id and p.user_id = auth.uid()
    )
  ) with check (
    invited_by = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = team_invites.project_id and p.user_id = auth.uid()
    )
  );

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('billing','security','project','system','team','tx')),
  title       text not null,
  body        text,
  href        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications self read" on public.notifications;
create policy "notifications self read" on public.notifications for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "notifications self update" on public.notifications;
create policy "notifications self update" on public.notifications for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications self insert" on public.notifications;
create policy "notifications self insert" on public.notifications for insert
  to authenticated with check (auth.uid() = user_id);

-- Mark all as read in one round-trip.
create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare _n integer;
begin
  if auth.uid() is null then return 0; end if;
  with upd as (
    update public.notifications
       set read_at = now()
     where user_id = auth.uid() and read_at is null
     returning 1
  )
  select count(*) into _n from upd;
  return _n;
end;
$$;

-- ─── ADMIN AUDIT LOGS ────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,                 -- e.g. 'user.role.assigned'
  target_type text,                           -- e.g. 'user', 'project', 'blog_post'
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx  on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs admin read" on public.audit_logs;
create policy "audit_logs admin read" on public.audit_logs for select
  to authenticated using (public.has_role('admin', auth.uid()));

drop policy if exists "audit_logs self insert" on public.audit_logs;
create policy "audit_logs self insert" on public.audit_logs for insert
  to authenticated with check (auth.uid() = actor_id or actor_id is null);

-- ─── SUBSCRIPTION ↔ BILLING_HISTORY trigger ──────────────────────────────────
-- When a subscription row is created, append a billing_history line so the
-- user's payment ledger always reflects the latest charge.
create or replace function public.subscriptions_to_billing_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.billing_history (
    user_id, subscription_id, amount_cents, currency,
    payment_method, payment_provider_id, chain_id, status, description, metadata
  ) values (
    new.user_id, new.id, new.amount_cents, new.currency,
    new.payment_method, new.payment_provider_id, new.chain_id,
    case when new.status in ('active','trialing') then 'succeeded'
         when new.status = 'past_due' then 'failed'
         else 'pending' end,
    'Subscription: ' || new.tier || ' (' || new.billing_period || ')',
    new.metadata
  );
  return new;
end;
$$;

drop trigger if exists trg_subscriptions_to_billing_history on public.subscriptions;
create trigger trg_subscriptions_to_billing_history
  after insert on public.subscriptions
  for each row execute function public.subscriptions_to_billing_history();
