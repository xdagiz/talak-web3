-- 0010_admin_subscription_write.sql
-- Allows an authenticated admin to manage subscriptions on behalf of any user
-- (used by the Admin → Billing "grant a plan" flow). The existing
-- `subscriptions_admin_read_all` policy already covers SELECT; this adds the
-- INSERT/UPDATE/DELETE policies admin needs to grant/revoke paid plans.
-- The `subscriptions_to_billing_history` trigger is SECURITY DEFINER, so the
-- billing_history ledger line it appends is unaffected by RLS.

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_admin_insert" on public.subscriptions;
create policy "subscriptions_admin_insert"
  on public.subscriptions for insert
  to authenticated
  with check (public.has_role('admin', auth.uid()));

drop policy if exists "subscriptions_admin_update" on public.subscriptions;
create policy "subscriptions_admin_update"
  on public.subscriptions for update
  to authenticated
  using (public.has_role('admin', auth.uid()))
  with check (public.has_role('admin', auth.uid()));

drop policy if exists "subscriptions_admin_delete" on public.subscriptions;
create policy "subscriptions_admin_delete"
  on public.subscriptions for delete
  to authenticated
  using (public.has_role('admin', auth.uid()));
