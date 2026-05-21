-- ═══════════════════════════════════════════════════════════════════
-- Fix: Studio Clients view — allow studio owner to read
-- physical_profiles of clients linked to their trainers.
-- Requires: studio_has_trainer() function (supabase-fix-studio-dashboard.sql)
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "studio owner reads client physical profiles" ON physical_profiles;

CREATE POLICY "studio owner reads client physical profiles"
  ON physical_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id    = physical_profiles.user_id
        AND tc.status       = 'active'
        AND studio_has_trainer(tc.trainer_id)
    )
  );
