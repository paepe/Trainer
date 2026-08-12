-- notification_log is the ownership authority. A legacy mailbox-state row can
-- carry a stale recipient_id; reading an owned notification repairs that
-- per-message state before any archive operation is attempted.
create or replace function public.mark_inbox_notifications_read(
  p_notification_ids uuid[]
)
returns table (id uuid, read_at timestamptz, outcome text)
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
      notification_id, recipient_id, read_at, read_by, updated_at
    )
    select nl.id,
           auth.uid(),
           coalesce(nl.read_at, now()),
           auth.uid(),
           now()
      from public.notification_log nl
      join requested req on req.notification_id = nl.id
     where nl.to_user_id = auth.uid()
    on conflict (notification_id) do update
      set recipient_id = auth.uid(),
          read_at = coalesce(notification_mailbox_states.read_at, excluded.read_at),
          read_by = coalesce(notification_mailbox_states.read_by, excluded.read_by),
          updated_at = now()
    returning notification_id, read_at
  )
  select req.notification_id as id,
         up.read_at,
         case when up.notification_id is null then 'not_found_or_not_owned' else 'read' end as outcome
    from requested req
    left join upserted up on up.notification_id = req.notification_id;
end;
$$;

grant execute on function public.mark_inbox_notifications_read(uuid[]) to authenticated;
