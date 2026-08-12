-- A selected message has a mailbox-state row (the UI persists read state
-- immediately before archive). Update that owned row directly: this avoids a
-- second insert/conflict path that could leave a valid historical message in
-- the active inbox.
create or replace function public.archive_inbox_notifications(
  p_notification_ids uuid[],
  p_archive boolean default true
)
returns table (id uuid, archived_at timestamptz, outcome text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  return query
  with requested as (
    select distinct unnest(coalesce(p_notification_ids, '{}'::uuid[])) as notification_id
  ), updated as (
    update public.notification_mailbox_states ms
       set archived_at = case when p_archive then now() else null end,
           archived_by = case when p_archive then auth.uid() else null end,
           updated_at = now()
      from public.notification_log nl
      join requested req on req.notification_id = nl.id
     where ms.notification_id = nl.id
       and ms.recipient_id = auth.uid()
       and nl.to_user_id = auth.uid()
       and (
         not p_archive
         or (
           coalesce(ms.read_at, nl.read_at) is not null
           and not public.is_inbox_notification_actionable(nl.type, nl.response, nl.expires_at)
         )
       )
    returning ms.notification_id, ms.archived_at
  )
  select req.notification_id as id,
         upd.archived_at,
         case
           when upd.notification_id is not null and p_archive then 'archived'
           when upd.notification_id is not null then 'restored'
           when not exists (
             select 1 from public.notification_log nl
              where nl.id = req.notification_id and nl.to_user_id = auth.uid()
           ) then 'not_found_or_not_owned'
           when p_archive and not exists (
             select 1
               from public.notification_mailbox_states ms
               join public.notification_log nl on nl.id = ms.notification_id
              where ms.notification_id = req.notification_id
                and ms.recipient_id = auth.uid()
                and nl.to_user_id = auth.uid()
                and coalesce(ms.read_at, nl.read_at) is not null
           ) then 'not_read'
           when p_archive then 'action_required'
           else 'not_updated'
         end as outcome
    from requested req
    left join updated upd on upd.notification_id = req.notification_id;
end;
$$;

grant execute on function public.archive_inbox_notifications(uuid[], boolean) to authenticated;
