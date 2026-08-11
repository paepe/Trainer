-- A timeout notification is a single contextual entry into autonomous workout.
-- It is consumed only after a plan was persisted for its recipient; it never
-- creates or removes the recipient's normal autonomous-workout entitlement.

alter table public.notification_log
  drop constraint if exists notification_log_response_check;

alter table public.notification_log
  add constraint notification_log_response_check
  check (response is null or response in (
    'approved', 'rejected', 'accepted', 'declined', 'revoked',
    'renewal_requested', 'resent', 'ignored', 'started_autonomously'
  ));

create or replace function public.consume_workout_timeout_notification(
  p_notification_id uuid,
  p_plan_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  -- The caller may consume only their own timeout message, and only after an
  -- AI-generated plan assigned to that same caller exists. This keeps the
  -- Inbox state from becoming a client-side-only assertion.
  update public.notification_log nl
     set response = 'started_autonomously',
         response_at = now(),
         entity_type = 'workout_plan',
         entity_id = p_plan_id
   where nl.id = p_notification_id
     and nl.to_user_id = auth.uid()
     and nl.type = 'workout_timeout'
     and nl.response is null
     and exists (
       select 1
         from public.workout_plans wp
        where wp.id = p_plan_id
          and wp.assigned_to = auth.uid()
          and wp.source = 'ai_generated'
     );

  return found;
end;
$$;

grant execute on function public.consume_workout_timeout_notification(uuid, uuid)
  to authenticated;
