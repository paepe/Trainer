-- Persist only a minimised boolean that states whether the AI workout used a
-- persisted check-in. The check-in identifier and its health content remain in
-- ai_suggestions and are not copied into the TRAINER-readable workout record.

alter table public.workout_plans
  add column if not exists checkin_applied boolean not null default false;

comment on column public.workout_plans.checkin_applied is
  'Minimised provenance: true only when an AI workout was generated with a persisted check-in. No check-in content or identifier is stored here.';

create or replace function public.refresh_workout_plan_checkin_applied(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_plan_id is null then
    return;
  end if;

  update public.workout_plans wp
     set checkin_applied = exists (
       select 1
         from public.ai_suggestions suggestion
         join public.checkin_prontidao checkin
           on checkin.id = suggestion.checkin_id
        where suggestion.plan_id = p_plan_id
          and suggestion.user_id = wp.assigned_to
          and checkin.user_id = wp.assigned_to
     )
   where wp.id = p_plan_id
     and wp.source = 'ai_generated';
end;
$$;

create or replace function public.sync_workout_plan_checkin_applied()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_workout_plan_checkin_applied(old.plan_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_workout_plan_checkin_applied(new.plan_id);
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.refresh_workout_plan_checkin_applied(uuid) from public, anon, authenticated;
revoke all on function public.sync_workout_plan_checkin_applied() from public, anon, authenticated;

drop trigger if exists sync_workout_plan_checkin_applied on public.ai_suggestions;

create trigger sync_workout_plan_checkin_applied
after insert or update or delete on public.ai_suggestions
for each row execute function public.sync_workout_plan_checkin_applied();

-- Backfill the minimised provenance for existing AI-generated workouts.
update public.workout_plans wp
   set checkin_applied = exists (
     select 1
       from public.ai_suggestions suggestion
       join public.checkin_prontidao checkin
         on checkin.id = suggestion.checkin_id
      where suggestion.plan_id = wp.id
        and suggestion.user_id = wp.assigned_to
        and checkin.user_id = wp.assigned_to
   )
 where wp.source = 'ai_generated';
