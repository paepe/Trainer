-- Archiving is a mailbox-management action. The API permits it only for the
-- authenticated recipient and first persists read state in the client flow.
-- Action-required filtering remains in the interface; the server no longer
-- lets malformed legacy type/expiry metadata trap an already-read message.
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
  ), upserted as (
    insert into public.notification_mailbox_states (
      notification_id, recipient_id, archived_at, archived_by, updated_at
    )
    select nl.id,
           auth.uid(),
           case when p_archive then now() else null end,
           case when p_archive then auth.uid() else null end,
           now()
      from public.notification_log nl
      join requested req on req.notification_id = nl.id
     where nl.to_user_id = auth.uid()
    on conflict (notification_id) do update
      set recipient_id = auth.uid(),
          archived_at = case when p_archive then now() else null end,
          archived_by = case when p_archive then auth.uid() else null end,
          updated_at = now()
    returning notification_id, archived_at
  )
  select req.notification_id as id,
         up.archived_at,
         case
           when up.notification_id is null then 'not_found_or_not_owned'
           when p_archive then 'archived'
           else 'restored'
         end as outcome
    from requested req
    left join upserted up on up.notification_id = req.notification_id;
end;
$$;

grant execute on function public.archive_inbox_notifications(uuid[], boolean) to authenticated;
