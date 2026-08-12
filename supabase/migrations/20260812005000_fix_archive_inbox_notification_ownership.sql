-- Archive must evaluate ownership from notification_log directly. The prior
-- CTE re-joined an intermediate relation while returning columns named like
-- the function output, which could classify a valid, read notification as
-- not_found_or_not_owned after its mailbox state had been written.
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
  ), eligible as (
    select nl.id as notification_id
      from public.notification_log nl
      join requested req on req.notification_id = nl.id
      left join public.notification_mailbox_states ms
        on ms.notification_id = nl.id
       and ms.recipient_id = auth.uid()
     where nl.to_user_id = auth.uid()
       and (
         not p_archive
         or (
           coalesce(ms.read_at, nl.read_at) is not null
           and not public.is_inbox_notification_actionable(nl.type, nl.response, nl.expires_at)
         )
       )
  ), upserted as (
    insert into public.notification_mailbox_states (
      notification_id, recipient_id, archived_at, archived_by, updated_at
    )
    select eligible.notification_id,
           auth.uid(),
           case when p_archive then now() else null end,
           case when p_archive then auth.uid() else null end,
           now()
      from eligible
    on conflict (notification_id) do update
      set archived_at = case when p_archive then coalesce(notification_mailbox_states.archived_at, now()) else null end,
          archived_by = case when p_archive then coalesce(notification_mailbox_states.archived_by, auth.uid()) else null end,
          updated_at = now()
    returning notification_id, archived_at
  )
  select req.notification_id as id,
         up.archived_at,
         case
           when up.notification_id is not null and p_archive then 'archived'
           when up.notification_id is not null then 'restored'
           when not exists (
             select 1 from public.notification_log nl
              where nl.id = req.notification_id and nl.to_user_id = auth.uid()
           ) then 'not_found_or_not_owned'
           when p_archive and not exists (
             select 1
               from public.notification_log nl
               left join public.notification_mailbox_states ms
                 on ms.notification_id = nl.id and ms.recipient_id = auth.uid()
              where nl.id = req.notification_id
                and nl.to_user_id = auth.uid()
                and coalesce(ms.read_at, nl.read_at) is not null
           ) then 'not_read'
           when p_archive then 'action_required'
           else 'not_updated'
         end as outcome
    from requested req
    left join upserted up on up.notification_id = req.notification_id;
end;
$$;

grant execute on function public.archive_inbox_notifications(uuid[], boolean) to authenticated;
