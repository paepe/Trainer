-- Persist the client-side state of an expired invitation. Without this,
-- optimistic Inbox state is lost after reload and the request action reappears.

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
    update public.notification_log nl
       set response = coalesce((select case r.status
                                         when 'pending' then 'renewal_requested'
                                         when 'resent' then 'resent'
                                         when 'ignored' then 'ignored'
                                       end
                                  from public.trainer_invitation_renewal_requests r
                                 where r.id = v_request_id), nl.response),
           response_at = coalesce(nl.response_at, now())
     where nl.entity_type = 'trainer_invitation'
       and nl.entity_id = v_invitation.id
       and nl.to_user_id = auth.uid()
       and nl.response is null;
    return query select v_request_id, 'already_requested'::text, v_created_at;
    return;
  end if;

  update public.notification_log nl
     set response = 'renewal_requested', response_at = now()
   where nl.entity_type = 'trainer_invitation'
     and nl.entity_id = v_invitation.id
     and nl.to_user_id = auth.uid()
     and nl.response is null;
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
  update public.notification_log nl
     set response = case when p_resend then 'resent' else 'ignored' end, response_at = now()
   where nl.entity_type = 'trainer_invitation'
     and nl.entity_id = v_request.invitation_id
     and nl.to_user_id = v_request.client_id
     and nl.response in ('renewal_requested', 'resent', 'ignored');

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

-- Reconcile requests created before the state was persisted on the original
-- recipient notification.
update public.notification_log nl
   set response = case r.status
                    when 'pending' then 'renewal_requested'
                    when 'resent' then 'resent'
                    when 'ignored' then 'ignored'
                  end,
       response_at = coalesce(nl.response_at, r.responded_at, r.created_at)
  from public.trainer_invitation_renewal_requests r
 where nl.entity_type = 'trainer_invitation'
   and nl.entity_id = r.invitation_id
   and nl.to_user_id = r.client_id
   and nl.response is null;
