-- Keep a recipient's Inbox action state aligned with trainer invitation state.
-- The token is scoped to the recipient's own RLS-protected notification row.

alter table public.notification_log drop constraint if exists notification_log_response_check;
alter table public.notification_log add constraint notification_log_response_check
  check (response is null or response in ('approved', 'rejected', 'accepted', 'declined', 'revoked', 'renewal_requested', 'resent', 'ignored'));

create or replace function public.create_trainer_in_app_invitation(
  p_client_id uuid
)
returns table (id uuid, status text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_invitation_id uuid;
  v_existing_expires_at timestamptz;
  v_expires_at timestamptz := now() + interval '7 days';
  v_token text;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not public.has_permission('manage_trainer_clients') then raise exception 'forbidden'; end if;

  select p.email, p.name into v_email, v_name
    from public.profiles p
    join public.trainer_discovery_preferences d on d.user_id = p.id
   where p.id = p_client_id and p.role = 'client' and d.discoverable = true;
  if v_email is null then raise exception 'candidate_not_available'; end if;
  if exists (select 1 from public.trainer_clients tc where tc.client_id = p_client_id and tc.status = 'active') then raise exception 'already_linked'; end if;

  select ti.id, ti.expires_at into v_invitation_id, v_existing_expires_at
    from public.trainer_invitations ti
   where ti.trainer_id = auth.uid() and lower(ti.invited_email) = lower(v_email)
     and ti.status = 'sent' and ti.expires_at > now()
   order by ti.created_at desc limit 1;

  if v_invitation_id is null then
    v_token := gen_random_uuid()::text;
    insert into public.trainer_invitations (trainer_id, invited_email, invited_name, token, status, expires_at, source)
    values (auth.uid(), v_email, coalesce(v_name, 'TrAIner user'), v_token, 'sent', v_expires_at, 'in_app')
    returning trainer_invitations.id into v_invitation_id;
    insert into public.notification_log (to_user_id, from_user_id, type, title, body, entity_type, entity_id, params, expires_at)
    values (p_client_id, auth.uid(), 'trainer_invitation', 'Trainer invitation', 'You have received a trainer invitation in TrAIner.', 'trainer_invitation', v_invitation_id, jsonb_build_object('invitationId', v_invitation_id, 'inviteToken', v_token), v_expires_at);
  else
    v_expires_at := v_existing_expires_at;
  end if;

  return query select v_invitation_id, 'sent'::text, v_expires_at;
end;
$$;

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

create or replace function public.revoke_trainer_invitation(p_invitation_id uuid)
returns table (id uuid, status text, revoked_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_id uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not public.has_permission('manage_trainer_clients') then raise exception 'forbidden'; end if;
  update public.trainer_invitations ti
     set status = 'revoked', revoked_at = now(), revoked_by = auth.uid()
   where ti.id = p_invitation_id and ti.trainer_id = auth.uid() and ti.status = 'sent'
   returning ti.id into v_invitation_id;
  if v_invitation_id is not null then
    update public.notification_log nl set response = 'revoked', response_at = now()
      where nl.entity_type = 'trainer_invitation' and nl.entity_id = v_invitation_id and nl.response is null;
  end if;
  return query
    select ti.id, ti.status, ti.revoked_at from public.trainer_invitations ti where ti.id = v_invitation_id;
end;
$$;

create table if not exists public.trainer_invitation_renewal_requests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.trainer_invitations(id) on delete restrict,
  trainer_id uuid not null references public.profiles(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'resent', 'ignored')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.profiles(id) on delete set null
);
alter table public.trainer_invitation_renewal_requests enable row level security;
revoke all on public.trainer_invitation_renewal_requests from anon, authenticated;

create or replace function public.request_trainer_invitation_renewal(p_token text)
returns table (id uuid, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_invitation public.trainer_invitations%rowtype;
  v_email text;
  v_request_id uuid;
  v_created_at timestamptz;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select * into v_invitation from public.trainer_invitations where token = p_token for update;
  if not found then raise exception 'not_found'; end if;
  select p.email into v_email from public.profiles p where p.id = auth.uid();
  if lower(coalesce(v_email, '')) <> lower(v_invitation.invited_email) then raise exception 'forbidden'; end if;
  if v_invitation.status <> 'sent' or v_invitation.expires_at >= now() then raise exception 'not_expired'; end if;
  if exists (select 1 from public.trainer_clients tc where tc.client_id = auth.uid() and tc.status = 'active') then raise exception 'already_linked'; end if;

  insert into public.trainer_invitation_renewal_requests (invitation_id, trainer_id, client_id)
  values (v_invitation.id, v_invitation.trainer_id, auth.uid())
  on conflict (invitation_id) do nothing
  returning trainer_invitation_renewal_requests.id, trainer_invitation_renewal_requests.created_at into v_request_id, v_created_at;
  if v_request_id is null then
    select r.id, r.created_at into v_request_id, v_created_at from public.trainer_invitation_renewal_requests r where r.invitation_id = v_invitation.id;
    return query select v_request_id, 'already_requested'::text, v_created_at;
    return;
  end if;

  insert into public.notification_log (to_user_id, from_user_id, type, title, body, entity_type, entity_id, template_key, params)
  values (v_invitation.trainer_id, auth.uid(), 'trainer_invitation_renewal_request', '', '', 'trainer_invitation_renewal_request', v_request_id, 'trainer_invitation_renewal_request', jsonb_build_object('requestId', v_request_id));
  return query select v_request_id, 'pending'::text, v_created_at;
end;
$$;

create or replace function public.respond_trainer_invitation_renewal(p_request_id uuid, p_resend boolean)
returns table (id uuid, status text, invitation_id uuid, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_request public.trainer_invitation_renewal_requests%rowtype;
  v_email text;
  v_name text;
  v_new_invitation_id uuid;
  v_token text;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not public.has_permission('manage_trainer_clients') then raise exception 'forbidden'; end if;
  select * into v_request from public.trainer_invitation_renewal_requests r where r.id = p_request_id and r.trainer_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if v_request.status <> 'pending' then return query select v_request.id, v_request.status, null::uuid, null::timestamptz; return; end if;

  update public.trainer_invitation_renewal_requests r
     set status = case when p_resend then 'resent' else 'ignored' end, responded_at = now(), responded_by = auth.uid()
   where r.id = v_request.id;
  update public.notification_log nl
     set response = case when p_resend then 'resent' else 'ignored' end, response_at = now()
   where nl.entity_type = 'trainer_invitation_renewal_request' and nl.entity_id = v_request.id and nl.to_user_id = auth.uid() and nl.response is null;

  if not p_resend then return query select v_request.id, 'ignored'::text, null::uuid, null::timestamptz; return; end if;
  if exists (select 1 from public.trainer_clients tc where tc.client_id = v_request.client_id and tc.status = 'active') then raise exception 'already_linked'; end if;
  select p.email, p.name into v_email, v_name from public.profiles p where p.id = v_request.client_id;
  if v_email is null then raise exception 'client_not_available'; end if;
  v_token := gen_random_uuid()::text;
  insert into public.trainer_invitations (trainer_id, invited_email, invited_name, token, status, expires_at, source)
  values (auth.uid(), v_email, coalesce(v_name, 'TrAIner user'), v_token, 'sent', v_expires_at, 'in_app')
  returning trainer_invitations.id into v_new_invitation_id;
  insert into public.notification_log (to_user_id, from_user_id, type, title, body, entity_type, entity_id, template_key, params, expires_at)
  values (v_request.client_id, auth.uid(), 'trainer_invitation', '', '', 'trainer_invitation', v_new_invitation_id, 'trainer_invitation', jsonb_build_object('invitationId', v_new_invitation_id, 'inviteToken', v_token), v_expires_at);
  return query select v_request.id, 'resent'::text, v_new_invitation_id, v_expires_at;
end;
$$;

-- Repair notifications created before acceptance was mirrored into the Inbox.
update public.notification_log nl
   set response = case ti.status when 'accepted' then 'accepted' when 'declined' then 'declined' when 'revoked' then 'revoked' else nl.response end,
       response_at = coalesce(nl.response_at, ti.accepted_at, ti.declined_at, ti.revoked_at, now())
  from public.trainer_invitations ti
 where nl.entity_type = 'trainer_invitation'
   and nl.entity_id = ti.id
   and nl.response is null
   and ti.status in ('accepted', 'declined', 'revoked');
