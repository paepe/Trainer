-- A provenance flag can only be derived from a suggestion and check-in that
-- both belong to the workout recipient. This preserves the metadata contract
-- without copying either record into the TRAINER-readable plan.

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
