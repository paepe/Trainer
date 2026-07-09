-- Cleanup migration — system audit 2026-07-07, Phase 4 (P3)
-- Ref: policies/references/system-audit-trainer-20260707.md (Area 1)
--      policies/references/remediation-plan-system-audit-20260707.md
--
-- Pre-flight verification (run against sevenseeds.trainer on 2026-07-07):
--   * plan_exercises.completed: no code write/read path since 2026-06;
--     6 legacy rows hold TRUE (historical noise — execution tracking lives in
--     workout_session_exercises.status). Dropping loses only that noise.
--   * exercises.status: live CHECK still allows 9 values; TypeScript
--     (src/types/workout.ts ExerciseStatus) was narrowed to 4 on 2026-06-06.
--     Current data: all 155 rows are 'active' — zero rows violate the new CHECK.

-- ── 1. Drop dead column plan_exercises.completed ────────────────────────────
ALTER TABLE plan_exercises
  DROP COLUMN IF EXISTS completed;

-- ── 2. Realign exercises.status CHECK with the TypeScript contract ──────────
-- Drops the 5 dead values (pending_review, studio_only, ai_allowed,
-- ai_restricted, archived) removed from code on 2026-06-06.
ALTER TABLE exercises
  DROP CONSTRAINT IF EXISTS exercises_status_check;

ALTER TABLE exercises
  ADD CONSTRAINT exercises_status_check
  CHECK (status IN ('draft', 'active', 'restricted', 'blocked'));

-- ── Rollback ─────────────────────────────────────────────────────────────────
-- ALTER TABLE plan_exercises ADD COLUMN completed boolean DEFAULT false;
-- ALTER TABLE exercises DROP CONSTRAINT exercises_status_check;
-- ALTER TABLE exercises ADD CONSTRAINT exercises_status_check
--   CHECK (status IN ('draft','pending_review','active','restricted',
--                     'studio_only','ai_allowed','ai_restricted','blocked','archived'));
