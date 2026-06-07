-- ═══════════════════════════════════════════════════════════════
-- Events, Alerts, Operational Tasks, Audit Log
-- MVP Component #9 — Eventos, Alertas e Tarefas
-- ═══════════════════════════════════════════════════════════════

-- system_events: immutable domain event log
CREATE TABLE IF NOT EXISTS system_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  payload      JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_events_user_id_idx    ON system_events(user_id);
CREATE INDEX IF NOT EXISTS system_events_event_type_idx ON system_events(event_type);
CREATE INDEX IF NOT EXISTS system_events_entity_id_idx  ON system_events(entity_id);
CREATE INDEX IF NOT EXISTS system_events_created_at_idx ON system_events(created_at DESC);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- user sees own events
CREATE POLICY "system_events: own read" ON system_events
  FOR SELECT USING (auth.uid() = user_id);

-- trainer sees events for linked active clients
CREATE POLICY "system_events: trainer read client" ON system_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.trainer_id = auth.uid()
        AND tc.client_id  = system_events.user_id
        AND tc.status     = 'active'
    )
  );

CREATE POLICY "system_events: own insert" ON system_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- trainer_alerts: actionable signals for trainers
CREATE TABLE IF NOT EXISTS trainer_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type   TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'medium',   -- low / medium / high / critical
  title        TEXT NOT NULL,
  body         TEXT,
  status       TEXT NOT NULL DEFAULT 'open',     -- open / acknowledged / resolved
  session_id   UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  event_id     UUID REFERENCES system_events(id)  ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS trainer_alerts_trainer_id_idx ON trainer_alerts(trainer_id);
CREATE INDEX IF NOT EXISTS trainer_alerts_client_id_idx  ON trainer_alerts(client_id);
CREATE INDEX IF NOT EXISTS trainer_alerts_status_idx     ON trainer_alerts(status);
CREATE INDEX IF NOT EXISTS trainer_alerts_created_at_idx ON trainer_alerts(created_at DESC);

ALTER TABLE trainer_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_alerts: trainer read" ON trainer_alerts
  FOR SELECT USING (auth.uid() = trainer_id);

CREATE POLICY "trainer_alerts: insert by trainer or client" ON trainer_alerts
  FOR INSERT WITH CHECK (
    auth.uid() = trainer_id
    OR EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.trainer_id = trainer_alerts.trainer_id
        AND tc.client_id  = auth.uid()
        AND tc.status     = 'active'
    )
  );

CREATE POLICY "trainer_alerts: trainer update" ON trainer_alerts
  FOR UPDATE USING (auth.uid() = trainer_id);


-- operational_tasks: trainer task queue
CREATE TABLE IF NOT EXISTS operational_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type           TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  priority            TEXT NOT NULL DEFAULT 'medium',  -- low / medium / high / urgent
  status              TEXT NOT NULL DEFAULT 'pending', -- pending / in_progress / completed / cancelled
  due_date            DATE,
  related_session_id  UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  related_alert_id    UUID REFERENCES trainer_alerts(id)   ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS operational_tasks_trainer_id_idx ON operational_tasks(trainer_id);
CREATE INDEX IF NOT EXISTS operational_tasks_client_id_idx  ON operational_tasks(client_id);
CREATE INDEX IF NOT EXISTS operational_tasks_status_idx     ON operational_tasks(status);
CREATE INDEX IF NOT EXISTS operational_tasks_priority_idx   ON operational_tasks(priority);

ALTER TABLE operational_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operational_tasks: trainer read" ON operational_tasks
  FOR SELECT USING (auth.uid() = trainer_id);

CREATE POLICY "operational_tasks: insert by trainer or client" ON operational_tasks
  FOR INSERT WITH CHECK (
    auth.uid() = trainer_id
    OR EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.trainer_id = operational_tasks.trainer_id
        AND tc.client_id  = auth.uid()
        AND tc.status     = 'active'
    )
  );

CREATE POLICY "operational_tasks: trainer update" ON operational_tasks
  FOR UPDATE USING (auth.uid() = trainer_id);


-- audit_log: security / compliance audit trail
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  old_value    JSONB,
  new_value    JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx   ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx     ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- append-only for any authenticated user; read restricted to service_role
CREATE POLICY "audit_log: authenticated insert" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
