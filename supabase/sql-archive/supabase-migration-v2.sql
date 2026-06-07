-- ═══════════════════════════════════════════════════════════
-- TrAIner · Schema Migration v2
-- Multi-actor: Client / Trainer / Studio + AI Governance
-- Corre no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════


-- ─── 1. EXTEND profiles.role ────────────────────────────────
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'trainer', 'studio_admin', 'studio_trainer'));


-- ─── 2. STUDIOS ─────────────────────────────────────────────
CREATE TABLE studios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  logo_url    text,
  owner_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);


-- ─── 3. STUDIO MEMBERS ──────────────────────────────────────
CREATE TABLE studio_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   uuid REFERENCES studios(id)  ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role        text DEFAULT 'trainer' CHECK (role IN ('admin', 'trainer')),
  permissions jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (studio_id, user_id)
);


-- ─── 4. ENHANCE trainer_clients ─────────────────────────────
ALTER TABLE trainer_clients
  ADD COLUMN IF NOT EXISTS studio_id   uuid REFERENCES studios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status      text DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'paused', 'ended')),
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS invited_at  timestamptz DEFAULT now();


-- ─── 5. PHYSICAL PROFILES ───────────────────────────────────
CREATE TABLE physical_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  weight_kg           numeric(5,2),
  height_cm           int,
  birth_year          int,
  fitness_level       text CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  primary_goal        text,
  secondary_goals     text[],
  available_minutes   int DEFAULT 45,
  location_preference text CHECK (location_preference IN ('gym', 'home', 'outdoor', 'any')),
  equipment           text[],
  restrictions        text[],
  updated_at          timestamptz DEFAULT now()
);


-- ─── 6. ENHANCE checkins ────────────────────────────────────
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS sleep_quality     text CHECK (sleep_quality IN ('poor', 'fair', 'good')),
  ADD COLUMN IF NOT EXISTS location          text CHECK (location IN ('gym', 'home', 'outdoor')),
  ADD COLUMN IF NOT EXISTS available_minutes int,
  ADD COLUMN IF NOT EXISTS equipment         text[];


-- ─── 7. WORKOUT PROTOCOLS (Studio library) ──────────────────
CREATE TABLE workout_protocols (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id         uuid REFERENCES studios(id) ON DELETE CASCADE,
  created_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name              text NOT NULL,
  objective         text,
  level             text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes  int,
  description       text,
  contraindications text[],
  tags              text[],
  is_public         bool DEFAULT false,
  created_at        timestamptz DEFAULT now()
);


-- ─── 8. PROTOCOL EXERCISES ──────────────────────────────────
CREATE TABLE protocol_exercises (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id          uuid REFERENCES workout_protocols(id) ON DELETE CASCADE NOT NULL,
  exercise_name        text NOT NULL,
  muscle_group         text,
  sets                 int,
  reps                 int,
  load_kg              numeric(6,2),
  rest_seconds         int,
  duration_seconds     int,
  intensity            text CHECK (intensity IN ('low', 'moderate', 'high')),
  notes                text,
  video_url            text,
  alternative_exercise text,
  order_index          int NOT NULL DEFAULT 0
);


-- ─── 9. WORKOUT PLANS (Governance object) ───────────────────
CREATE TABLE workout_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  protocol_id    uuid REFERENCES workout_protocols(id) ON DELETE SET NULL,
  source         text DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai_generated', 'studio_template', 'hybrid')),
  status         text DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'sent', 'active', 'completed')),
  ai_notes       text,
  trainer_notes  text,
  scheduled_date date,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);


-- ─── 10. PLAN EXERCISES ─────────────────────────────────────
CREATE TABLE plan_exercises (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id              uuid REFERENCES workout_plans(id) ON DELETE CASCADE NOT NULL,
  exercise_name        text NOT NULL,
  muscle_group         text,
  sets                 int,
  reps                 int,
  load_kg              numeric(6,2),
  rest_seconds         int,
  duration_seconds     int,
  intensity            text,
  notes                text,
  video_url            text,
  alternative_exercise text,
  order_index          int NOT NULL DEFAULT 0,
  -- actual execution
  completed            bool DEFAULT false,
  actual_sets          int,
  actual_reps          int,
  actual_load_kg       numeric(6,2)
);


