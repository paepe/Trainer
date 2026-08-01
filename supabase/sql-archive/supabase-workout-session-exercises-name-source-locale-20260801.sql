-- Fase 3 of docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md — hand-typed
-- exercise names. Completes the migration Fase 2 deliberately left half-done
-- (plan_exercises.name_source_locale only) since Fase 2 never touched the
-- live session flow. Applied directly to production (sevenseeds.trainer,
-- xbfszzdyskwdctlqzztl) on 2026-08-01; archived here per §8.3. No staging
-- environment exists for this project.
--
-- Nullable and additive. Records the locale an exercise name was written in
-- (D7) for rows copied into a live session — same semantics as
-- plan_exercises.name_source_locale.
--
-- Rollback:
--   alter table public.workout_session_exercises drop column name_source_locale;

alter table public.workout_session_exercises
  add column name_source_locale text;
