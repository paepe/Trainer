-- TrAIner · recipient-specific Inbox organisation
--
-- notification_log remains the immutable-ish operational event record. This
-- table stores only a recipient's mailbox state, so archive/read operations
-- cannot change an invitation, workout, access grant or notification lifecycle.

create table if not exists public.notification_mailbox_states (
  notification_id uuid primary key references public.notification_log(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz,
  read_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint notification_mailbox_states_archive_actor_check
    check ((archived_at is null and archived_by is null) or (archived_at is not null and archived_by is not null)),
  constraint notification_mailbox_states_read_actor_check
    check ((read_at is null and read_by is null) or (read_at is not null and read_by is not null))
);

create index if not exists idx_notification_mailbox_states_recipient_scope
  on public.notification_mailbox_states (recipient_id, archived_at, notification_id);

alter table public.notification_mailbox_states enable row level security;

-- Recipients may observe their own mailbox state for Realtime reconciliation,
-- but state mutations are deliberately limited to the RPCs below.
create policy "notification_mailbox_states own read"
  on public.notification_mailbox_states
  for select
  using (recipient_id = auth.uid());

create or replace function public.is_inbox_notification_actionable(
  p_type text,
  p_response text,
  p_expires_at timestamptz
)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_response is null
    and (
      (p_type in ('workout_ready', 'access_request', 'trainer_invitation')
        and (p_expires_at is null or p_expires_at > now()))
      or p_type = 'trainer_invitation_renewal_request'
    );
$$;

create or replace function public.mark_inbox_notifications_read(
  p_notification_ids uuid[]
)
returns table (id uuid, read_at timestamptz, outcome text)
language plpgsql
security definer
set search_path = public
as $$
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
           coalesce(ms.read_at, nl.read_at) as effective_read_at,
           ms.archived_at as current_archived_at
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

create or replace function public.list_inbox_notifications(
  p_scope text default 'active',
  p_search text default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 25
)
returns table (
  id uuid,
  type text,
  title text,
  body text,
  from_user_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  response text,
  response_at timestamptz,
  read_at timestamptz,
  template_key text,
  params jsonb,
  entity_id uuid,
  peer_name text,
  archived_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := coalesce(p_scope, 'active');
  v_search text := nullif(btrim(p_search), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  if v_scope not in ('active', 'archived') then
    raise exception 'invalid_scope';
  end if;

  return query
  select nl.id,
         nl.type,
         nl.title,
         nl.body,
         nl.from_user_id,
         nl.created_at,
         nl.expires_at,
         nl.response,
         nl.response_at,
         coalesce(ms.read_at, nl.read_at) as read_at,
         nl.template_key,
         nl.params,
         nl.entity_id,
         p.name as peer_name,
         ms.archived_at
    from public.notification_log nl
    left join public.notification_mailbox_states ms
      on ms.notification_id = nl.id
     and ms.recipient_id = auth.uid()
    left join public.profiles p on p.id = nl.from_user_id
   where nl.to_user_id = auth.uid()
     and ((v_scope = 'active' and ms.archived_at is null)
       or (v_scope = 'archived' and ms.archived_at is not null))
     and (
       v_search is null
       or lower(extensions.unaccent(coalesce(p.name, ''))) like '%' || lower(extensions.unaccent(v_search)) || '%'
       or lower(extensions.unaccent(nl.title)) like '%' || lower(extensions.unaccent(v_search)) || '%'
       or lower(extensions.unaccent(nl.body)) like '%' || lower(extensions.unaccent(v_search)) || '%'
     )
     and (
       p_cursor_created_at is null
       or nl.created_at < p_cursor_created_at
       or (nl.created_at = p_cursor_created_at and p_cursor_id is not null and nl.id < p_cursor_id)
     )
   order by nl.created_at desc, nl.id desc
   limit v_limit;
end;
$$;

revoke all on table public.notification_mailbox_states from anon, authenticated;
grant select on table public.notification_mailbox_states to authenticated;
grant execute on function public.mark_inbox_notifications_read(uuid[]) to authenticated;
grant execute on function public.archive_inbox_notifications(uuid[], boolean) to authenticated;
grant execute on function public.list_inbox_notifications(text, text, timestamptz, uuid, integer) to authenticated;
