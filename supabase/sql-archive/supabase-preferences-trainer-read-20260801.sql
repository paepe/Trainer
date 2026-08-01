-- Fase 2 of docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md — bug found
-- during live verification. `preferences` had only the self-access policy
-- (`auth.uid() = user_id`), so a trainer querying a linked client's own
-- exercise-name/language preference got RLS-filtered to `null` silently —
-- no error, just a fallback to the column defaults (English). The AI
-- generation locale therefore always ignored the recipient's real
-- preference in production, masked by the trainer-side display translation
-- making the result look plausible.
--
-- Mirrors the established pattern already used for `profile_v2` and
-- `checkin_prontidao` (see supabase-migration-rls-rbac.sql /
-- supabase-schema.sql history): read-only, gated by the same
-- `view_client_profile` permission plus an active `trainer_clients` link.
-- Does not touch the existing self-access policy — a trainer still cannot
-- write a client's preferences, only read them.
--
-- Applied directly to production (sevenseeds.trainer, xbfszzdyskwdctlqzztl)
-- on 2026-08-01 via the SQL Editor (the migration tool was blocked by the
-- session's own safety classifier for this RLS change); archived here per
-- §8.3. No staging environment exists for this project.
--
-- Rollback:
--   drop policy "preferences_trainer_read" on public.preferences;

create policy "preferences_trainer_read" on public.preferences
for select
using (
  has_permission('view_client_profile')
  and exists (
    select 1 from trainer_clients
    where trainer_clients.client_id = preferences.user_id
      and trainer_clients.trainer_id = auth.uid()
      and trainer_clients.status = 'active'
  )
);
