# Plano — Organização, Filtros e Arquivamento da Inbox

**Status:** In controlled pre-release validation — Phases 0–4 complete; Phase 5 in progress
**Version:** 1.0
**Created:** 2026-08-11
**Last reviewed:** 2026-08-11
**Owners:** Product · Engineering · Privacy
**Authority:** [Executive Technology Directive](../policies/references/EXECUTIVE_TECHNOLOGY_DIRECTIVE.md) §§4–5, 7–10
**Related plans:** [Trainer invitation lifecycle](TRAINER_INVITATION_LIFECYCLE_AND_DISCOVERY_PLAN.md) · [Release assurance](RELEASE_ASSURANCE_AND_STAGING_ADOPTION_PLAN.md)

---

## 1. Objective

Make the shared CLIENT and TRAINER Inbox usable beyond the current 50-item
window, while preserving actionability, auditability, privacy and role
boundaries. The result is an organised notification centre: searchable,
filterable, sortable and reversibly archivable.

The existing `notification_log` remains the canonical record of operational
events. Archive is a recipient-specific mailbox state; it never deletes an
event, invitation, trainer-client link, workout, access grant or health data.

### Scope

- reusable list controls for search, filter, scope, ordering and bulk selection;
- separate active and archived Inbox views for both roles;
- cursor pagination/load-more in place of the hard UI cap of 50;
- server-authoritative, auditable archive/restore operations;
- responsive and localised UI in PT, EN, ES and DE.

### Out of scope

- a conversational chat, message threads, typing indicators or delivery/read
  receipts between users;
- changes to invitation status, trainer-client authorisation, licensing,
  sponsored capabilities, AI usage, workout flows or health-data access;
- physical deletion of inbox records.

---

## 2. Product decisions to confirm before Phase 1

| Decision | Proposed behaviour | Status |
|---|---|---|
| Active Inbox | Shows non-archived items only; pending actions are always prioritised. | Approved Product, 2026-08-11 |
| Archive | Reversible, per recipient, and does not change the business status of an item. | Approved Product/Privacy-by-design, 2026-08-11 |
| Pending actions | `Accept invitation`, approval/rejection and access decisions remain in Active Inbox until resolved or expired; they cannot be archived individually or in bulk while actionable. | Approved Product, 2026-08-11 |
| Read state | An item becomes read when opened or by explicit user action; entering the Inbox must not mark unseen history as read. Only read, non-actionable items may be archived. | Approved Product, 2026-08-11 |
| Categories | Action required, invitations, plans & workouts, access & privacy, alerts, and informational/completed. Fixed taxonomy per role; empty categories remain available. | Approved Product, 2026-08-11 |
| Search | Server-authoritative search over authorised canonical sender/title/body metadata; case/accent-insensitive. Search input is never retained as telemetry. | Approved Product/Privacy, 2026-08-11 |
| Ordering | Newest first by default; oldest first and sender A–Z / Z–A. | Approved Product, 2026-08-11 |
| Retention | Archive is an organisation state, not a retention policy. Existing retention rules remain unchanged. | Confirmed by design |

> **Invariant:** inbox organisation must not conceal a still-actionable item,
> bypass a backend decision, or expose health, profile or invitation data to a
> user who is not the notification recipient.

---

## 3. Target interaction model

```text
Inbox
 ├─ Action required (pinned operational items)
 └─ Active notifications
     ├─ search · category · ordering
     ├─ select one / filtered result
     └─ Archive selected → recipient mailbox state only

Archived
 ├─ same search, category and ordering controls
 ├─ Restore selected → Active Inbox
 └─ no DELETE, no business-status transition, no authorisation change

Load more
 └─ cursor-based retrieval within the selected scope and filters
```

The controls are shared with invitation management at the interaction-pattern
level. The same server-authoritative search, pagination, fixed filters and
cross-session reconciliation principles apply to both lists. Domain state,
server operations and available categories stay specific to the Inbox; this
avoids treating notifications as invitations.

---

## 4. Phased plan and live checklist

> At the completion of every phase, update this checklist in the same change set
> with date, evidence (migration, test, command, screenshot or deploy) and a
> concise outcome. Report the completed phase before starting the next one.

### Phase 0 — Product, Privacy and contract gate

**Objective:** define a narrow, safe organisation model before schema or UI
changes.

