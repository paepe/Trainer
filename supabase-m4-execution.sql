-- M4 — Execução Real da Sessão
-- Run after: supabase-migration-v2.sql, supabase-migration-auth-rbac.sql
-- Adds 4 new tables + extends workout_sessions with M4 columns.

-- ─── 1. Extend workout_sessions ──────────────────────────────────────────────
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS status             text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','abandoned')),
  ADD COLUMN IF NOT EXISTS total_duration_min int,
  ADD COLUMN IF NOT EXISTS notes              text;

-- ─── 2. workout_session_exercises ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_session_exercises (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  plan_exercise_id     uuid REFERENCES plan_exercises(id) ON DELETE SET NULL,
  exercise_id          uuid REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name        text NOT NULL,
  muscle_group         text,
  order_index          int  NOT NULL DEFAULT 0,
  sets_prescribed      int,
  reps_prescribed      int,
  load_kg_prescribed   numeric(6,2),
  rest_seconds         int,
  notes                text,
  status               text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','skipped','substituted')),
  substituted_from_id  uuid REFERENCES workout_session_exercises(id) ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now()
);

-- ─── 3. workout_set_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_set_logs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id  uuid NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
  session_id           uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  set_number           int  NOT NULL,
  reps_done            int,
  load_kg              numeric(6,2),
  rpe                  int  CHECK (rpe BETWEEN 1 AND 10),
  duration_seconds     int,
  completed_at         timestamptz DEFAULT now(),
  created_at           timestamptz DEFAULT now()
);

-- ─── 4. workout_pain_events ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_pain_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  session_exercise_id  uuid REFERENCES workout_session_exercises(id) ON DELETE SET NULL,
  exercise_id          uuid REFERENCES exercises(id) ON DELETE SET NULL,
  body_region          text NOT NULL,
  intensity            int  NOT NULL CHECK (intensity BETWEEN 1 AND 10),
  reported_at          timestamptz DEFAULT now(),
  trainer_notified     bool DEFAULT false,
  created_at           timestamptz DEFAULT now()
);

-- ─── 5. post_workout_feedback ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_workout_feedback (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL UNIQUE REFERENCES workout_sessions(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_feeling  int  NOT NULL CHECK (overall_feeling BETWEEN 1 AND 5),
  energy_after     int  CHECK (energy_after BETWEEN 1 AND 10),
  notes            text,
  submitted_at     timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_set_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_pain_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_workout_feedback     ENABLE ROW LEVEL SECURITY;

-- workout_session_exercises
CREATE POLICY "owner access session exercises" ON workout_session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "trainer reads client session exercises" ON workout_session_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      JOIN trainer_clients tc ON tc.client_id = ws.user_id
      WHERE ws.id = session_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- workout_set_logs
CREATE POLICY "owner access set logs" ON workout_set_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "trainer reads client set logs" ON workout_set_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      JOIN trainer_clients tc ON tc.client_id = ws.user_id
      WHERE ws.id = session_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- workout_pain_events
CREATE POLICY "owner access pain events" ON workout_pain_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "trainer reads client pain events" ON workout_pain_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      JOIN trainer_clients tc ON tc.client_id = ws.user_id
      WHERE ws.id = session_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- post_workout_feedback
CREATE POLICY "owner access post workout feedback" ON post_workout_feedback
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "trainer reads client feedback" ON post_workout_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = post_workout_feedback.user_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wse_session_id  ON workout_session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_wsl_session_id  ON workout_set_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_wsl_se_id       ON workout_set_logs(session_exercise_id);
CREATE INDEX IF NOT EXISTS idx_wpe_session_id  ON workout_pain_events(session_id);
CREATE INDEX IF NOT EXISTS idx_pwf_user_id     ON post_workout_feedback(user_id);
