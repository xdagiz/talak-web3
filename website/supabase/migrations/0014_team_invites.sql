-- talak-web3 — Real, token-based team invites.
-- ────────────────────────────────────────────────────────────────────────────
-- Idempotent. Apply via the Supabase SQL editor or `supabase db push`.
--
-- Adds:
--   • create_team_invite()        — owner creates a token invite for a project
--   • get_pending_invites()       — pending invites across my owned projects
--   • revoke_team_invite()        — owner/inviter revokes a pending invite
--   • get_invite_by_token()       — public lookup: who invited, which project
--   • accept_team_invite()        — accepted by the invited email; adds an
--                                   entry to project_members + notifies inviter
--   • get_project_team()          — owner + members for a project (who invited)
--   • get_my_projects()           — projects I own OR am a member of
--   • projects "member read" RLS  — invited members can read shared projects
--
-- Works with the existing team_invites / project_members tables from 0005
-- (both are re-created with `if not exists` so this applies on a fresh DB).

-- ─── BASE TABLES (idempotent re-declaration; no-op if 0005 already ran) ───────
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

-- ─── CREATE INVITE ───────────────────────────────────────────────────────────
create or replace function public.create_team_invite(
  _project_id uuid,
  _email      text,
  _role       text default 'editor'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user uuid := auth.uid();
  _mail text := lower(btrim(_email));
  _row  public.team_invites%rowtype;
begin
  if _user is null then
    raise exception 'not_authenticated';
  end if;
  if _role is null or _role not in ('admin','editor','viewer') then
    raise exception 'team_invite_invalid_role';
  end if;
  if _mail = '' or _mail not like '%@%' or _mail not like '%.%' then
    raise exception 'team_invite_invalid_email';
  end if;
  if not exists (select 1 from public.projects p where p.id = _project_id and p.user_id = _user) then
    raise exception 'team_invite_forbidden';
  end if;

  select * into _row from public.team_invites
   where project_id = _project_id
     and lower(email) = _mail
     and accepted_at is null
     and expires_at > now()
   limit 1;
  if found then
    raise exception 'team_invite_active';
  end if;

  insert into public.team_invites (project_id, email, role, invited_by)
  values (_project_id, _mail, _role, _user)
  returning * into _row;

  return jsonb_build_object('id', _row.id, 'token', _row.token, 'project_id', _row.project_id,
                            'email', _row.email, 'role', _row.role, 'expires_at', _row.expires_at);
end;
$$;

-- ─── PENDING INVITES ─────────────────────────────────────────────────────────
create or replace function public.get_pending_invites()
returns table (
  id              uuid,
  project_id      uuid,
  project_name    text,
  email           text,
  role            text,
  token           text,
  expires_at      timestamptz,
  created_at      timestamptz,
  invited_by_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ti.id,
    ti.project_id,
    coalesce(p.name, 'Deleted project'),
    ti.email,
    ti.role,
    ti.token,
    ti.expires_at,
    ti.created_at,
    pr.full_name
  from public.team_invites ti
  join public.projects p on p.id = ti.project_id
  left join public.profiles pr on pr.user_id = ti.invited_by
  where ti.accepted_at is null
    and ti.expires_at > now()
    and (p.user_id = auth.uid() or ti.invited_by = auth.uid())
  order by ti.created_at desc;
$$;

-- ─── REVOKE INVITE ───────────────────────────────────────────────────────────
create or replace function public.revoke_team_invite(_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _user uuid := auth.uid();
begin
  if _user is null then
    raise exception 'not_authenticated';
  end if;
  delete from public.team_invites ti
   where ti.id = _invite_id
     and (exists (select 1 from public.projects p
                  where p.id = ti.project_id and p.user_id = _user)
          or ti.invited_by = _user);
end;
$$;

-- ─── PUBLIC INVITE LOOKUP (who invited you, which project, what role) ────────
create or replace function public.get_invite_by_token(_token text)
returns table (
  project_id   uuid,
  project_name text,
  role         text,
  email        text,
  expires_at   timestamptz,
  accepted     boolean,
  expired      boolean,
  inviter_name   text,
  inviter_avatar text,
  inviter_email  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ti.project_id,
    p.name,
    ti.role,
    ti.email,
    ti.expires_at,
    (ti.accepted_at is not null) as accepted,
    (ti.expires_at <= now())     as expired,
    pr.full_name,
    pr.avatar_url,
    (select u.email from auth.users u where u.id = ti.invited_by) as inviter_email
  from public.team_invites ti
  join public.projects p on p.id = ti.project_id
  left join public.profiles pr on pr.user_id = ti.invited_by
  where ti.token = _token
  limit 1;
$$;

-- ─── ACCEPT INVITE ───────────────────────────────────────────────────────────
create or replace function public.accept_team_invite(_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _user    uuid := auth.uid();
  _email   text := lower(coalesce(nullif(trim(auth.jwt() ->> 'email'), ''), ''));
  _inv     public.team_invites%rowtype;
  _added   boolean := false;
  _project text;
  _who     text;
begin
  if _user is null then
    raise exception 'not_authenticated';
  end if;

  select * into _inv from public.team_invites where token = _token;
  if not found then
    raise exception 'team_invite_not_found';
  end if;
  if _inv.accepted_at is not null then
    raise exception 'team_invite_accepted';
  end if;
  if _inv.expires_at <= now() then
    raise exception 'team_invite_expired';
  end if;
  if _email = '' or _email <> lower(_inv.email) then
    raise exception 'team_invite_email_mismatch';
  end if;

  insert into public.project_members (project_id, user_id, role, invited_by)
  values (_inv.project_id, _user, _inv.role, _inv.invited_by)
  on conflict (project_id, user_id) do nothing
  returning true into _added;

  update public.team_invites set accepted_at = now() where id = _inv.id;

  select p.name into _project from public.projects where id = _inv.project_id;
  select pro.full_name into _who from public.profiles pro where pro.user_id = _user;

  -- Notify the inviter that their invite was accepted.
  insert into public.notifications (user_id, kind, title, body, href)
  values (
    _inv.invited_by,
    'team',
    'Someone joined "' || coalesce(_project, 'your project') || '"',
    coalesce(_who, 'A teammate') || ' accepted your invite.',
    '/team'
  );

  return jsonb_build_object(
    'project_id', _inv.project_id,
    'project_name', _project,
    'role', _inv.role,
    'member', coalesce(_added, false)
  );
end;
$$;

-- ─── PROJECT TEAM ROSTER (owner + members, with inviter) ────────────────────
create or replace function public.get_project_team(_project_id uuid)
returns table (
  user_id         uuid,
  full_name       text,
  avatar_url      text,
  job_title       text,
  role            text,
  invited_by      uuid,
  invited_by_name text,
  joined_at       timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from public.projects pr where pr.id = _project_id and pr.user_id = auth.uid()
    union all
    select 1 from public.project_members m where m.project_id = _project_id and m.user_id = auth.uid()
  ) then
    raise exception 'team_project_forbidden';
  end if;

  return query
    select
      p.user_id,
      pr.full_name,
      pr.avatar_url,
      pr.job_title,
      'owner'::text,
      null::uuid,
      null::text,
      p.created_at
    from public.projects p
    left join public.profiles pr on pr.user_id = p.user_id
    where p.id = _project_id
    union all
    select
      m.user_id,
      pr.full_name,
      pr.avatar_url,
      pr.job_title,
      m.role,
      m.invited_by,
      ipr.full_name,
      m.joined_at
    from public.project_members m
    left join public.profiles pr  on pr.user_id  = m.user_id
    left join public.profiles ipr on ipr.user_id = m.invited_by
    where m.project_id = _project_id
    order by joined_at asc;
end;
$$;

-- ─── PROJECTS I OWN OR BELONG TO ─────────────────────────────────────────────
create or replace function public.get_my_projects()
returns setof public.projects
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.projects p
  where p.user_id = auth.uid()
     or exists (
       select 1 from public.project_members m
       where m.project_id = p.id and m.user_id = auth.uid()
     )
  order by p.created_at desc;
$$;

-- ─── MEMBER READ RLS ON PROJECTS ─────────────────────────────────────────────
-- Lets accepted team members read shared projects, their events, webhooks etc.
drop policy if exists "projects member read" on public.projects;
create policy "projects member read" on public.projects for select
  to authenticated using (
    exists (
      select 1 from public.project_members m
      where m.project_id = public.projects.id and m.user_id = auth.uid()
    )
  );

-- ─── REALTIME FOR TEAM TABLES ────────────────────────────────────────────────
do $$
declare t text;
begin
  for t in select unnest(array['team_invites','project_members','notifications'])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;

-- ─── GRANTS ──────────────────────────────────────────────────────────────────
revoke execute on function public.create_team_invite(uuid, text, text) from public, anon;
grant  execute on function public.create_team_invite(uuid, text, text) to authenticated;

revoke execute on function public.get_pending_invites() from public, anon;
grant  execute on function public.get_pending_invites() to authenticated;

revoke execute on function public.revoke_team_invite(uuid) from public, anon;
grant  execute on function public.revoke_team_invite(uuid) to authenticated;

revoke execute on function public.get_invite_by_token(text) from public;
grant  execute on function public.get_invite_by_token(text) to anon, authenticated;

revoke execute on function public.accept_team_invite(text) from public, anon;
grant  execute on function public.accept_team_invite(text) to authenticated;

revoke execute on function public.get_project_team(uuid) from public, anon;
grant  execute on function public.get_project_team(uuid) to authenticated;

revoke execute on function public.get_my_projects() from public, anon;
grant  execute on function public.get_my_projects() to authenticated;