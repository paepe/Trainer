-- Client can update status on plans assigned to them
-- (cancel, postpone — content controlled by trainer; client controls lifecycle)
-- Fixes: cancel/postpone buttons in StartWorkoutScreen were updating local state
-- but silently failing the DB UPDATE (no RLS UPDATE policy existed for clients).
-- Also fixes: autoExpirePlans trigger='client' in StartWorkoutScreen + HistoryScreen.
CREATE POLICY "assigned client updates own plan status" ON workout_plans
  FOR UPDATE
  USING  (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);