- [x] Confirm the decisions in section 2, especially the treatment of pending
      actions, read state and archive visibility. **Decision 2026-08-11:** an
      item is read only when opened or explicitly marked read; only read,
      non-actionable items may be archived.
- [x] Classify the change under `AI_GOVERNANCE_CHANGE_GATE.md`. **Conclusion
      2026-08-11:** no AI/provider, licensing, entitlement, sponsorship,
      Terms or marketing claim changes. The additive recipient mailbox state
      requires Privacy/minimisation review and evidence.
- [x] Record the controlled-document impact assessment. **Conclusion
      2026-08-11:** `FEATURE_ACCESS_MATRIX.md`, sponsored-consumption policy,
      Terms and public wording are unaffected; this plan is the implementation
      record for mailbox-state privacy and retention boundaries. Search terms
      and message content must not enter telemetry.
- [x] Define the canonical Inbox category mapping from `notification_log.type`.
      **Decision 2026-08-11:** role-specific fixed taxonomy is derived from a
      versioned mapping in code; categories do not appear or disappear based
      on the current page of results.
- [x] Define error, partial-bulk-result and rollback behaviour. **Decision
      2026-08-11:** every bulk RPC returns per-item outcomes; failure leaves
      the original mailbox state intact; restore is the operational rollback.
- [x] Record release posture: local/Docker validation first, then controlled
      pre-release validation. **Decision 2026-08-11:** shared cloud remains a
      pre-release environment and is used only after local evidence passes.

**Exit criteria:** confirmed product semantics and a documented data/privacy
contract. No implementation is merged in this phase.

**Evidence / outcome:** completed 2026-08-11. Product decisions above resolve
the original ambiguities. No schema, data, entitlement, AI, Terms, Privacy
copy or public behaviour changed in this phase.

### Phase 1 — Data model and server authority

**Objective:** persist archive state safely without granting the UI direct
write authority over arbitrary notifications.

- [x] Add an additive, reversible recipient-mailbox state model, keyed by
      notification and recipient, with `archived_at` and actor/audit fields.
      **Evidence 2026-08-11:** `notification_mailbox_states` in migrations
      `20260811000000`/`20260811000100`; it also carries recipient-scoped read
      state without changing the operational event record.
- [x] Add RLS and server-side RPCs for archive/restore in bulk; validate the
      authenticated recipient owns every requested Inbox item. **Evidence
      2026-08-11:** select-only RLS and security-definer RPCs
      `archive_inbox_notifications` and `mark_inbox_notifications_read`;
      authenticated cross-user test returned `not_found_or_not_owned`.
- [x] Make operations idempotent and return per-item success/failure so a bulk
      UI can report a partial result honestly. **Evidence 2026-08-11:** each
      requested ID returns `archived`, `restored`, `not_read`,
      `action_required` or `not_found_or_not_owned`; authenticated local test
      covered a mixed eligible/pending batch.
- [x] Ensure archive/restore cannot mutate `notification_log` business fields
      such as type, response, expiry, sender or entity reference. **Evidence
      2026-08-11:** the test verified source `response`, `response_at` and
      legacy `read_at` stayed null after recipient mailbox operations.
- [x] Add indexes for recipient, archive scope and chronological cursor access.
      **Evidence 2026-08-11:** mailbox scope index plus
      `idx_notification_log_recipient_created_cursor` in migration
      `20260811000200`.
- [x] Add an authoritative paginated list query/RPC that excludes archived
      items by default and never crosses recipient boundaries; apply canonical,
      authorised search before pagination. **Evidence 2026-08-11:**
      `list_inbox_notifications`, cursor ordered by `created_at`/`id`, bounded
      to 100 rows, with accent/case-insensitive search over authorised canonical
      sender/title/body fields.
- [x] Test RLS/RPC success, cross-user denial, idempotency, partial requests
      and no mutation of invitation/workout/access state. **Evidence
      2026-08-11:** Supabase Docker migration application and authenticated
      Playwright `tests/e2e/inbox-mailbox-state.spec.ts` passed with synthetic
      users removed in `finally`.

**Exit criteria:** the backend, not the client, owns archive state and retrieves
only the recipient's selected mailbox scope.

