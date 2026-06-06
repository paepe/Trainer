-- Migration: Remove dead status values from CHECK constraints
-- Purpose: Align DB constraints with TypeScript types and actual code write paths.
-- See: policies/references/STATUS_AUDIT.md for full audit.

-- ── 1. workout_plans — migrate dead values, then drop them from CHECK ──────────

-- Upgrade existing rows so the new CHECK can be applied.
-- Any plan with a non-standard status → 'sent' (safe default: sent but not active).
UPDATE workout_plans
  SET status = 'sent'
  WHERE status NOT IN ('sent', 'active', 'completed', 'cancelled', 'postponed');

ALTER TABLE workout_plans
  DROP CONSTRAINT IF EXISTS workout_plans_status_check;

ALTER TABLE workout_plans
  ADD CONSTRAINT workout_plans_status_check
    CHECK (status IN ('sent', 'active', 'completed', 'cancelled', 'postponed'));

-- ── 2. workout_sessions — drop 'paused' (never written) ──────────────────────

-- If any session was manually set to 'paused' in the DB, move to 'active'.
UPDATE workout_sessions SET status = 'active' WHERE status = 'paused';

ALTER TABLE workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_status_check;

ALTER TABLE workout_sessions
  ADD CONSTRAINT workout_sessions_status_check
    CHECK (status IN ('active', 'completed', 'abandoned'));

-- ── 3. workout_session_exercises — drop 'substituted' (never written) ─────────

-- If any exercise was manually set to 'substituted', move to 'completed'.
UPDATE workout_session_exercises SET status = 'completed' WHERE status = 'substituted';

ALTER TABLE workout_session_exercises
  DROP CONSTRAINT IF EXISTS workout_session_exercises_status_check;

ALTER TABLE workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_status_check
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'));

-- ── 4. operational_tasks — drop 'in_progress' and 'cancelled' ─────────────────

-- in_progress → pending (actionable), cancelled → completed (terminal).
UPDATE operational_tasks SET status = 'pending'   WHERE status = 'in_progress';
UPDATE operational_tasks SET status = 'completed' WHERE status = 'cancelled';

ALTER TABLE operational_tasks
  DROP CONSTRAINT IF EXISTS operational_tasks_status_check;

ALTER TABLE operational_tasks
  ADD CONSTRAINT operational_tasks_status_check
    CHECK (status IN ('pending', 'completed'));

-- ── 5. trainer_alerts — add CHECK constraint (never existed) ──────────────────

ALTER TABLE trainer_alerts
  DROP CONSTRAINT IF EXISTS trainer_alerts_status_check;

ALTER TABLE trainer_alerts
  ADD CONSTRAINT trainer_alerts_status_check
    CHECK (status IN ('open', 'acknowledged', 'resolved'));
