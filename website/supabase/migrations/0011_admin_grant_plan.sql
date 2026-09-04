-- 0011_admin_grant_plan.sql
-- Atomic "grant a paid plan" for the Admin → Billing flow.
-- SECURITY DEFINER so it can write any user's subscription regardless of RLS,
-- and it runs both the cancel and the insert in a single transaction so the
-- `subscriptions_one_active_per_user` partial-unique index can never collide.

create or replace function public.admin_grant_plan(p_user_id uuid, p_tier text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text := p_tier;
  v_id   uuid;
  v_now  timestamptz := now();
  v_end  timestamptz := now() + interval '1 year';
begin
  -- Only an admin may call this (enforced here rather than via grants because
  -- `security definer` functions are not automatically restricted to the admin).
  if not public.has_role('admin', auth.uid()) then
    raise exception 'permission denied for function admin_grant_plan';
  end if;

  if v_tier not in ('team','scale','enterprise') then
    raise exception 'invalid tier %', v_tier;
  end if;

  -- Soft-cancel any current active/trialing row(s).
  update public.subscriptions
    set status = 'canceled', cancel_at_period_end = true
  where user_id = p_user_id
    and status in ('active','trialing');

  -- Insert the admin-granted (free) active plan.
  insert into public.subscriptions (
    user_id, tier, status, billing_period, seats,
    amount_cents, currency, payment_method,
    current_period_start, current_period_end, cancel_at_period_end, metadata
  ) values (
    p_user_id, v_tier, 'active', 'annual', 1,
    0, 'usd', 'stripe',
    v_now, v_end, false,
    jsonb_build_object('admin_granted', true, 'granted_at', v_now)
  )
  returning id into v_id;

  -- Notify the granted user via a project_event (shows in the bell + Activity,
  -- and the grantee's client shows a live toast on its realtime INSERT).
  insert into public.project_events (user_id, type, level, message, metadata)
  values (
    p_user_id, 'system', 'success',
    'Your plan was upgraded to ' || initcap(v_tier) || ' active',
    jsonb_build_object('admin_granted', true, 'subscription_id', v_id)
  );

  return v_id;
end;
$$;

grant execute on function public.admin_grant_plan(uuid, text) to authenticated;

revoke execute on function public.admin_grant_plan(uuid, text) from public;

-- Enable row-level realtime for `subscriptions` so the grantee's client receives
-- the INSERT event. This drives the live "You're on the <Tier> plan" toast and the
-- live billing refresh without a page reload. Safe to run once; if the table is
-- already a member this statement is skipped via the NOTICE-less guard below.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'subscriptions'
  ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end $$;
