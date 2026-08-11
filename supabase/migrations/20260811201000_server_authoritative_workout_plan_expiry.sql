-- Workout-plan expiry is an absolute server-side instant. It is calculated
-- when a trainer sends the plan, never from either participant's device clock.

alter table public.workout_plans
  add column if not exists expires_at timestamptz;

-- The current application lifecycle already uses these terminal states. Keep
-- the database constraint aligned before the expiry RPC starts writing them.
alter table public.workout_plans
  drop constraint if exists workout_plans_status_check;

alter table public.workout_plans
  add constraint workout_plans_status_check
  check (status = any (array[
    'draft', 'pending_review', 'approved', 'sent', 'active', 'completed',
    'postponed', 'cancelled'
  ]));

-- Legacy manual plans did not retain their expiry instant. Backfill once using
-- the trainer preference available at migration time; plans sent from now on
-- retain the immutable instant selected by the server at send time.
update public.workout_plans wp
   set expires_at = wp.created_at + make_interval(days => coalesce(p.plan_expiry_days, 10))
  from public.preferences p
 where wp.source = 'manual'
   and wp.expires_at is null
   and wp.created_by = p.user_id;

update public.workout_plans wp
   set expires_at = wp.created_at + interval '10 days'
 where wp.source = 'manual'
   and wp.expires_at is null;

create or replace function public.set_manual_plan_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expiry_days integer;
begin
  if new.source = 'manual'
     and new.status in ('sent', 'postponed')
     and new.expires_at is null then
    select coalesce(plan_expiry_days, 10)
      into v_expiry_days
      from public.preferences
     where user_id = new.created_by;

    new.expires_at := statement_timestamp()
      + make_interval(days => coalesce(v_expiry_days, 10));
  end if;

  return new;
end;
$$;

drop trigger if exists set_manual_plan_expiry on public.workout_plans;
create trigger set_manual_plan_expiry
before insert or update of status, source, expires_at on public.workout_plans
for each row execute function public.set_manual_plan_expiry();

-- Expire all overdue plans for a client under the database clock. The caller
-- must be the client or that client's active trainer; this avoids trusting a
-- browser-local date while preserving the existing operational triggers.
create or replace function public.expire_assigned_workout_plans(p_client_id uuid)
returns table (id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  if auth.uid() <> p_client_id and not exists (
    select 1 from public.trainer_clients tc
     where tc.trainer_id = auth.uid()
       and tc.client_id = p_client_id
       and tc.status = 'active'
  ) then
    raise exception 'forbidden';
  end if;

  return query
  update public.workout_plans wp
     set status = 'cancelled',
         updated_at = statement_timestamp()
   where wp.assigned_to = p_client_id
     and wp.source = 'manual'
     and wp.status in ('sent', 'postponed')
     and wp.expires_at is not null
     and wp.expires_at <= statement_timestamp()
  returning wp.id, wp.expires_at;
end;
$$;

-- CTA authority: lock, validate and start in one server-side operation. An
-- expired or unavailable plan never reaches WorkoutModeScreen.
create or replace function public.start_assigned_workout_plan(p_plan_id uuid)
returns table (outcome text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.workout_plans%rowtype;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  select * into v_plan
    from public.workout_plans
   where id = p_plan_id
     and assigned_to = auth.uid()
   for update;

  if not found or v_plan.source <> 'manual' then
    return query select 'unavailable'::text, null::timestamptz;
    return;
  end if;

  if v_plan.status in ('sent', 'postponed')
     and v_plan.expires_at is not null
     and v_plan.expires_at <= statement_timestamp() then
    update public.workout_plans
       set status = 'cancelled', updated_at = statement_timestamp()
     where id = v_plan.id;
    return query select 'expired'::text, v_plan.expires_at;
    return;
  end if;

  if v_plan.status not in ('sent', 'active', 'postponed') then
    return query select 'unavailable'::text, v_plan.expires_at;
    return;
  end if;

  update public.workout_plans
     set status = 'active', updated_at = statement_timestamp()
   where id = v_plan.id;

  return query select 'started'::text, v_plan.expires_at;
end;
$$;

grant execute on function public.expire_assigned_workout_plans(uuid) to authenticated;
grant execute on function public.start_assigned_workout_plan(uuid) to authenticated;
