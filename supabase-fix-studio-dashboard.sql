-- ═══════════════════════════════════════════════════════════════════
-- Fix: Studio Dashboard counts (Active clients / Plans / Completed)
--
-- Root cause: trainer_clients and workout_plans only had policies for
-- individual trainers (auth.uid() = trainer_id). The studio OWNER had
-- no RLS permission to aggregate data across their team → all counts = 0.
--
-- Solution: SECURITY DEFINER helper function (bypasses inner RLS to
-- avoid recursion) + new SELECT policies on trainer_clients,
-- workout_plans and workout_sessions for studio owners.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Helper function: is this user a trainer in the authenticated ───
-- user's studio?  Runs as postgres (SECURITY DEFINER) so inner
-- queries bypass RLS without creating recursive policy chains.
CREATE OR REPLACE FUNCTION studio_has_trainer(trainer_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   studio_members sm
    JOIN   studios s ON s.id = sm.studio_id
    WHERE  sm.user_id  = trainer_uuid
      AND  s.owner_id  = auth.uid()
  );
$$;

-- ─── trainer_clients ────────────────────────────────────────────────
-- Studio owner can count / read the client rows of their trainers.
DROP POLICY IF EXISTS "studio owner reads trainer clients" ON trainer_clients;

CREATE POLICY "studio owner reads trainer clients"
  ON trainer_clients FOR SELECT
  USING (studio_has_trainer(trainer_id));

-- ─── workout_plans ───────────────────────────────────────────────────
-- Studio owner can read plans created by their trainers
-- (needed for "Plans this week" and "Completed this week" KPIs).
DROP POLICY IF EXISTS "studio owner reads workout plans from trainers" ON workout_plans;

CREATE POLICY "studio owner reads workout plans from trainers"
  ON workout_plans FOR SELECT
  USING (studio_has_trainer(created_by));

-- ─── workout_sessions ────────────────────────────────────────────────
-- Studio owner can read sessions linked to plans created by their trainers
-- (alternative source for "Completed this week" if clients log sessions).
DROP POLICY IF EXISTS "studio owner reads workout sessions" ON workout_sessions;

CREATE POLICY "studio owner reads workout sessions"
  ON workout_sessions FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM workout_plans WHERE studio_has_trainer(created_by)
    )
  );
