-- =============================================================================
-- TrAIner v2 — Schema Migration
-- Modules: Smart Student Profile + Initial Assessment / Readiness Check-in
-- Privacy tiers: T1 shareable · T2 conditional · T3 blinded · T4 private opt-in
-- =============================================================================

-- ── 1. profile_v2 ─────────────────────────────────────────────────────────────
-- One row per user. JSONB per block preserves flexibility during wizard iteration.
-- Sensitive tiers (T3/T4) stored in dedicated columns for targeted RLS control.

CREATE TABLE IF NOT EXISTS profile_v2 (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'welcome',
  completed_at timestamptz,

  -- T1: shareable with trainer/studio (consent matrix controls final visibility)
  basic_data         jsonb,
  objectives         jsonb,
  movement_history   jsonb,
  functional_capacity jsonb,
  environment        jsonb,
  availability       jsonb,
  preferences        jsonb,

  -- T2: conditional share — consent matrix arbitrates per-field visibility
  abandon_history  jsonb,
  habits           jsonb,
  comorbidities    jsonb,
  declared_health  jsonb,

  -- T3: blinded — visible only to user; operationally masked (never raw to AI/trainer)
  sensitive_factors jsonb,

  -- T4: opt-in private — never exposed without explicit in-session user action
  body_rhythm jsonb,

  -- Cross-cutting
  consent jsonb,   -- ConsentMatrix
  risk    jsonb,   -- RiskClassification (R0–R4 + OperationalRiskFlags)

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT profile_v2_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS profile_v2_user_id_idx ON profile_v2(user_id);
CREATE INDEX IF NOT EXISTS profile_v2_step_idx    ON profile_v2(current_step);

ALTER TABLE profile_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_v2_self ON profile_v2
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY profile_v2_trainer_read ON profile_v2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id = profile_v2.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status = 'active'
    )
  );

-- ── 2. checkin_prontidao ──────────────────────────────────────────────────────
-- Stores every check-in event regardless of variant.
-- readiness_score and ai_led_blocked denormalised for query performance.

CREATE TABLE IF NOT EXISTS checkin_prontidao (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  variant       text NOT NULL CHECK (variant IN ('voice', 'quick', 'detailed', 'post_workout')),
  occurred_at   timestamptz DEFAULT now(),

  quick_data        jsonb,   -- CheckInQuick
  detailed_data     jsonb,   -- CheckInDetailed
  voice_data        jsonb,   -- CheckInVoice (transcript + ai_extracted; no audio ref)
  post_workout_data jsonb,   -- CheckInPostWorkout

  safety_gate     jsonb,     -- SafetyGateResult
  readiness_score integer,   -- 0–100, denormalised for range queries
  ai_led_blocked  boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_prontidao_user_id_idx      ON checkin_prontidao(user_id);
CREATE INDEX IF NOT EXISTS checkin_prontidao_occurred_at_idx  ON checkin_prontidao(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS checkin_prontidao_blocked_idx      ON checkin_prontidao(user_id, ai_led_blocked);

ALTER TABLE checkin_prontidao ENABLE ROW LEVEL SECURITY;

CREATE POLICY checkin_prontidao_self ON checkin_prontidao
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY checkin_prontidao_trainer_read ON checkin_prontidao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id = checkin_prontidao.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status = 'active'
    )
  );

-- ── 3. safety_gate_events ─────────────────────────────────────────────────────
-- Immutable audit trail. Human review fields are trainer-writable only.

CREATE TABLE IF NOT EXISTS safety_gate_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_id           uuid REFERENCES checkin_prontidao(id) ON DELETE SET NULL,
  status               text NOT NULL CHECK (status IN ('clear', 'caution', 'blocked')),
  triggered_signals    text[],
  readiness_score      integer,
  ai_led_blocked       boolean,
  human_review_required boolean DEFAULT false,
  human_reviewed_at    timestamptz,
  human_reviewed_by    uuid REFERENCES profiles(id),
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS safety_gate_user_id_idx  ON safety_gate_events(user_id);
CREATE INDEX IF NOT EXISTS safety_gate_status_idx   ON safety_gate_events(user_id, status);
CREATE INDEX IF NOT EXISTS safety_gate_pending_idx  ON safety_gate_events(human_review_required, human_reviewed_at)
  WHERE human_review_required = true AND human_reviewed_at IS NULL;

ALTER TABLE safety_gate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY safety_gate_self ON safety_gate_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY safety_gate_trainer_read ON safety_gate_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id = safety_gate_events.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status = 'active'
    )
  );

CREATE POLICY safety_gate_trainer_review ON safety_gate_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id = safety_gate_events.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status = 'active'
    )
  )
  WITH CHECK (human_review_required = true);

-- ── 4. pain_recurrence_signals ────────────────────────────────────────────────
-- One row per (user, region). Updated on each post-workout pain event.
-- Alert fires when occurrence_count >= 3 within window_days.

CREATE TABLE IF NOT EXISTS pain_recurrence_signals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pain_region         text NOT NULL,
  occurrence_count    integer NOT NULL DEFAULT 1,
  window_days         integer NOT NULL DEFAULT 14,
  alert_triggered     boolean DEFAULT false,
  last_occurrence_at  timestamptz DEFAULT now(),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  CONSTRAINT pain_recurrence_user_region UNIQUE (user_id, pain_region)
);

CREATE INDEX IF NOT EXISTS pain_recurrence_user_idx   ON pain_recurrence_signals(user_id);
CREATE INDEX IF NOT EXISTS pain_recurrence_alert_idx  ON pain_recurrence_signals(user_id, alert_triggered);

ALTER TABLE pain_recurrence_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY pain_recurrence_self ON pain_recurrence_signals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY pain_recurrence_trainer_read ON pain_recurrence_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_clients.client_id = pain_recurrence_signals.user_id
        AND trainer_clients.trainer_id = auth.uid()
        AND trainer_clients.status = 'active'
    )
  );

-- ── 5. churn_risk_signals ─────────────────────────────────────────────────────
-- Internal signal — user-only read. One row per user, upserted on profile completion.

CREATE TABLE IF NOT EXISTS churn_risk_signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reasons     text[],
  risk_score  integer NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  computed_at timestamptz DEFAULT now(),

  CONSTRAINT churn_risk_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS churn_risk_user_idx  ON churn_risk_signals(user_id);
CREATE INDEX IF NOT EXISTS churn_risk_score_idx ON churn_risk_signals(risk_score);

ALTER TABLE churn_risk_signals ENABLE ROW LEVEL SECURITY;

-- Churn signals are internal — user can read own; trainer has no direct access.
CREATE POLICY churn_risk_self ON churn_risk_signals
  FOR ALL USING (auth.uid() = user_id);

-- ── 6. updated_at trigger (shared) ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_v2_updated_at
  BEFORE UPDATE ON profile_v2
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pain_recurrence_updated_at
  BEFORE UPDATE ON pain_recurrence_signals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
