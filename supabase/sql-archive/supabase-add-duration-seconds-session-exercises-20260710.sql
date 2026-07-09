-- Adds duration_seconds_prescribed to workout_session_exercises so hold/
-- breathing/mobility exercises (no meaningful rep count) can carry a
-- prescribed hold time into the live workout session — mirrors
-- plan_exercises.duration_seconds, which already existed but was never
-- propagated into the session-execution table.
--
-- Ref: user report 2026-07-10 — AI-generated exercises like neck rotations
-- and diaphragmatic breathing showed no rep count and no duration anywhere
-- in the UI (data-model gap: reps was the only quantity field system-wide).
-- Applied to production (sevenseeds.trainer) on 2026-07-10.

ALTER TABLE workout_session_exercises
  ADD COLUMN IF NOT EXISTS duration_seconds_prescribed integer;

-- Rollback:
-- ALTER TABLE workout_session_exercises DROP COLUMN IF EXISTS duration_seconds_prescribed;
