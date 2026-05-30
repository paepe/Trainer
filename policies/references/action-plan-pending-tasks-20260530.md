# Action Plan — Pending Tasks (2026-05-30)

**Date:** 30/05/2026  
**Author:** paepe  
**Status:** Phase 1-2 complete — Phase 3 pending

---

## Task Inventory

| # | Task | Type | Priority | Status |
|---|------|------|----------|--------|
| 1 | Apply SQL policies to Supabase production | Infrastructure | 🔴 Critical | ✅ Done (`66e77cb`) |
| 2 | Clean up wizard step LSP warnings (`onSaveLater` props) | Code quality | 🟡 Low | ✅ Done (confirmed: `tsc` clean, IDE cache only) |
| 3 | Real-time dashboard for trainer (session status feed) | Feature | 🟠 Medium | ✅ Done (`66e77cb`) |
| 4 | Push notification infrastructure | Feature | 🔴 Later | ⬜ Pending |
| 5 | Wire `cycle_tracking` toggle to CycleScreen + female-only guard | Code quality | 🟡 Low | ✅ Done (`a65c64b`) |

---

## 1. Apply SQL Policies to Supabase Production

### Context
File `supabase-add-trainer-write-policies.sql` was incrementally updated with 6 RLS policies. Policy #6 (trainer INSERT on `checkin_prontidao`) was added in commit `6ff76a2` but needs to be re-applied to the production database since incremental changes don't auto-migrate.

### What needs to run
Copy the entire contents of `supabase-add-trainer-write-policies.sql` into the Supabase SQL Editor at `https://supabase.com/dashboard/project/xbfszzdyskwdctlqzztl/sql` and execute.

### Policies included
1. `trainer manages client sessions` — FOR ALL on `workout_sessions`
2. `trainer manages client session exercises` — FOR ALL on `workout_session_exercises`
3. `trainer manages client set logs` — FOR ALL on `workout_set_logs`
4. `trainer manages client pain events` — FOR ALL on `workout_pain_events`
5. `trainer manages client feedback` — FOR ALL on `post_workout_feedback`
6. `checkin_prontidao_trainer_insert` — FOR INSERT WITH CHECK on `checkin_prontidao`

### Acceptance criteria
- Trainer can start a live workout session for a client (RLS passes)
- Trainer can log sets, pain events, and feedback for client sessions
- Trainer can create check-in records for clients
- All policies are idempotent (`DROP POLICY IF EXISTS` then `CREATE POLICY`)

---

## 2. Clean Up Wizard Step LSP Warnings

### Context
When the `WizardFooter` component was simplified to remove the "Save for later" button (commit `90fdef0`), the `onSaveLater` prop was removed from the interface. A `sed` command cleaned single-line occurrences, but steps with multi-line WizardFooter calls still have the prop. This causes LSP warnings but does **not** break the TypeScript build.

### Affected files
| File | Problem |
|------|---------|
| `src/screens/auth/wizard/Step03Objectives.tsx` | `onSaveLater` prop on WizardFooter (multi-line) |
| `src/screens/auth/wizard/Step04MovementHistory.tsx` | Same — 2 occurrences (lines ~192, ~290) |
| `src/screens/auth/wizard/Step05DeclaredHealth.tsx` | Same (line ~134) |
| `src/screens/auth/wizard/Step06Comorbidities.tsx` | Same (line ~78) |
| `src/screens/auth/wizard/Step07FunctionalCapacity.tsx` | Same (line ~171) |

### Fix
Remove `onSaveLater={onSaveLater}` from WizardFooter props in each file. Also remove unused `handleSaveLater` functions and `onSaveLater` destructuring if no longer needed.

### Acceptance criteria
- `npx tsc --noEmit` passes with zero errors
- Zero LSP warnings for `WizardFooterProps` across all step files

---

## 3. Real-Time Dashboard for Trainer

### Context
Currently, the trainer has no visibility into real-time session status. When a client starts, pauses, or completes a workout, the trainer only sees updates by manually refreshing the Client Detail screen. There is no "who's working out now" feed on the dashboard.

