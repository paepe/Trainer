-- The browser may request the timeout entry point, but it must not be able to
-- assert that a plan originated from it. Resolve the provenance against the
-- recipient's still-actionable timeout notification inside Postgres.

alter table public.workout_plans
  add column if not exists timeout_notification_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workout_plans_timeout_notification_id_fkey'
  ) then
    alter table public.workout_plans
      add constraint workout_plans_timeout_notification_id_fkey
      foreign key (timeout_notification_id)
      references public.notification_log(id)
      on delete set null;
  end if;
end;
$$;

comment on column public.workout_plans.timeout_notification_id is
  'Timeout Inbox notification that authoritatively established trainer_timeout provenance; null for direct/legacy plans.';

create index if not exists workout_plans_timeout_notification_id_idx
  on public.workout_plans (timeout_notification_id)
  where timeout_notification_id is not null;

create or replace function public.set_autonomous_workout_provenance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source <> 'ai_generated' then
    new.autonomous_origin := null;
    new.timeout_notification_id := null;
    new.coach_dna_applied := false;
    return new;
  end if;

  -- trainer_timeout is valid only for this recipient, only while the exact
  -- Inbox notification remains actionable, and only with a currently active
  -- trainer relationship. Any other client-supplied value becomes direct.
  if new.autonomous_origin = 'trainer_timeout'
     and new.timeout_notification_id is not null
     and exists (
       select 1
         from public.notification_log nl
         join public.trainer_clients tc
           on tc.trainer_id = nl.from_user_id
          and tc.client_id = new.assigned_to
          and tc.status = 'active'
        where nl.id = new.timeout_notification_id
          and nl.to_user_id = new.assigned_to
          and nl.type = 'workout_timeout'
          and nl.response is null
     ) then
    new.autonomous_origin := 'trainer_timeout';
  else
    new.autonomous_origin := 'autonomous_direct';
    new.timeout_notification_id := null;
  end if;

  new.coach_dna_applied := exists (
    select 1
      from public.trainer_clients tc
      join public.coach_dna cd on cd.trainer_id = tc.trainer_id and cd.dna_active = true
     where tc.client_id = new.assigned_to
       and tc.status = 'active'
  );
  return new;
end;
$$;

-- Consumption must bind the exact timeout notification to its generated plan.
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
          and wp.autonomous_origin = 'trainer_timeout'
          and wp.timeout_notification_id = p_notification_id
     );

  return found;
end;
$$;

grant execute on function public.consume_workout_timeout_notification(uuid, uuid)
  to authenticated;
