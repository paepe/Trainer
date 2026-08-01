-- coach_dna — grant read access to a linked client (Phase 2 follow-up).
-- Applied directly to production (sevenseeds.trainer, xbfszzdyskwdctlqzztl) on
-- 2026-08-01; archived here per §8.3 so the repo remains the source of truth.
--
-- Found during live-browser verification of the session-structure workstream
-- (docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md, Phase 2 addendum): the only
-- policy on this table was "trainer manages own coach dna" (trainer_id =
-- auth.uid()). A client reading their own linked trainer's row got `[]`, so
-- Coach DNA never reached the autonomous client flow (StartWorkoutScreen),
-- regardless of what the client-side code or the AI prompt did with it — this
-- predates and is independent of the Phase 0-2 prompt/taxonomy work.
--
-- Additive only: does not alter "trainer manages own coach dna". Grants SELECT
-- only, gated on an active trainer_clients link the client already has read
-- access to via "client views own trainer link".
--
-- Rollback: drop policy "linked client reads trainer coach dna" on public.coach_dna;

create policy "linked client reads trainer coach dna"
on public.coach_dna
for select
to public
using (
  exists (
    select 1
    from public.trainer_clients tc
    where tc.trainer_id = coach_dna.trainer_id
      and tc.client_id = auth.uid()
      and tc.status = 'active'
  )
);
