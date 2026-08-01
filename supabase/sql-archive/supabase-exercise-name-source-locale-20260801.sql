-- Fase 2 of docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md — AI-generated
-- exercise names. Applied directly to production (sevenseeds.trainer,
-- xbfszzdyskwdctlqzztl) on 2026-08-01; archived here per §8.3. No staging
-- environment exists for this project (Open Decision — Staging Environment,
-- already on record).
--
-- Nullable and additive. Records the locale an AI-generated exercise name
-- was produced in (D7) — only set for AI-generated rows; catalog and
-- hand-typed names leave it unset until Fase 3 adds provenance for those
-- too. Anticipates half of the Fase 3 migration (which also adds this
-- column to workout_session_exercises, not touched here since Fase 2
-- doesn't reach the live session flow).
--
-- Rollback:
--   alter table public.plan_exercises drop column name_source_locale;

alter table public.plan_exercises
  add column name_source_locale text;
