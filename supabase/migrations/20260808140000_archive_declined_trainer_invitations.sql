-- A recipient's explicit decline is terminal evidence and can be archived by
-- the inviting trainer. It must remain restorable for audit visibility.
create or replace function public.archive_trainer_invitations(
  p_invitation_ids uuid[],
  p_archive boolean default true
)
returns table (id uuid, archived_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  if not public.has_permission('manage_trainer_clients') then
    raise exception 'forbidden';
  end if;

  return query
  update public.trainer_invitations ti
     set archived_at = case when p_archive then now() else null end,
         archived_by = case when p_archive then auth.uid() else null end
   where ti.id = any(p_invitation_ids)
     and ti.trainer_id = auth.uid()
     and (
       ti.status in ('accepted', 'declined', 'expired', 'revoked')
       or (ti.status = 'sent' and ti.expires_at < now())
     )
  returning ti.id, ti.archived_at;
end;
$$;

grant execute on function public.archive_trainer_invitations(uuid[], boolean) to authenticated;
