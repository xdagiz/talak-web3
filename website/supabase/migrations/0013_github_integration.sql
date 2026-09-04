-- 0013_github_integration.sql
-- Real "Connect GitHub" persistence for the Integrations page.
--
-- The OAuth handshake itself runs on the Hono backend (client secret stays
-- server-side). When the code is exchanged, the backend calls this
-- SECURITY DEFINER function so a user's own anon key can write/update their
-- OWN `integrations` row — RLS on that table is self-scoped to auth.uid(), so a
-- normal insert through the anon key would only ever work for the current user
-- anyway; SECURITY DEFINER makes the write deterministic and lets the backend
-- persist the token without any service-role key.
--
-- A user may only connect for themselves (p_user_id must equal auth.uid()).

create or replace function public.complete_github_connect(
  p_user_id uuid,
  p_project_id uuid,
  p_token text,
  p_username text,
  p_avatar_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid;
  v_now timestamptz := now();
begin
  -- A user cannot open a connection on behalf of another account.
  if p_user_id is distinct from auth.uid() then
    raise exception 'permission denied for function complete_github_connect';
  end if;

  if p_token is null or p_token = '' then
    raise exception 'github access token required';
  end if;

  -- Look up any existing github row for (user, project). `project_id` null
  -- means "workspace-wide"; the backend may call with either.
  select id into v_id
  from public.integrations
  where user_id = p_user_id
    and type = 'github'
    and project_id is not distinct from p_project_id
  limit 1;

  if v_id is null then
    insert into public.integrations (
      user_id, project_id, type, status, token_encrypted,
      config, connected_at, last_sync_at
    ) values (
      p_user_id, p_project_id, 'github', 'connected', p_token,
      jsonb_build_object(
        'name', 'GitHub',
        'username', p_username,
        'avatar_url', p_avatar_url,
        'scopes', jsonb_build_array('repo:status','read:user')
      ),
      v_now, v_now
    )
    returning id into v_id;
  else
    update public.integrations
      set status = 'connected',
          token_encrypted = p_token,
          connected_at = v_now,
          last_sync_at = v_now,
          config = jsonb_build_object(
            'name', 'GitHub',
            'username', p_username,
            'avatar_url', p_avatar_url,
            'scopes', jsonb_build_array('repo:status','read:user')
          )
    where id = v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function public.complete_github_connect(uuid, uuid, text, text, text) to authenticated;

revoke execute on function public.complete_github_connect(uuid, uuid, text, text, text) from public;