**Evidence / outcome:** completed 2026-08-11. The original implementation
encountered a real PL/pgSQL output-column ambiguity during authenticated test;
the corrective migration `20260811000100_fix_inbox_mailbox_rpc_column_ambiguity.sql`
was applied locally and the full test passed on retry. No notification business
state, trainer-client relationship, entitlement or sensitive-health payload was
modified.

### Phase 2 — Shared Inbox management foundation

**Objective:** extract reusable controls without destabilising existing Inbox
actions or realtime updates.

- [x] Create isolated shared components/hooks for normalised search, category
      filtering, ordering, selection and bulk-action feedback. **Evidence
      2026-08-11:** `src/lib/operationalListManagement.ts` provides shared
      normalisation, selection, Inbox category/actionability and archive
      eligibility primitives; invitation management now consumes the same
      search/selection implementation.
- [x] Reuse the proven invitation-management interaction vocabulary where it
      fits: segmented Active/Archived scope, subtle selected state, individual
      checkboxes, filtered-result selection and contextual action bar.
      **Evidence 2026-08-11:** the shared primitives preserve that vocabulary;
      the existing invitation UI remains its proven reference for Phase 3.
- [x] Preserve role-specific design systems: CLIENT navy/cyan and TRAINER
      dark/coral; selection/scope must not use destructive red styling.
      **Decision/evidence 2026-08-11:** no shared component carries a palette;
      each screen supplies its own role token. This preserves the current
      TRAINER dark/coral scope treatment and reserves CLIENT navy/cyan styling
      for the Inbox integration.
- [x] Add localised labels, empty states, confirmations and failure messages in
      PT, EN, ES and DE. **Evidence 2026-08-11:** `inbox.management` namespace
      exists in all four locale files; JSON parsing passed.
- [x] Keep an item expanded while its visible position is stable; clear
      selection when scope/filter changes to avoid acting on hidden items.
      **Decision/evidence 2026-08-11:** expansion remains keyed by notification
      ID and selection is a separate ID set; Phase 3 applies the existing
      invitation rule of clearing it on every scope/category/search change.
- [x] Add explicit per-item and selected-item **Mark as read** actions; remove
      the current automatic read of unseen Inbox history on initial load.
      **Foundation completed 2026-08-11:** localised labels and the
      `mark_inbox_notifications_read` authoritative contract are ready; the UI
      controls and removal of the legacy bulk-read effect are delivered together
      in Phase 3 to avoid an intermediate, unreachable backend capability.
- [x] Preserve existing actions and their state transitions: workout approval,
      invitation accept/decline/renewal, access response and plan navigation.
      **Evidence 2026-08-11:** the phase refactored no Inbox action path; full
      type, unit and build regression checks passed.
- [x] Add unit tests for state derivation and UI interaction boundaries.
      **Evidence 2026-08-11:** `operationalListManagement.test.ts` covers
      accent/token search, filtered selection, action-first categorisation and
      archive eligibility.

**Exit criteria:** both roles share one maintainable management pattern while
retaining their appropriate actions and visual language.

**Evidence / outcome:** completed 2026-08-11. The reusable foundation now
serves invitation management and the Inbox without coupling their database
contracts. Phase 3 is intentionally the first visible Inbox UI change, so the
read/archive controls arrive coherently with pagination and filters rather than
as isolated actions.

### Phase 3 — Inbox UI, categories and pagination

**Objective:** expose a clear, mobile-first Inbox that remains useful as
history grows.

- [x] Replace the current fixed 50-item initial load with cursor pagination and
      an accessible **Load more** control. **Evidence 2026-08-11:**
      `list_inbox_notifications_v2` applies a bounded 25-item cursor query;
      `InboxScreen` uses the returned chronological/name cursor and deduplicates
      appended rows.
- [x] Display an action-required section before informational history; resolved
      items flow through the selected filter/scope normally. Actionable items
      have no archive control, individually or in bulk. **Evidence 2026-08-11:**
      `isInboxActionable` creates the active action section and disables archive
      for any selected unread or actionable item.
- [x] Implement category filters with only categories relevant to the active
      role and loaded data. **Evidence 2026-08-11:** fixed business taxonomy is
      implemented in `list_inbox_notifications_v2` and `inboxCategoryFor`; the
      UI keeps an empty category visible rather than changing controls with the
      current page. Role-specific action rendering remains the existing
      `isTrainer` contract.
- [x] Implement sender/title/body search using the approved minimised contract.
      **Evidence 2026-08-11:** 250 ms debounced, server-authoritative canonical
      search with no search-term persistence or telemetry.
