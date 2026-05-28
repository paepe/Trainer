-- Allow trainers to WRITE workout data for their active clients
-- (current policies only allow SELECT — trainers can read but not
-- create/update sessions when training a client in person)

-- 1) workout_sessions — trainer can INSERT / UPDATE for clients
DROP POLICY IF EXISTS "trainer manages client sessions" ON workout_sessions;

CREATE POLICY "trainer manages client sessions" ON workout_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = workout_sessions.user_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- 2) workout_session_exercises — trainer can INSERT / UPDATE for client sessions
DROP POLICY IF EXISTS "trainer manages client session exercises" ON workout_session_exercises;

CREATE POLICY "trainer manages client session exercises" ON workout_session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      JOIN trainer_clients tc ON tc.client_id = ws.user_id
      WHERE ws.id = workout_session_exercises.session_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- 3) workout_set_logs — trainer can INSERT for client sessions
DROP POLICY IF EXISTS "trainer manages client set logs" ON workout_set_logs;

CREATE POLICY "trainer manages client set logs" ON workout_set_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      JOIN trainer_clients tc ON tc.client_id = ws.user_id
      WHERE ws.id = workout_set_logs.session_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- 4) workout_pain_events — trainer can INSERT for client sessions
DROP POLICY IF EXISTS "trainer manages client pain events" ON workout_pain_events;

CREATE POLICY "trainer manages client pain events" ON workout_pain_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      JOIN trainer_clients tc ON tc.client_id = ws.user_id
      WHERE ws.id = workout_pain_events.session_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- 5) post_workout_feedback — trainer can INSERT / UPDATE for clients
DROP POLICY IF EXISTS "trainer manages client feedback" ON post_workout_feedback;

CREATE POLICY "trainer manages client feedback" ON post_workout_feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = post_workout_feedback.user_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );

-- 6) checkin_prontidao — trainer can INSERT for their clients
--    (required for trainer doing readiness check-in for client in person)
DROP POLICY IF EXISTS checkin_prontidao_trainer_insert ON checkin_prontidao;

CREATE POLICY checkin_prontidao_trainer_insert ON checkin_prontidao
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = checkin_prontidao.user_id
        AND tc.trainer_id = auth.uid()
        AND tc.status = 'active'
    )
  );
