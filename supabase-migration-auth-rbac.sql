-- =============================================================================
-- TrAIner · Migration — Auth Foundation: RBAC, active_context, audit, LGPD
-- Implements: Fundação Técnica, Auth, Contexto e Permissões (spec)
-- Run once in Supabase SQL Editor.
-- =============================================================================

-- ── 1. Expand profiles.role CHECK constraint ──────────────────────────────────

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'client', 'trainer', 'studio_admin', 'studio_trainer',
    'internal_trainer', 'technical_coordinator', 'studio_manager',
    'finance', 'moderator', 'ai_system'
  ));

-- ── 2. roles table ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  code        text PRIMARY KEY,
  label       text NOT NULL,
  description text,
  is_system   boolean NOT NULL DEFAULT false,  -- ai_system, moderator
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO roles (code, label, description, is_system) VALUES
  ('client',               'Aluno',                  'End-user / athlete',                         false),
  ('trainer',              'Trainer',                 'Independent personal trainer',               false),
  ('studio_admin',         'Studio Admin',            'Studio owner / administrator',               false),
  ('studio_trainer',       'Studio Trainer',          'Trainer employed by a studio',               false),
  ('internal_trainer',     'Internal Trainer',        'Platform-internal trainer (ops)',            false),
  ('technical_coordinator','Technical Coordinator',   'Technical coordination & protocol review',   false),
  ('studio_manager',       'Studio Manager',          'Studio operations manager',                  false),
  ('finance',              'Finance',                 'Billing and financial operations',           false),
  ('moderator',            'Moderator',               'Content moderation',                         true),
  ('ai_system',            'AI System',               'Machine-to-machine API principal',           true)
ON CONFLICT (code) DO NOTHING;

-- ── 3. permissions table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permissions (
  code          text PRIMARY KEY,
  description   text NOT NULL,
  privacy_tier  text NOT NULL DEFAULT 'T1'
    CHECK (privacy_tier IN ('T1', 'T2', 'T3', 'T4')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO permissions (code, description, privacy_tier) VALUES
  -- T1 — shareable
  ('view_own_profile',           'Read own profile',                          'T1'),
  ('edit_own_profile',           'Edit own profile',                          'T1'),
  ('view_workout_plan',          'View assigned workout plan',                 'T1'),
  ('start_workout',              'Start a workout session',                    'T1'),
  ('submit_checkin',             'Submit a check-in',                         'T1'),
  ('view_own_history',           'View own workout/checkin history',           'T1'),
  -- T2 — conditional
  ('view_client_profile',        'Read a client''s profile (trainer)',         'T2'),
  ('edit_workout_plan',          'Create/edit workout plans',                  'T2'),
  ('view_client_checkins',       'Read client check-in data',                 'T2'),
  ('view_client_safety_gate',    'Read client safety gate results',           'T2'),
  ('view_client_history',        'Read client workout history',               'T2'),
  ('manage_trainer_clients',     'Link/unlink clients to trainer',            'T2'),
  ('manage_studio_trainers',     'Add/remove trainers in studio',             'T2'),
  ('view_studio_roster',         'View studio client roster',                 'T2'),
  -- T3 — blinded
  ('view_pain_recurrence',       'View pain recurrence signals (blinded)',    'T3'),
  ('view_safety_alerts',         'View safety alert summaries (blinded)',     'T3'),
  ('generate_workout_ai',        'Trigger AI workout generation',             'T3'),
  ('moderate_content',           'Moderate platform content',                 'T3'),
  -- T4 — opt-in private
  ('view_cycle_data',            'View menstrual/hormonal cycle data',        'T4'),
  ('view_emotional_state',       'View declared emotional state data',        'T4'),
  ('view_sensitive_factors',     'View sensitive lifestyle factors',          'T4'),
  -- Admin
  ('manage_all_roles',           'Assign/revoke roles platform-wide',         'T1'),
  ('view_audit_logs',            'Read audit log entries',                    'T1'),
  ('manage_billing',             'Manage billing and subscriptions',          'T1')
ON CONFLICT (code) DO NOTHING;

-- ── 4. role_permissions junction ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code       text NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_code, permission_code)
);

