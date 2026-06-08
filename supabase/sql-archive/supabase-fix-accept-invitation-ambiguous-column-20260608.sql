-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: accept_trainer_invitation() — "column reference trainer_id is ambiguous"
--
-- The function declares RETURNS TABLE(result text, trainer_id uuid, trainer_name text).
-- That output column `trainer_id` collided with `trainer_clients.trainer_id` in
-- TWO places:
--
--   1. `select trainer_id into v_existing_trainer from trainer_clients ...`
--      → fixed by qualifying as `tc.trainer_id` (alias).
--
--   2. `insert into trainer_clients (trainer_id, client_id, ...)
--        on conflict (trainer_id, client_id) do update ...`
--      → the ON CONFLICT column-list target was ambiguous against the
--        function's own output column. Fixed by referencing the unique
--        constraint by NAME instead: `on conflict on constraint
--        trainer_clients_trainer_id_client_id_key do update ...`
--
-- Either ambiguity caused Postgres to throw on every call, silently breaking
-- invitation acceptance — the UI caught the error and reverted to the 'ready'
-- phase, looking like a no-op/loop ("clica e volta pra mesma tela").
--
-- Discovered live during the Fase 1 retest of the post-invite-onboarding QA
-- plan (policies/references/post-invite-onboarding-qa-20260608.md).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function accept_trainer_invitation(p_token text, p_user_id uuid)
returns table (result text, trainer_id uuid, trainer_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite trainer_invitations%rowtype;
  v_existing_trainer uuid;
  v_trainer_name text;
  v_user_email text;
begin
  select * into v_invite from trainer_invitations where token = p_token for update;

  if not found then
    return query select 'not_found', null::uuid, null::text;
    return;
  end if;

  select p.name into v_trainer_name from profiles p where p.id = v_invite.trainer_id;

  if v_invite.status = 'accepted' and v_invite.accepted_by = p_user_id then
    return query select 'already_accepted', v_invite.trainer_id, v_trainer_name;
    return;
  end if;

  if v_invite.status = 'revoked' then
    return query select 'revoked', null::uuid, null::text;
    return;
  end if;

  if v_invite.status <> 'sent' or v_invite.expires_at < now() then
    return query select 'expired', null::uuid, null::text;
    return;
  end if;

  select email into v_user_email from auth.users where id = p_user_id;

  if v_user_email is null or lower(v_user_email) <> lower(v_invite.invited_email) then
    return query select 'email_mismatch', null::uuid, null::text;
    return;
  end if;

  select tc.trainer_id into v_existing_trainer
    from trainer_clients tc
    where tc.client_id = p_user_id and tc.status = 'active'
    limit 1;

  if v_existing_trainer is not null and v_existing_trainer <> v_invite.trainer_id then
    return query select 'already_linked_elsewhere', null::uuid, null::text;
    return;
  end if;

  insert into trainer_clients (trainer_id, client_id, status, invited_at)
  values (v_invite.trainer_id, p_user_id, 'active', v_invite.created_at)
  on conflict on constraint trainer_clients_trainer_id_client_id_key do update
    set status = 'active';

  update trainer_invitations
    set status = 'accepted', accepted_at = now(), accepted_by = p_user_id
    where id = v_invite.id;

  return query select 'accepted', v_invite.trainer_id, v_trainer_name;
end;
$$;
