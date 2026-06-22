-- Phase 9A — Exercise Category Classification
-- Adds exercise_category to exercises (source of truth — was incorrectly
-- referenced as exercise_catalog in earlier drafts; real table name is exercises)
-- and plan_exercises (propagated from exercises at plan creation time).
--
-- Design: nullable by default — NULL means "not yet classified".
-- Classification is resolved on-demand by the AI classify-exercises
-- endpoint and cached back here. Never treated as an error.
--
-- Valid values: 'fitness' | 'performance' | 'mobility'
-- Ad-hoc exercises in plan_exercises always get NULL (no classification needed).

-- 1. exercises — source of truth for AI-resolved classification
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS exercise_category TEXT
    CHECK (exercise_category IN ('fitness', 'performance', 'mobility'));

COMMENT ON COLUMN public.exercises.exercise_category IS
  'AI-resolved category. NULL = not yet classified (shown without filter). '
  'Populated on first use by classify-exercises endpoint; cached thereafter. '
  'Correctable via SQL if AI misclassifies.';

-- 2. plan_exercises — propagated from exercises when trainer adds a catalog exercise
--    Always NULL for ad-hoc exercises (created directly in the plan editor).
ALTER TABLE public.plan_exercises
  ADD COLUMN IF NOT EXISTS exercise_category TEXT
    CHECK (exercise_category IN ('fitness', 'performance', 'mobility'));

COMMENT ON COLUMN public.plan_exercises.exercise_category IS
  'Propagated from exercises.exercise_category at insert time. '
  'NULL for ad-hoc exercises (ephemeral, no catalog origin). '
  'Used by StartWorkoutScreen to filter performance exercises for '
  'clients on free/ai_fitness plans (fitnessOnlyWorkout = true).';

-- 3. Index for efficient filtering in StartWorkoutScreen
--    (filter plan_exercises by plan_id + exercise_category)
CREATE INDEX IF NOT EXISTS idx_plan_exercises_category
  ON public.plan_exercises (plan_id, exercise_category);
