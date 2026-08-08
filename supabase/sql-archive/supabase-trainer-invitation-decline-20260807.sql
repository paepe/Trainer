-- TrAIner · explicit recipient decline for trainer invitations.

alter table public.trainer_invitations
  add column if not exists declined_at timestamptz,
  add column if not exists declined_by uuid references public.profiles(id) on delete set null,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null;

alter table public.trainer_invitations
  drop constraint if exists trainer_invitations_status_check;

alter table public.trainer_invitations
  add constraint trainer_invitations_status_check
  check (status in ('sent', 'accepted', 'declined', 'expired', 'revoked'));

create or replace function public.decline_trainer_invitation(p_token text)
returns table (id uuid, status text, declined_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.trainer_invitations%rowtype;
  v_email text;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select email into v_email from public.profiles where id = auth.uid();
  select * into v_invitation from public.trainer_invitations where token = p_token for update;
  if not found then raise exception 'not_found'; end if;
  if lower(coalesce(v_email, '')) <> lower(v_invitation.invited_email) then raise exception 'forbidden'; end if;
  if v_invitation.status = 'declined' and v_invitation.declined_by = auth.uid() then
    return query select v_invitation.id, v_invitation.status, v_invitation.declined_at;
    return;
  end if;
  if v_invitation.status <> 'sent' then raise exception 'not_pending'; end if;
  if v_invitation.expires_at < now() then raise exception 'expired'; end if;

  update public.trainer_invitations
     set status = 'declined', declined_at = now(), declined_by = auth.uid()
   where id = v_invitation.id
  returning trainer_invitations.id, trainer_invitations.status, trainer_invitations.declined_at
    into id, status, declined_at;

  update public.notification_log
     set response = 'declined', response_at = now()
   where entity_type = 'trainer_invitation'
     and entity_id = v_invitation.id
     and to_user_id = auth.uid()
     and response is null;

  return next;
end;
$$;

grant execute on function public.decline_trainer_invitation(text) to authenticated;
