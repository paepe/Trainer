-- Migration: Remove dead status values from CHECK constraints
-- Purpose: Align DB constraints with TypeScript types and actual code write paths.
-- See: policies/references/STATUS_AUDIT.md for full audit.

-- ── 1. workout_sessions — drop 'paused' (never written) ──────────────────────

ALTER TABLE workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_status_check;

ALTER TABLE workout_sessions
  ADD CONSTRAINT workout_sessions_status_check
    CHECK (status IN ('active', 'completed', 'abandoned'));

-- ── 2. operational_tasks — drop 'in_progress' and 'cancelled' (never written) ─

ALTER TABLE operational_tasks
  DROP CONSTRAINT IF EXISTS operational_tasks_status_check;

ALTER TABLE operational_tasks
  ADD CONSTRAINT operational_tasks_status_check
    CHECK (status IN ('pending', 'completed'));

-- ── 3. trainer_alerts — add CHECK constraint (never existed) ──────────────────

ALTER TABLE trainer_alerts
  DROP CONSTRAINT IF EXISTS trainer_alerts_status_check;

ALTER TABLE trainer_alerts
  ADD CONSTRAINT trainer_alerts_status_check
    CHECK (status IN ('open', 'acknowledged', 'resolved'));
