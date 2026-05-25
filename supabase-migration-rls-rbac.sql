-- =============================================================================
-- TrAIner · Migration — RLS refactor: gate trainer-access policies on has_permission()
-- Depends on: supabase-migration-auth-rbac.sql (roles, permissions, active_context)
-- Run once in Supabase SQL Editor (RUN WITHOUT RLS).
-- =============================================================================
-- Strategy:
--   Self-access policies are unchanged — every role reads/writes their own data.
--   Trainer/admin cross-user policies get has_permission() prepended so that
--   role escalation (e.g. finance user acting as trainer) is blocked at DB layer.
-- =============================================================================

-- ── workouts ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "trainer reads client workouts" ON workouts;

CREATE POLICY "trainer reads client workouts" ON workouts
  FOR SELECT USING (
    has_permission('view_client_history')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id  = workouts.user_id
    )
  );

-- ── trainer_clients ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "trainer views clients"         ON trainer_clients;
DROP POLICY IF EXISTS "client views own trainer link" ON trainer_clients;
DROP POLICY IF EXISTS "trainer manages clients"       ON trainer_clients;

-- Trainer: read their client roster (gated by permission)
CREATE POLICY "trainer views clients" ON trainer_clients
  FOR SELECT USING (
    has_permission('manage_trainer_clients')
    AND trainer_id = auth.uid()
  );

-- Client: read their own trainer link (so they can see who their trainer is)
CREATE POLICY "client views own trainer link" ON trainer_clients
  FOR SELECT USING (client_id = auth.uid());

-- Trainer: insert/update/delete their own client relationships
CREATE POLICY "trainer manages clients" ON trainer_clients
  FOR ALL USING (
    has_permission('manage_trainer_clients')
    AND trainer_id = auth.uid()
  );

-- ── studios ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "studio owner full access"    ON studios;
DROP POLICY IF EXISTS "studio owner manages studio" ON studios;
-- Keep "studio visible to members" (SELECT) — any member may read studio info

CREATE POLICY "studio owner full access" ON studios
  FOR ALL USING (
    has_permission('manage_studio_trainers')
    AND owner_id = auth.uid()
  );

-- ── studio_members ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "studio owner manages members"  ON studio_members;
DROP POLICY IF EXISTS "studio admin manages members"  ON studio_members;
DROP POLICY IF EXISTS "studio owner sees all members" ON studio_members;
-- Keep "own membership visible" / "member sees own membership" (SELECT)

CREATE POLICY "studio owner sees all members" ON studio_members
  FOR SELECT USING (
    has_permission('view_studio_roster')
    AND EXISTS (
      SELECT 1 FROM studios WHERE id = studio_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "studio admin manages members" ON studio_members
  FOR ALL USING (
    has_permission('manage_studio_trainers')
    AND EXISTS (
      SELECT 1 FROM studios WHERE id = studio_id AND owner_id = auth.uid()
    )
  );

-- ── physical_profiles ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "trainer reads client physical profile" ON physical_profiles;

CREATE POLICY "trainer reads client physical profile" ON physical_profiles
  FOR SELECT USING (
    has_permission('view_client_profile')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id  = physical_profiles.user_id
        AND status     = 'active'
    )
  );

-- ── workout_plans ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "creator manages plan"      ON workout_plans;
DROP POLICY IF EXISTS "trainer reads client plans" ON workout_plans;

CREATE POLICY "creator manages plan" ON workout_plans
  FOR ALL USING (
    has_permission('edit_workout_plan')
    AND auth.uid() = created_by
  );

CREATE POLICY "trainer reads client plans" ON workout_plans
  FOR SELECT USING (
    has_permission('view_client_history')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id  = workout_plans.assigned_to
        AND status     = 'active'
    )
  );

-- ── plan_exercises ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "creator manages plan exercises" ON plan_exercises;

CREATE POLICY "creator manages plan exercises" ON plan_exercises
  FOR ALL USING (
    has_permission('edit_workout_plan')
    AND EXISTS (
      SELECT 1 FROM workout_plans
      WHERE id = plan_id AND created_by = auth.uid()
    )
  );

-- ── workout_sessions ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "trainer reads client sessions" ON workout_sessions;

CREATE POLICY "trainer reads client sessions" ON workout_sessions
  FOR SELECT USING (
    has_permission('view_client_history')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id  = workout_sessions.user_id
        AND status     = 'active'
    )
  );

-- ── profiles (add trainer read — currently only self SELECT/UPDATE exists) ────

DROP POLICY IF EXISTS "trainer reads client profile" ON profiles;

CREATE POLICY "trainer reads client profile" ON profiles
  FOR SELECT USING (
    auth.uid() = id  -- self
    OR (
      has_permission('view_client_profile')
      AND EXISTS (
        SELECT 1 FROM trainer_clients
        WHERE trainer_id = auth.uid()
          AND client_id  = profiles.id
          AND status     = 'active'
      )
    )
  );

-- Replace the original self-only select so the combined policy above handles both
DROP POLICY IF EXISTS "own profile read" ON profiles;

-- ── profile_v2 ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profile_v2_trainer_read ON profile_v2;

CREATE POLICY profile_v2_trainer_read ON profile_v2
  FOR SELECT USING (
    has_permission('view_client_profile')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id  = profile_v2.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status     = 'active'
    )
  );

-- ── checkin_prontidao ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS checkin_prontidao_trainer_read ON checkin_prontidao;

CREATE POLICY checkin_prontidao_trainer_read ON checkin_prontidao
  FOR SELECT USING (
    has_permission('view_client_checkins')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id  = checkin_prontidao.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status     = 'active'
    )
  );

-- ── safety_gate_events ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS safety_gate_trainer_read   ON safety_gate_events;
DROP POLICY IF EXISTS safety_gate_trainer_review ON safety_gate_events;

CREATE POLICY safety_gate_trainer_read ON safety_gate_events
  FOR SELECT USING (
    has_permission('view_client_safety_gate')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id  = safety_gate_events.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status     = 'active'
    )
  );

CREATE POLICY safety_gate_trainer_review ON safety_gate_events
  FOR UPDATE USING (
    has_permission('view_client_safety_gate')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id  = safety_gate_events.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status     = 'active'
    )
  )
  WITH CHECK (human_review_required = true);

-- ── pain_recurrence_signals ───────────────────────────────────────────────────

DROP POLICY IF EXISTS pain_recurrence_trainer_read ON pain_recurrence_signals;

CREATE POLICY pain_recurrence_trainer_read ON pain_recurrence_signals
  FOR SELECT USING (
    has_permission('view_pain_recurrence')
    AND EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id  = pain_recurrence_signals.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status     = 'active'
    )
  );
