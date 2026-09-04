-- 0004_subscriptions.sql
-- Stores per-user subscription state for paid Talak plans.
-- Both Stripe and crypto checkouts insert/update rows here on success.

create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  tier                  text not null check (tier in ('hobby','team','scale','enterprise')),
  status                text not null default 'active'
                          check (status in ('trialing','active','past_due','canceled','incomplete')),
  billing_period        text not null default 'monthly'
                          check (billing_period in ('monthly','annual','one_time')),
  seats                 integer not null default 1 check (seats >= 1),
  amount_cents          integer not null default 0 check (amount_cents >= 0),
  currency              text    not null default 'usd',
  payment_method        text    not null check (payment_method in ('stripe','crypto')),
  payment_provider_id   text,                              -- stripe customer/sub id, or tx hash
  chain_id              integer,                           -- only for crypto payments
  current_period_start  timestamptz not null default now(),
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  metadata              jsonb   not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- A user only ever has one *active* row; older rows stay for history.
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions(user_id)
  where status in ('active','trialing');

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx  on public.subscriptions(status);

-- updated_at trigger
create or replace function public.tg_subscriptions_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.tg_subscriptions_set_updated_at();

-- Row Level Security
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins (user_roles.role = 'admin') can read everything for billing dashboards.
drop policy if exists "subscriptions_admin_read_all" on public.subscriptions;
create policy "subscriptions_admin_read_all"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );
