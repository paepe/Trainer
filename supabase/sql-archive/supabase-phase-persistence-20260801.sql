-- Session-block persistence for plans and live sessions (Phase 3 of
-- docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md). Applied directly to
-- production (sevenseeds.trainer, xbfszzdyskwdctlqzztl) on 2026-08-01;
-- archived here per §8.3. No staging environment exists for this project
-- (Open Decision — Staging Environment, already on record).
--
-- Nullable and additive on both tables. Existing rows get NULL and render
-- ungrouped (Decision #4, 2026-07-31: "existing plan_exercises rows keep
-- phase null; they render ungrouped"). No backfill.
--
-- Rollback:
--   alter table public.plan_exercises drop column phase;
--   alter table public.workout_session_exercises drop column phase;

alter table public.plan_exercises
  add column phase text;

alter table public.workout_session_exercises
  add column phase text;
