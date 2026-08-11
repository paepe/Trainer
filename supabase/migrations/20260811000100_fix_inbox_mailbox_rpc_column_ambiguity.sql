-- The first mailbox-state migration introduced output-column names that are
-- also table columns. PL/pgSQL must prefer columns inside the CTEs below.

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
    select distinct unnest(coalesce(p_notification_ids, '{}'::uuid[])) as id
  ), owned as (
    select r.id, nl.read_at as legacy_read_at
      from requested r
      left join public.notification_log nl
        on nl.id = r.id
       and nl.to_user_id = auth.uid()
  ), upserted as (
    insert into public.notification_mailbox_states (
      notification_id, recipient_id, read_at, read_by, updated_at
    )
    select o.id, auth.uid(), coalesce(o.legacy_read_at, now()), auth.uid(), now()
      from owned o
     where o.legacy_read_at is not null or o.id in (
       select nl.id from public.notification_log nl
        where nl.id = o.id and nl.to_user_id = auth.uid()
     )
    on conflict (notification_id) do update
      set read_at = coalesce(notification_mailbox_states.read_at, excluded.read_at),
          read_by = coalesce(notification_mailbox_states.read_by, excluded.read_by),
          updated_at = now()
    returning notification_id, read_at
  )
  select r.id,
         u.read_at,
         case when u.notification_id is null then 'not_found_or_not_owned'
              else 'read' end
    from requested r
    left join upserted u on u.notification_id = r.id;
end;
$$;

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
    select distinct unnest(coalesce(p_notification_ids, '{}'::uuid[])) as id
  ), owned as (
    select r.id,
           nl.type,
           nl.response,
           nl.expires_at,
           coalesce(ms.read_at, nl.read_at) as effective_read_at
      from requested r
      left join public.notification_log nl
        on nl.id = r.id
       and nl.to_user_id = auth.uid()
      left join public.notification_mailbox_states ms
        on ms.notification_id = nl.id
       and ms.recipient_id = auth.uid()
  ), eligible as (
    select o.*
      from owned o
     where o.type is not null
       and (
         not p_archive
         or (
           o.effective_read_at is not null
           and not public.is_inbox_notification_actionable(o.type, o.response, o.expires_at)
         )
       )
  ), upserted as (
    insert into public.notification_mailbox_states (
      notification_id, recipient_id, archived_at, archived_by, updated_at
    )
    select e.id,
           auth.uid(),
           case when p_archive then now() else null end,
           case when p_archive then auth.uid() else null end,
           now()
      from eligible e
    on conflict (notification_id) do update
      set archived_at = case when p_archive then coalesce(notification_mailbox_states.archived_at, now()) else null end,
          archived_by = case when p_archive then coalesce(notification_mailbox_states.archived_by, auth.uid()) else null end,
          updated_at = now()
    returning notification_id, archived_at
  )
  select r.id,
         u.archived_at,
         case
           when o.type is null then 'not_found_or_not_owned'
           when u.notification_id is not null and p_archive then 'archived'
           when u.notification_id is not null then 'restored'
           when o.effective_read_at is null then 'not_read'
           when public.is_inbox_notification_actionable(o.type, o.response, o.expires_at) then 'action_required'
           else 'not_updated'
         end
    from requested r
    left join owned o on o.id = r.id
    left join upserted u on u.notification_id = r.id;
end;
$$;
