# Workout Plan Expiry Control

**Status:** Active operational control  
**Revision:** 2026-08-11

## Canonical rule

A manual TRAINER plan receives an immutable `expires_at` instant when it is
sent. The database calculates that instant from the trainer's configured plan
expiry period and its own clock. It is an absolute UTC instant; each client
sees it formatted in their local language and timezone.

## CTA contract

Before a client can start a prescribed plan, the database locks and validates
the plan in one operation.

- `started`: the plan is activated and Workout Mode may open.
- `expired`: the plan is cancelled and Workout Mode must not open.
- `unavailable`: the plan is cancelled, completed, absent or otherwise not
  startable; Workout Mode must not open.

The Workout screen also expires overdue manual plans before querying its
actionable list. This is a defensive second boundary, not the primary CTA
decision.

## Communication

When a plan expires, both the client and linked trainer receive an Inbox
notice. The client CTA displays the locally formatted expiry moment when an
already-rendered plan expires just before it is started.

## Governance assessment

**No controlled-document impact (2026-08-11):** this change governs lifecycle
integrity for an existing trainer-prescribed plan. It does not alter AI
provider use, entitlement, sponsored capability, sensitive-data processing,
commercial promise, Terms or Privacy wording. `FEATURE_ACCESS_MATRIX.md` and
the AI governance controlled documents therefore remain unchanged.

## Evidence

- Migration: `20260811201000_server_authoritative_workout_plan_expiry.sql`
- Local transactional validation: expired CTA returned `expired` and stored
  `cancelled`; valid CTA returned `started` and stored `active`; transaction
  rolled back.