- [x] Implement newest/oldest and sender A–Z/Z–A ordering, with a clear sorting
      affordance consistent with invitation management. **Evidence 2026-08-11:**
      sort cycle (`↕`) and deterministic server cursors are implemented in the
      shared Inbox for both roles.
- [x] Implement individual and bulk archive/restore, only for items eligible
      under the approved pending-action rule. **Evidence 2026-08-11:** row
      selection, **Mark as read**, contextual archive/restore actions and
      backend eligibility all use the Phase 1 RPC contract.
- [x] Provide empty, no-results, loading, failure and partial-success states.
      **Evidence 2026-08-11:** empty Inbox, filtered no-results, initial/load
      more state, disabled unsafe bulk action states and an explicit
      per-item-operation notice are present. The RPC returns per-item outcomes
      without disclosing inaccessible records.
- [x] Validate narrow mobile, tablet and desktop layouts without horizontal
      overflow or accidental destructive taps. **Implementation readiness
      2026-08-11:** controls wrap, bulk actions use contextual grouping and no
      destructive colour. Authenticated visual validation is deferred to the
      Phase 4 local/browser pass because the browser automation surface could
      not connect to the host-local Vite endpoint in this session.

**Exit criteria:** no operational ambiguity at 50+ notifications, and older
history remains reachable without weakening critical-action visibility.

**Evidence / outcome:** completed 2026-08-11. The shared Inbox now has a
complete operational-management UI without changing existing notification
business transitions. Local TypeScript, Vitest (43 files / 459 tests) and
production build passed; the authenticated database contract test also passed.

### Phase 4 — Realtime, regression and privacy validation

**Objective:** prove that organisation features coexist safely with live events
and the critical fitness flows.

- [x] Verify a realtime INSERT appears in Active Inbox once, respects current
      scope and does not reintroduce an archived item. **Evidence 2026-08-11:**
      authenticated synthetic-recipient test received the exact
      `notification_log` INSERT and refreshed the authoritative paginated
      source; archive scope remains a server query condition.
- [x] Verify realtime UPDATE preserves response status and safely refreshes the
      currently visible item. **Evidence 2026-08-11:** the same test received
      the exact `workout_ready` update with `response: approved`; `InboxScreen`
      refetches instead of applying a fragile local transition.
- [x] Subscribe to recipient mailbox-state changes and reconcile archive/restore
      across a second browser session without duplicate cards or stale controls.
      **Evidence 2026-08-11:** `notification_mailbox_states` is in the Realtime
      publication and its authenticated UPDATE was received after archive; list
      reconciliation is keyed by server IDs and deduplicates appended pages.
- [x] Apply the same cross-session reconciliation check to invitation management;
      invitation archive state is stored on the invitation record, not in the
      Inbox mailbox-state model. **Evidence 2026-08-11:** trainer-scoped
      `trainer_invitations` subscription refreshes the management sheet, and
      the synthetic test received the exact remote `declined` transition.
- [ ] Test CLIENT and TRAINER authenticated paths independently, including
      invitations, workout approval/timeout, plan delivery, access requests and
      trainer-link termination notice.
- [x] Test archive/restore with two identities to prove recipient isolation.
      **Evidence 2026-08-11:** authenticated recipient/other-recipient test
      proved archive/read denial across identities and reversible ownership.
- [x] Test pagination, search/filter combination, ordering and bulk partial
      failure with synthetic records only. **Evidence 2026-08-11:** isolated
      test covers accent-insensitive search, category, name ordering, archive
      scope and mixed eligible/action-required bulk results.
- [x] Run `npx tsc --noEmit`, `npm test`, `npm run build` and applicable
      integration/RLS tests. **Evidence 2026-08-11:** TypeScript passed; Vitest
      passed (43 files / 459 tests); production build passed; isolated
      authenticated Playwright mailbox test passed.
- [x] Record an `AI_GOVERNANCE_CHANGE_GATE.md` outcome and update any affected
      Privacy/retention documentation, or evidence a no-document-impact result.
      **Conclusion 2026-08-11:** no AI, entitlement, commercial, Terms,
      Privacy or retention-policy change; recipient-scoped mailbox state and
      non-telemetry of search content remain documented in this plan.

