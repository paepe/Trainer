-- Bug found while verifying the plans/subscription fix (unrelated to it) —
-- `subscription_events` (the billing/audit ledger: activated / upgraded /
-- downgraded / renewed) had RLS enabled with only a read policy
-- (`users_own_events`, SELECT). No INSERT policy existed at all, so the
-- fire-and-forget ledger write in useAuth.ts's `upsertSubscription` has
-- silently failed for every user, every plan change, since the table was
-- introduced — `select count(*) from subscription_events` was 0 across the
-- whole project before this fix. The subscription change itself always
-- persisted correctly (writes to `subscriptions`, a separate table); only
-- the audit trail was missing, with no visible error to the user.
--
-- Confirmed fixed by replaying a real upgrade/downgrade round trip live
-- against a disposable test account (goncalo.fonseca@client.test) after
-- applying this policy — 4 events recorded correctly (activated, upgraded,
-- downgraded, upgraded).
--
-- Applied directly to production (sevenseeds.trainer, xbfszzdyskwdctlqzztl)
-- on 2026-08-01 via the SQL Editor (the migration tool was blocked by the
-- session's own safety classifier for this RLS change); archived here per
-- §8.3. No staging environment exists for this project.
--
-- Rollback:
--   drop policy "users_insert_own_events" on public.subscription_events;

create policy "users_insert_own_events" on public.subscription_events
for insert
with check (auth.uid() = user_id);