-- Seed permission matrix
INSERT INTO role_permissions (role_code, permission_code) VALUES
  -- client
  ('client', 'view_own_profile'),
  ('client', 'edit_own_profile'),
  ('client', 'view_workout_plan'),
  ('client', 'start_workout'),
  ('client', 'submit_checkin'),
  ('client', 'view_own_history'),

  -- trainer (independent)
  ('trainer', 'view_own_profile'),
  ('trainer', 'edit_own_profile'),
  ('trainer', 'view_client_profile'),
  ('trainer', 'edit_workout_plan'),
  ('trainer', 'view_client_checkins'),
  ('trainer', 'view_client_safety_gate'),
  ('trainer', 'view_client_history'),
  ('trainer', 'manage_trainer_clients'),
  ('trainer', 'view_pain_recurrence'),
  ('trainer', 'view_safety_alerts'),
  ('trainer', 'generate_workout_ai'),
  ('trainer', 'view_cycle_data'),
  ('trainer', 'view_emotional_state'),
  ('trainer', 'view_sensitive_factors'),

  -- studio_trainer (same as trainer, minus client management)
  ('studio_trainer', 'view_own_profile'),
  ('studio_trainer', 'edit_own_profile'),
  ('studio_trainer', 'view_client_profile'),
  ('studio_trainer', 'edit_workout_plan'),
  ('studio_trainer', 'view_client_checkins'),
  ('studio_trainer', 'view_client_safety_gate'),
  ('studio_trainer', 'view_client_history'),
  ('studio_trainer', 'view_pain_recurrence'),
  ('studio_trainer', 'view_safety_alerts'),
  ('studio_trainer', 'generate_workout_ai'),
  ('studio_trainer', 'view_cycle_data'),
  ('studio_trainer', 'view_emotional_state'),
  ('studio_trainer', 'view_sensitive_factors'),

  -- studio_admin (full studio access)
  ('studio_admin', 'view_own_profile'),
  ('studio_admin', 'edit_own_profile'),
  ('studio_admin', 'view_client_profile'),
  ('studio_admin', 'edit_workout_plan'),
  ('studio_admin', 'view_client_checkins'),
  ('studio_admin', 'view_client_safety_gate'),
  ('studio_admin', 'view_client_history'),
  ('studio_admin', 'manage_trainer_clients'),
  ('studio_admin', 'manage_studio_trainers'),
  ('studio_admin', 'view_studio_roster'),
  ('studio_admin', 'view_pain_recurrence'),
  ('studio_admin', 'view_safety_alerts'),
  ('studio_admin', 'generate_workout_ai'),
  ('studio_admin', 'view_cycle_data'),
  ('studio_admin', 'view_emotional_state'),
  ('studio_admin', 'view_sensitive_factors'),
  ('studio_admin', 'view_audit_logs'),

  -- studio_manager (operations, no clinical data)
  ('studio_manager', 'view_own_profile'),
  ('studio_manager', 'manage_studio_trainers'),
  ('studio_manager', 'view_studio_roster'),
  ('studio_manager', 'view_audit_logs'),

  -- internal_trainer (platform trainers — T4 excluded by default)
  ('internal_trainer', 'view_own_profile'),
  ('internal_trainer', 'view_client_profile'),
  ('internal_trainer', 'edit_workout_plan'),
  ('internal_trainer', 'view_client_checkins'),
  ('internal_trainer', 'view_client_safety_gate'),
  ('internal_trainer', 'view_client_history'),
  ('internal_trainer', 'view_pain_recurrence'),
  ('internal_trainer', 'view_safety_alerts'),
  ('internal_trainer', 'generate_workout_ai'),

  -- technical_coordinator
  ('technical_coordinator', 'view_own_profile'),
  ('technical_coordinator', 'view_client_profile'),
  ('technical_coordinator', 'edit_workout_plan'),
  ('technical_coordinator', 'view_client_history'),
  ('technical_coordinator', 'generate_workout_ai'),
  ('technical_coordinator', 'view_audit_logs'),

  -- finance (billing only, no clinical)
  ('finance', 'view_own_profile'),
  ('finance', 'manage_billing'),
  ('finance', 'view_audit_logs'),

  -- moderator
  ('moderator', 'view_own_profile'),
  ('moderator', 'moderate_content'),
  ('moderator', 'view_audit_logs'),

  -- ai_system (machine principal)
  ('ai_system', 'generate_workout_ai'),
  ('ai_system', 'view_client_checkins'),
  ('ai_system', 'view_client_safety_gate'),
  ('ai_system', 'view_cycle_data'),
  ('ai_system', 'view_sensitive_factors'),

  -- super-set: manage_all_roles is explicit grant only
  ('studio_admin', 'manage_all_roles')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ── 5. active_context — multi-role context switching ─────────────────────────
