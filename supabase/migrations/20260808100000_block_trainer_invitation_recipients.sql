-- A TRAINER invitation always creates a client-side relationship. Existing
-- TRAINER accounts must therefore neither receive nor accept that invitation.

create or replace function public.accept_trainer_invitation(p_token text, p_user_id uuid)
returns table (result text, trainer_id uuid, trainer_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.trainer_invitations%rowtype;
  v_existing_trainer uuid;
  v_trainer_name text;
  v_user_email text;
  v_user_role text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'forbidden'; end if;
  select * into v_invite from public.trainer_invitations where token = p_token for update;
  if not found then return query select 'not_found', null::uuid, null::text; return; end if;
  select p.name into v_trainer_name from public.profiles p where p.id = v_invite.trainer_id;
  if v_invite.status = 'accepted' and v_invite.accepted_by = p_user_id then
    update public.notification_log nl set response = 'accepted', response_at = coalesce(nl.response_at, now())
      where nl.entity_type = 'trainer_invitation' and nl.entity_id = v_invite.id and nl.to_user_id = auth.uid() and nl.response is null;
    return query select 'already_accepted', v_invite.trainer_id, v_trainer_name; return;
  end if;
  if v_invite.status = 'revoked' then return query select 'revoked', null::uuid, null::text; return; end if;
  if v_invite.status <> 'sent' or v_invite.expires_at < now() then return query select 'expired', null::uuid, null::text; return; end if;
  select email into v_user_email from auth.users where id = p_user_id;
  if v_user_email is null or lower(v_user_email) <> lower(v_invite.invited_email) then return query select 'email_mismatch', null::uuid, null::text; return; end if;
  select p.role into v_user_role from public.profiles p where p.id = p_user_id;
  if v_user_role is distinct from 'client' then return query select 'recipient_not_client', null::uuid, null::text; return; end if;
  select tc.trainer_id into v_existing_trainer from public.trainer_clients tc where tc.client_id = p_user_id and tc.status = 'active' limit 1;
  if v_existing_trainer is not null and v_existing_trainer <> v_invite.trainer_id then return query select 'already_linked_elsewhere', null::uuid, null::text; return; end if;
  insert into public.trainer_clients (trainer_id, client_id, status, invited_at)
  values (v_invite.trainer_id, p_user_id, 'active', v_invite.created_at)
  on conflict on constraint trainer_clients_trainer_id_client_id_key do update set status = 'active';
  update public.trainer_invitations set status = 'accepted', accepted_at = now(), accepted_by = p_user_id where id = v_invite.id;
  update public.notification_log nl set response = 'accepted', response_at = now()
    where nl.entity_type = 'trainer_invitation' and nl.entity_id = v_invite.id and nl.to_user_id = auth.uid() and nl.response is null;
  return query select 'accepted', v_invite.trainer_id, v_trainer_name;
end;
$$;
