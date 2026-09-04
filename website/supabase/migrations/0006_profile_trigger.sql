-- talak-web3 — Auto-provision profile + default role on signup
-- Idempotent migration. Apply via the Supabase SQL editor or `supabase db push`.
--
-- Without this trigger, brand-new auth users have no `profiles` row, so the
-- React `AuthContext.fetchProfile()` call returns null and pages like
-- /settings show empty fields. This trigger:
--   1. Inserts a profile row populated from `raw_user_meta_data.full_name`
--      (set by `supabase.auth.signUp({ options: { data: { full_name } } })`)
--      with a fallback to the part of the email before `@`.
--   2. Inserts a default `user_roles` row of role `user`.
--
-- The trigger is `SECURITY DEFINER` so it bypasses the row-level-security
-- policies on `profiles` and `user_roles` (which only allow self-insert).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _full_name text;
begin
  _full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  );

  insert into public.profiles (user_id, full_name)
  values (new.id, _full_name)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: make sure every existing auth user has a profile + role.
insert into public.profiles (user_id, full_name)
select u.id,
       coalesce(
         nullif(u.raw_user_meta_data->>'full_name', ''),
         nullif(u.raw_user_meta_data->>'name', ''),
         split_part(coalesce(u.email, ''), '@', 1),
         ''
       )
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null
on conflict (user_id) do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'user'::public.app_role
from auth.users u
left join public.user_roles r on r.user_id = u.id and r.role = 'user'
where r.user_id is null
on conflict (user_id, role) do nothing;
