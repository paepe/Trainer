-- Inbox list v2: authorised category filtering and deterministic cursor sorting.
-- The original list function remains available only for compatibility while no
-- client code calls it; this is the canonical contract consumed by the Inbox UI.

create or replace function public.list_inbox_notifications_v2(
  p_scope text default 'active',
  p_search text default null,
  p_category text default 'all',
  p_sort text default 'recent',
  p_cursor_created_at timestamptz default null,
  p_cursor_sender_name text default null,
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
  archived_at timestamptz,
  sort_sender_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := coalesce(p_scope, 'active');
  v_search text := nullif(btrim(p_search), '');
  v_category text := coalesce(p_category, 'all');
  v_sort text := coalesce(p_sort, 'recent');
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if v_scope not in ('active', 'archived') then raise exception 'invalid_scope'; end if;
  if v_category not in ('all', 'actionRequired', 'invitations', 'plansAndWorkouts', 'accessAndPrivacy', 'alerts', 'informational') then raise exception 'invalid_category'; end if;
  if v_sort not in ('recent', 'oldest', 'nameAsc', 'nameDesc') then raise exception 'invalid_sort'; end if;

  return query
  with scoped as (
    select nl.*,
           coalesce(ms.read_at, nl.read_at) as effective_read_at,
           ms.archived_at as mailbox_archived_at,
           p.name as resolved_peer_name,
           lower(extensions.unaccent(coalesce(p.name, ''))) as resolved_sender_sort,
           public.is_inbox_notification_actionable(nl.type, nl.response, nl.expires_at) as actionable
      from public.notification_log nl
      left join public.notification_mailbox_states ms
        on ms.notification_id = nl.id and ms.recipient_id = auth.uid()
      left join public.profiles p on p.id = nl.from_user_id
     where nl.to_user_id = auth.uid()
       and ((v_scope = 'active' and ms.archived_at is null)
         or (v_scope = 'archived' and ms.archived_at is not null))
       and (v_search is null
         or lower(extensions.unaccent(coalesce(p.name, ''))) like '%' || lower(extensions.unaccent(v_search)) || '%'
         or lower(extensions.unaccent(nl.title)) like '%' || lower(extensions.unaccent(v_search)) || '%'
         or lower(extensions.unaccent(nl.body)) like '%' || lower(extensions.unaccent(v_search)) || '%')
  ), filtered as (
    select * from scoped s
     where v_category = 'all'
        or (v_category = 'actionRequired' and s.actionable)
        or (v_category = 'invitations' and not s.actionable and s.type in ('trainer_invitation', 'trainer_invitation_renewal_request'))
        or (v_category = 'plansAndWorkouts' and not s.actionable and s.type in ('plan_sent', 'plan_cancelled', 'plan_postponed', 'plan_expired', 'workout_ready', 'workout_approved', 'workout_rejected', 'workout_timeout', 'trainer_timeout_workout', 'workout_completed'))
        or (v_category = 'accessAndPrivacy' and not s.actionable and s.type in ('access_request', 'access_granted', 'access_denied'))
        or (v_category = 'alerts' and s.type in ('checkin_alert', 'safety_gate', 'low_readiness', 'high_pain'))
        or (v_category = 'informational' and not s.actionable and s.type not in ('trainer_invitation', 'trainer_invitation_renewal_request', 'access_request', 'access_granted', 'access_denied', 'checkin_alert', 'safety_gate', 'low_readiness', 'high_pain', 'plan_sent', 'plan_cancelled', 'plan_postponed', 'plan_expired', 'workout_ready', 'workout_approved', 'workout_rejected', 'workout_timeout', 'trainer_timeout_workout', 'workout_completed'))
  )
  select f.id, f.type, f.title, f.body, f.from_user_id, f.created_at,
         f.expires_at, f.response, f.response_at, f.effective_read_at,
         f.template_key, f.params, f.entity_id, f.resolved_peer_name,
         f.mailbox_archived_at, f.resolved_sender_sort
    from filtered f
   where p_cursor_id is null
      or (v_sort = 'recent' and (f.created_at, f.id) < (p_cursor_created_at, p_cursor_id))
      or (v_sort = 'oldest' and (f.created_at, f.id) > (p_cursor_created_at, p_cursor_id))
      or (v_sort = 'nameAsc' and (f.resolved_sender_sort, f.id) > (coalesce(p_cursor_sender_name, ''), p_cursor_id))
      or (v_sort = 'nameDesc' and (f.resolved_sender_sort, f.id) < (coalesce(p_cursor_sender_name, ''), p_cursor_id))
   order by
     case when v_sort = 'recent' then f.created_at end desc,
     case when v_sort = 'oldest' then f.created_at end asc,
     case when v_sort = 'nameAsc' then f.resolved_sender_sort end asc,
     case when v_sort = 'nameDesc' then f.resolved_sender_sort end desc,
     case when v_sort in ('oldest', 'nameAsc') then f.id end asc,
     case when v_sort in ('recent', 'nameDesc') then f.id end desc
   limit v_limit;
end;
$$;

grant execute on function public.list_inbox_notifications_v2(text, text, text, text, timestamptz, text, uuid, integer) to authenticated;