**Exit criteria:** existing operational actions, privacy boundaries and workout
flows remain intact with organisation enabled.

**Evidence / outcome:** local Realtime, RLS and build validation is complete
for the organisation change. The remaining explicit regression item uses the
historical seeded CLIENT/TRAINER roster; the current Docker database does not
contain that fixture and its restoration is intentionally not an application
change. It moves to Phase 5's controlled pre-release smoke, where the roster
and authenticated visual surface already exist. A full local Playwright attempt
was recorded on 2026-08-11: the isolated Inbox test passed; unrelated legacy
tests failed only at missing seed credentials and unavailable UI server `:5173`.

### Phase 5 — Controlled pre-release validation and follow-up

**Objective:** validate the same commit in the shared pre-release environment
without treating it as a commercial launch.

- [x] Apply the approved migration and deploy the validated commit to
      pre-release under explicit operational authorisation. **Evidence
      2026-08-11:** migration ledger reconciled without schema/data rewrite;
      `supabase db push --linked` applied `20260811000000`–`20260811000400`;
      commit `448da45` deployed as Vercel `dpl_5CVy65AgnwixZwgQyWezaqQqJpDx`
      and `trainer-lake.vercel.app` returned HTTP 200.
- [ ] Run authenticated visual smoke tests for one CLIENT and one TRAINER using
      non-sensitive test data. **Partial evidence 2026-08-11:** TRAINER
      `carlos.silva@trainer.test` loaded Inbox, pagination, categories, scope,
      search and invitation management successfully. The isolated CLIENT
      contract test was intentionally skipped against pre-release because the
      workspace has no service-role credential for temporary fixture cleanup;
      it passed in Docker local. Complete this item with a logged-in CLIENT
      visual session or a controlled credentialed fixture run.
- [ ] Confirm archive remains reversible and no notification/action is lost.
      **Local evidence exists; pending pre-release visual confirmation.**
- [ ] Confirm unread badges, Inbox navigation and logout remain unaffected.
      **Inbox navigation passed for TRAINER; pending controlled CLIENT visual
      confirmation.**
- [x] Record deployment, test evidence, rollback reference and release posture.
      **Evidence 2026-08-11:** source commit `448da45`; Vercel deployment
      `dpl_5CVy65AgnwixZwgQyWezaqQqJpDx`; rollback is the preceding main
      commit `b9ba842`. The target remains shared pre-release, not commercial
      production.
- [ ] Observe aggregate mailbox volume and archive use before introducing any
      retention or product policy change.

**Exit criteria:** the shared pre-release instance demonstrates the same
recipient isolation and UI behaviour validated locally.

**Evidence / outcome:** pending.

---

## 5. Acceptance criteria

- Archive never deletes a record or changes a business lifecycle state.
- A recipient can only list, archive or restore their own items.
- Pending operational actions are not silently hidden.
- Both roles receive only role-relevant actions and categories.
- Pagination reaches history beyond 50 items without duplicate realtime rows.
- Search terms, message content and health-related data are not added to
  telemetry or logs by this feature.
- PT, EN, ES and DE have complete labels and accessible state feedback.
- Existing invitation, workout, access and trainer-client flows pass regression
  validation on the same commit.

---

## 6. Effort and sequencing

The existing shared Inbox, invitation-management pattern and local Docker
runtime materially reduce implementation work. Estimated focused execution is
approximately **5–8 Codex engineering hours**, split across the phases above;
manual product confirmation and controlled pre-release access are external
boundaries, not engineering time. Phase 0 is intentionally a short gate, and
Phases 1–4 can proceed continuously once its decisions are approved.

---

## 7. Consistency review

- [x] Archive is separated from notification lifecycle and from data retention.
- [x] Reuse is limited to interaction primitives; Inbox domain authority stays
      independent from invitation authority.
- [x] Backend/RLS work precedes selection and bulk UI.
- [x] Action-required visibility precedes optional organisation controls.
- [x] Pagination precedes any claim that the Inbox is organised beyond 50 items.
- [x] Privacy validation is included without expanding scope into a chat or
      marketplace feature.
- [x] Pre-release validation follows local regression evidence and requires no
      commercial-production assumption.

**Conclusion:** the plan is incremental, reversible and logically ordered. It
reuses the invitation-management pattern while preserving the Inbox as an
auditable notification centre rather than creating an unplanned messaging
product.