-- One row per user; updated when they switch their operative role/studio.

CREATE TABLE IF NOT EXISTS active_context (
  user_id      uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  active_role  text NOT NULL REFERENCES roles(code),
  studio_id    uuid REFERENCES studios(id) ON DELETE SET NULL,
  switched_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE active_context ENABLE ROW LEVEL SECURITY;

-- Users can read and update only their own context
CREATE POLICY "active_context_self" ON active_context
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 6. audit_logs — LGPD compliance ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES profiles(id),
  actor_role  text NOT NULL,
  table_name  text NOT NULL,
  record_id   uuid,
  action      text NOT NULL CHECK (action IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx  ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_record_idx ON audit_logs(table_name, record_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only roles with view_audit_logs permission can read; writes are internal only
CREATE POLICY "audit_logs_read" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_code = (
        SELECT role FROM profiles WHERE id = auth.uid()
      )
      AND rp.permission_code = 'view_audit_logs'
    )
  );

-- ── 7. masked_operational_contexts — T3/T4 LGPD blinding ─────────────────────
-- Actors with T3 access receive a context_token instead of real user PII.
-- Only T1 roles (studio_admin, technical_coordinator) can resolve the token.

CREATE TABLE IF NOT EXISTS masked_operational_contexts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context_token    uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  resolved_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purpose          text NOT NULL,    -- e.g. 'pain_recurrence_review', 'safety_alert'
  requested_by     uuid NOT NULL REFERENCES profiles(id),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS masked_ctx_token_idx   ON masked_operational_contexts(context_token);
CREATE INDEX IF NOT EXISTS masked_ctx_user_idx    ON masked_operational_contexts(resolved_user_id);
CREATE INDEX IF NOT EXISTS masked_ctx_expires_idx ON masked_operational_contexts(expires_at);

ALTER TABLE masked_operational_contexts ENABLE ROW LEVEL SECURITY;

-- Requestor can see their own tokens; T1 roles can resolve
CREATE POLICY "masked_ctx_requestor" ON masked_operational_contexts
  FOR SELECT USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_code = (SELECT role FROM profiles WHERE id = auth.uid())
        AND rp.permission_code = 'manage_all_roles'
    )
  );

-- ── 8. Backfill active_context for existing users ─────────────────────────────

INSERT INTO active_context (user_id, active_role)
SELECT id, role FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- ── 9. Helper function — resolve active role for RLS policies ─────────────────

CREATE OR REPLACE FUNCTION get_active_role(uid uuid DEFAULT auth.uid())
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT active_role FROM active_context WHERE user_id = uid),
    (SELECT role         FROM profiles        WHERE id     = uid)
  );
$$;

-- ── 10. Helper function — permission check ────────────────────────────────────

CREATE OR REPLACE FUNCTION has_permission(perm text, uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_code = get_active_role(uid)
      AND permission_code = perm
  );
$$;
