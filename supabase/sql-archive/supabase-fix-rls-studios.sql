-- Fix: infinite recursion in studios ↔ studio_members RLS policies
--
-- Root cause: studios SELECT policy checked studio_members,
-- and studio_members SELECT policy checked studios → infinite loop.
--
-- Fix: studios uses only owner_id = auth.uid() (no cross-reference).
-- studio_members can still reference studios safely because
-- studios policy is now self-contained.

-- ─── DROP OLD RECURSIVE POLICIES ────────────────────────────
DROP POLICY IF EXISTS "studio visible to members"    ON studios;
DROP POLICY IF EXISTS "studio owner manages studio"  ON studios;
DROP POLICY IF EXISTS "member sees own membership"   ON studio_members;
DROP POLICY IF EXISTS "studio owner sees all members" ON studio_members;
DROP POLICY IF EXISTS "studio admin manages members" ON studio_members;

-- ─── Drop new policies too (idempotent — safe to re-run) ────
DROP POLICY IF EXISTS "studio owner full access"      ON studios;
DROP POLICY IF EXISTS "own membership visible"        ON studio_members;
DROP POLICY IF EXISTS "studio owner manages members"  ON studio_members;

-- ─── studios: simple owner-only policy (no cross-reference) ─
CREATE POLICY "studio owner full access"
  ON studios FOR ALL
  USING     (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─── studio_members: two safe policies ──────────────────────

-- Members can see their own row
CREATE POLICY "own membership visible"
  ON studio_members FOR SELECT
  USING (user_id = auth.uid());

-- Studio owner manages all member rows
-- (references studios, but studios policy is now simple → no recursion)
CREATE POLICY "studio owner manages members"
  ON studio_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM studios
      WHERE id = studio_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studios
      WHERE id = studio_id AND owner_id = auth.uid()
    )
  );
