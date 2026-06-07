-- ═══════════════════════════════════════════════════════════════════
-- Fix 1: Trainer can invite clients
-- trainer_clients had no INSERT policy — trainers got RLS violation.
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "trainer inserts own client" ON trainer_clients;

CREATE POLICY "trainer inserts own client"
  ON trainer_clients FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

-- Also allow trainers to update status (accept/pause/end) on their rows
DROP POLICY IF EXISTS "trainer updates own client status" ON trainer_clients;

CREATE POLICY "trainer updates own client status"
  ON trainer_clients FOR UPDATE
  USING (auth.uid() = trainer_id);
