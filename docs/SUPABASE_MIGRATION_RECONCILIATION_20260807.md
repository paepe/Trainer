# Supabase migration reconciliation — 2026-08-07

**Status:** Prepared; cloud mutation deliberately blocked pending an auditable baseline.

## Evidence

- The linked cloud project is `sevenseeds.trainer` (`xbfszzdyskwdctlqzztl`).
- A schema-only dump was captured on 2026-08-07 before any attempted write.
- Cloud migration history contains legacy timestamped migrations absent from this repository.
- This repository contains local migrations `20260601000000` through
  `20260807070000` that are absent from cloud migration history.
- The cloud schema still has the original invitation contract:
  `accept_trainer_invitation(p_token, p_user_id)`, and lacks the lifecycle,
  discovery, decline, audit and relationship-ending additions introduced locally.
- `supabase db pull --linked --schema public` was intentionally unable to
  generate a migration because the CLI detected the divergent histories. Its
  suggested repair would mark seven unapplied 2026-08-07 migrations as applied;
  that must not be executed because it would make the history lie about schema
  state.

## Decision

Do not use `supabase db push` while the two histories diverge. It would make the
migration tool choose an unsafe ordering and could replay baseline migrations over
an already populated cloud schema.

## Safe publication sequence

1. Keep the schema dump as the remote baseline and create a repository migration
   baseline that represents the cloud schema without replaying legacy DDL.
2. Compare each lifecycle migration against that baseline; retain only additive,
   idempotent DDL and qualify pre-existing objects where required.
3. Execute the reviewed additive SQL in the cloud transactionally through the
   approved database change channel.
4. Record exactly those applied version identifiers in Supabase migration history
   using `migration repair --status applied`; never mark a migration applied before
   its DDL succeeds.
5. Re-run `supabase migration list --linked`, schema diff, authorization smoke and
   the cloud browser test before release.

## Reviewed additive patch order

The cloud patch has been reviewed against the schema dump and must run in this
order, in a single transaction where the approved change channel permits it:

1. `supabase-trainer-invitation-lifecycle-20260807.sql`
2. `supabase-trainer-in-app-invitations-20260807.sql`
3. `supabase-fix-trainer-in-app-invitation-expiry-20260807.sql`
4. `supabase-add-trainer-in-app-invite-token-20260807.sql`
5. `supabase-trainer-invitation-decline-20260807.sql`
6. `supabase-trainer-invitation-revoke-audit-20260807.sql`
7. `supabase-fix-decline-invitation-ambiguous-column-20260807.sql`
8. `supabase-ended-link-access-revocation-20260807.sql`

All are additive or replace a named function/policy. The existing cloud
`accept_trainer_invitation(p_token, p_user_id)` contract is intentionally
preserved; the client-side call must continue supplying the authenticated user ID.

## Release gate

Cloud application was completed through the approved SQL channel on 2026-08-07:
the eight reviewed additive patches succeeded and post-apply inspection confirmed
the discovery table, link audit table, decline audit column and lifecycle RPCs.
The CLI migration history remains divergent and is intentionally not repaired
retroactively; it must be baselined before this repository resumes using
`supabase db push` as its publication mechanism.

## Repeatable read-only gate

Run `bash scripts/supabase-invitation-cloud-preflight.sh` immediately before the
approved cloud SQL change. It dumps only the public schema and verifies that the
original invitation baseline is intact while the lifecycle patch is absent. It
explicitly refuses a partially-applied patch and never modifies cloud state.

**Last execution:** passed before application on 2026-08-07. After application it
is expected to refuse the now-partial-from-its-perspective state; use the
post-apply object inspection instead.
