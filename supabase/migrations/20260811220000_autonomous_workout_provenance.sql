-- Minimal operational provenance for AI-generated autonomous plans. This is
-- deliberately metadata only: no check-in payload, voice, interpretation or
-- Coach DNA document is copied into the workout plan.

alter table public.workout_plans
  add column if not exists autonomous_origin text,
  add column if not exists coach_dna_applied boolean not null default false;

alter table public.workout_plans
  drop constraint if exists workout_plans_autonomous_origin_check;

alter table public.workout_plans
  add constraint workout_plans_autonomous_origin_check
  check (autonomous_origin is null or autonomous_origin in ('autonomous_direct', 'trainer_timeout'));

comment on column public.workout_plans.autonomous_origin is
  'Origin of an AI-generated autonomous workout; null for trainer-prescribed and legacy plans.';
comment on column public.workout_plans.coach_dna_applied is
  'True only when the generation endpoint resolved an active linked trainer Coach DNA.';

create index if not exists workout_plans_assigned_autonomous_origin_created_idx
  on public.workout_plans (assigned_to, autonomous_origin, created_at desc)
  where autonomous_origin is not null;

-- The browser may submit a plan but cannot assert professional methodology.
-- Derive this flag inside Postgres from the current active relationship and
-- DNA row, so the TRAINER never sees a client-forged Coach DNA attribution.
create or replace function public.set_autonomous_workout_provenance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source <> 'ai_generated' then
    new.autonomous_origin := null;
    new.coach_dna_applied := false;
    return new;
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

drop trigger if exists set_autonomous_workout_provenance on public.workout_plans;
create trigger set_autonomous_workout_provenance
before insert or update of source, assigned_to, autonomous_origin, coach_dna_applied
on public.workout_plans
for each row execute function public.set_autonomous_workout_provenance();
