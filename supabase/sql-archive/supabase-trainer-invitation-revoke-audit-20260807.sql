-- Record who and when a trainer revoked a pending invitation.

create or replace function public.revoke_trainer_invitation(p_invitation_id uuid)
returns table (id uuid, status text, revoked_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not public.has_permission('manage_trainer_clients') then raise exception 'forbidden'; end if;
  return query update public.trainer_invitations ti
    set status = 'revoked', revoked_at = now(), revoked_by = auth.uid()
   where ti.id = p_invitation_id and ti.trainer_id = auth.uid() and ti.status = 'sent'
  returning ti.id, ti.status, ti.revoked_at;
end;
$$;
grant execute on function public.revoke_trainer_invitation(uuid) to authenticated;
