-- Output-column names are PL/pgSQL variables; qualify every table reference.

create or replace function public.decline_trainer_invitation(p_token text)
returns table (id uuid, status text, declined_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_invitation public.trainer_invitations%rowtype;
  v_email text;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select p.email into v_email from public.profiles p where p.id = auth.uid();
  select * into v_invitation from public.trainer_invitations ti where ti.token = p_token for update;
  if not found then raise exception 'not_found'; end if;
  if lower(coalesce(v_email, '')) <> lower(v_invitation.invited_email) then raise exception 'forbidden'; end if;
  if v_invitation.status = 'declined' and v_invitation.declined_by = auth.uid() then
    return query select v_invitation.id, v_invitation.status, v_invitation.declined_at;
    return;
  end if;
  if v_invitation.status <> 'sent' then raise exception 'not_pending'; end if;
  if v_invitation.expires_at < now() then raise exception 'expired'; end if;
  return query
  with declined as (
    update public.trainer_invitations ti
       set status = 'declined', declined_at = now(), declined_by = auth.uid()
     where ti.id = v_invitation.id
     returning ti.id, ti.status, ti.declined_at
  ), inbox as (
    update public.notification_log nl
       set response = 'declined', response_at = now()
     where nl.entity_type = 'trainer_invitation' and nl.entity_id = v_invitation.id
       and nl.to_user_id = auth.uid() and nl.response is null
  ) select declined.id, declined.status, declined.declined_at from declined;
end;
$$;