-- ─── 11. WORKOUT SESSIONS (Execution) ───────────────────────
CREATE TABLE workout_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id           uuid REFERENCES workout_plans(id) ON DELETE SET NULL,
  user_id           uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at        timestamptz DEFAULT now(),
  completed_at      timestamptz,
  duration_minutes  int,
  feedback_energy   int CHECK (feedback_energy BETWEEN 1 AND 10),
  feedback_notes    text,
  performance_score numeric(4,2),
  created_at        timestamptz DEFAULT now()
);


-- ─── 12. AI SUGGESTIONS ─────────────────────────────────────
CREATE TABLE ai_suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id     uuid REFERENCES workout_plans(id) ON DELETE SET NULL,
  checkin_id  uuid REFERENCES checkins(id) ON DELETE SET NULL,
  context     jsonb,
  suggestion  text,
  accepted    bool,
  modified    bool DEFAULT false,
  created_at  timestamptz DEFAULT now()
);


-- ─── 13. RLS POLICIES ───────────────────────────────────────

-- studios
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "studio visible to members"
  ON studios FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM studio_members WHERE studio_id = studios.id AND user_id = auth.uid())
  );
CREATE POLICY "studio owner manages studio"
  ON studios FOR ALL USING (owner_id = auth.uid());

-- studio_members
ALTER TABLE studio_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member sees own membership"
  ON studio_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "studio owner sees all members"
  ON studio_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM studios WHERE id = studio_id AND owner_id = auth.uid())
  );
CREATE POLICY "studio owner manages members"
  ON studio_members FOR ALL USING (
    EXISTS (SELECT 1 FROM studios WHERE id = studio_id AND owner_id = auth.uid())
  );

-- physical_profiles
ALTER TABLE physical_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own physical profile"
  ON physical_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "trainer reads client physical profile"
  ON physical_profiles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id = physical_profiles.user_id
        AND status = 'active'
    )
  );

-- workout_protocols
ALTER TABLE workout_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public protocols readable"
  ON workout_protocols FOR SELECT USING (is_public = true);
CREATE POLICY "creator manages protocol"
  ON workout_protocols FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "studio members read protocols"
  ON workout_protocols FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM studio_members
      WHERE studio_id = workout_protocols.studio_id AND user_id = auth.uid()
    )
  );

-- protocol_exercises
ALTER TABLE protocol_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protocol exercise follows protocol visibility"
  ON protocol_exercises FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_protocols wp WHERE wp.id = protocol_id AND (
        wp.is_public = true OR
        wp.created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM studio_members sm WHERE sm.studio_id = wp.studio_id AND sm.user_id = auth.uid())
      )
    )
  );
CREATE POLICY "protocol creator manages exercises"
  ON protocol_exercises FOR ALL USING (
    EXISTS (SELECT 1 FROM workout_protocols WHERE id = protocol_id AND created_by = auth.uid())
  );

-- workout_plans
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assigned user reads own plan"
  ON workout_plans FOR SELECT USING (auth.uid() = assigned_to);
CREATE POLICY "creator manages plan"
  ON workout_plans FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "trainer reads client plans"
  ON workout_plans FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id = workout_plans.assigned_to
        AND status = 'active'
    )
  );

-- plan_exercises
ALTER TABLE plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan exercise visible to plan participants"
  ON plan_exercises FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_plans wp WHERE wp.id = plan_id AND (
        wp.assigned_to = auth.uid() OR wp.created_by = auth.uid()
      )
    )
  );
CREATE POLICY "creator manages plan exercises"
  ON plan_exercises FOR ALL USING (
    EXISTS (SELECT 1 FROM workout_plans WHERE id = plan_id AND created_by = auth.uid())
  );
CREATE POLICY "assigned user marks exercise complete"
  ON plan_exercises FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workout_plans WHERE id = plan_id AND assigned_to = auth.uid())
  );

-- workout_sessions
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions"
  ON workout_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "trainer reads client sessions"
  ON workout_sessions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients
      WHERE trainer_id = auth.uid()
        AND client_id = workout_sessions.user_id
        AND status = 'active'
    )
  );

-- ai_suggestions
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai suggestions"
  ON ai_suggestions FOR ALL USING (auth.uid() = user_id);


-- ─── 14. UPDATE TRIGGER TO PERSIST ROLE ─────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'client')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
