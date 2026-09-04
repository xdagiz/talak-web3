-- 0012_fix_subscriptions_rls.sql
-- Fixes "infinite recursion detected in policy for relation user_roles".
--
-- Root cause: `subscriptions_admin_read_all` (from 0004) checked admin-ness via an
-- inline subquery on `public.user_roles`. That subquery is itself subject to
-- `user_roles` RLS, whose "user_roles admin read"/"write" policies call
-- `public.has_role('admin', auth.uid())`, which re-reads `user_roles` -> infinite
-- recursion. Even a normal user's SELECT on `subscriptions` evaluated this policy
-- and died, so the billing/current-plan read always returned null ("Hobby").
--
-- Fix: route the admin check through the SECURITY DEFINER `has_role()` function,
-- whose internal read bypasses RLS, breaking the recursion.
--
-- Also guarantees `has_role` is SECURITY DEFINER + pinned search_path so no other
-- RLS function re-enters a protected table.

grant execute on function public.has_role(public.app_role, uuid) to authenticated;

-- Guarantee the canonical admin check is SECURITY DEFINER (bypasses RLS on its
-- internal `user_roles` read) and pinned to the public schema so policy
-- expressions that call it never re-enter a protected table.
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

drop policy if exists "subscriptions_admin_read_all" on public.subscriptions;
create policy "subscriptions_admin_read_all"
  on public.subscriptions for select
  to authenticated
  using (public.has_role('admin', auth.uid()));