### Proposed implementation
1. **TrainerDashboardScreen:** Add a "Active Clients" section showing clients with `workout_sessions.status = 'active'`
2. **Realtime subscription:** Subscribe to `workout_sessions` changes for all active clients
3. **Status update flow:** When `WorkoutModeScreen` changes session status, the trainer's dashboard updates in real-time
4. **Visual indicators:** Color-coded dots (green = active, yellow = paused, red = abandoned)

### Technical approach
- Query `workout_sessions` with `status = 'active'` and `user_id IN (active client IDs)`
- Use `supabase.channel().on('postgres_changes', { event: 'UPDATE', table: 'workout_sessions' })` 
- Filter client-side for subscribed client IDs

### Acceptance criteria
- Trainer sees active client sessions appear/disappear in real-time without refresh
- Session status changes (active → paused → completed) are visible immediately
- Performance impact is minimal (single subscription, filtered updates)

---

## 4. Push Notification Infrastructure

### Context
The Settings screen has a "Push notifications" toggle under the Notifications section, but no push notification infrastructure exists behind it. The value is stored in `preferences.notifications` but never triggers any push delivery.

### Scope
This is a large feature requiring:
1. **Native push setup**: Firebase Cloud Messaging (FCM) or Expo Notifications
2. **Backend service**: Edge function or serverless worker to send notifications
3. **Triggers**: Database triggers on plan delivery (`workout_plans.status = 'sent'`), session completion, safety gate activation
4. **Delivery flow**: `trainer_alerts` → push to device token

### Recommended approach
- Use Expo Notifications (if migrating to Expo) or FCM directly via service worker
- Add `device_tokens` table to store per-user push tokens
- Edge function that monitors `trainer_alerts` insert and dispatches push
- Gradual rollout: start with plan delivery notifications only

### Acceptance criteria (Phase 1)
- Client receives push notification when trainer sends a plan
- Trainer receives push when client completes a workout
- Notification tap opens the app to the relevant screen

---

## 5. Deprecate `preferences.cycle_tracking`

### Context
The `preferences.cycle_tracking` boolean is stored in the database and loaded into `AppPreferences.cycle` (used to gate settings UI), but it is **never checked** by `CycleScreen`. The cycle screen always renders regardless of this toggle. This is dead code from an older version.

### Fix
1. Verify removing the `cycle_tracking` column doesn't break existing profiles (it shouldn't since it's optional)
2. Remove `cycle_tracking` from `preferences` insert/select in `useProfileData.ts`
3. Clean up `preferences.cycle` from `App.tsx`, `SettingsScreen`, and `AppPreferences` type
4. If keeping the settings toggle for UX, wire it to `profile_v2.body_rhythm.enabled` instead

### Acceptance criteria
- No references to `cycle_tracking` remain in codebase
- Settings screen still shows cycle toggle (backed by `body_rhythm.enabled`)
- `CycleScreen` respects the toggle (hides when disabled)

---

## Execution Order (Recommended)

```
Phase 1 (today)
  ├── #1  Apply SQL policies (5 min — unblocks trainer write operations)
  └── #2  Clean up LSP warnings (10 min — code quality)

Phase 2 (next sprint)
  └── #3  Real-time dashboard (2–3h — high user value)

Phase 3 (planning)
  ├── #4  Push notifications (major feature — needs design review first)
  └── #5  Dead code cleanup (15 min — low priority)
```

---

## Risk Assessment

| Task | Risk |
|------|------|
| #1 SQL policies | **Low** — idempotent DROP/CREATE, can rollback |
| #2 LSP warnings | **None** — cosmetic only, doesn't affect runtime |
| #3 Real-time dashboard | **Low** — existing subscription pattern in `usePermission.ts` |
| #4 Push notifications | **Medium** — requires native platform changes, service worker, and edge function |
| #5 Dead code | **None** — removing unused toggle |

---

*Awaiting stakeholder approval to proceed with Phase 1.*
