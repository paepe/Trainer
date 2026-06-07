# Codebase Audit & Cleanup Plan — 2026-06-07

Scope: src/ (177 TS/TSX), api/ (Vercel functions), repo-root legacy artifacts, SQL migrations, lint/type-safety posture.

## Findings Summary

### A. Dead code
- Orphaned root-level legacy JSX (~4.5k LOC, not in Vite build per `vite.config.ts`):
  `app.jsx`, `app-v1.jsx`, `app-print.jsx`, `screens.jsx`, `screens-v1.jsx`, `android-frame.jsx`, `tweaks-panel.jsx`, `refactor.py`.
  Referenced only by offline prototype HTML (`TrAIner App*.html`, `studio.html` design handoffs).

### B. Duplicated / inconsistent patterns
- Three workout-generation surfaces still coexist: `api/generate-workout.ts` (legacy/fallback), `api/generate-smart-workout.ts` (current DeepSeek pipeline), `src/lib/workoutGeneration.ts` (dual-endpoint wrapper). Acknowledged in `policies/references/artifacts/workout-generation-centralization-20260523.md` — not yet finalized.
- No unified error-logging strategy: `useStudioData.ts` logs with `[useStudioData]` prefixes, `App.tsx` logs once, the rest of the codebase silently swallows Supabase `{ error }` results (~24 sites).

### C. Type-safety gaps
- 34 `as any` / `as unknown as` casts, concentrated in: `App.tsx:293,297,323,624` (Realtime payload casts, `push: any`), wizard steps (`undefined as unknown as PrimaryGoal` ×5), `InboxScreen.tsx`, `CheckInVoice.tsx`, `NotificationContext.tsx` (`t: any`).
- No `@ts-ignore`/`@ts-expect-error` found (clean).

### D. Structural inconsistencies
- 25 `supabase-*.sql` files at repo root, not under `supabase/migrations/` with timestamp convention.
- Context module naming drift in `src/contexts/index.ts` (mixed `*Provider` / `*Context` exports).
- ESLint config mismatch: `.eslintrc.js` present but ESLint version expects flat `eslint.config.js` — lint is effectively not running.

### E. Positive baseline
- Single, correctly centralized Supabase client (`src/supabase.ts`).
- TS conversion essentially complete (181 TS/TSX files; `CONVERSION-TO-TYPESCRIPT.md` phases done).
- No TODO/FIXME/HACK debt in `src/`.

---

## Phased Plan

### Phase 1 — Zero-risk cleanup (dead code removal)
- [ ] Confirm zero references to root-level legacy files via grep across `src/`, `api/`, `*.html`, `vite.config.ts`, `vercel.json`
- [ ] Delete `app.jsx`, `app-v1.jsx`, `app-print.jsx`, `screens.jsx`, `screens-v1.jsx`, `android-frame.jsx`, `tweaks-panel.jsx`, `refactor.py`
- [ ] If any are needed for design-handoff HTML, move them under `policies/references/Trainer 2.0/artifacts/legacy-prototypes/` instead of deleting
- [ ] Commit as standalone `chore: remove dead legacy JSX prototypes`

### Phase 2 — Tooling restoration
- [ ] Migrate `.eslintrc.js` → flat `eslint.config.js` (match installed ESLint major version)
- [ ] Run `npx eslint src --ext .ts,.tsx` and triage warning list
- [ ] Fix or suppress (with justification) all reported issues; no blanket `eslint-disable`
- [ ] Wire lint into existing CI/build step if not already present

### Phase 3 — Workout pipeline consolidation
- [ ] Decide canonical endpoint (per `workout-generation-centralization-20260523.md` direction — `generate-smart-workout.ts`)
- [ ] Mark `api/generate-workout.ts` as deprecated fallback with explicit comment + sunset criteria, or remove if `generate-smart-workout.ts` fully covers fallback cases
- [ ] Collapse `src/lib/workoutGeneration.ts` to a single contract (one `requestWorkoutPlan()` surface), update all call sites (`useAIContext.ts` and others)
- [ ] Add integration-level test/manual QA pass on workout generation (EN/PT/ES/DE) before removing fallback

### Phase 4 — Error-handling & observability standardization
- [ ] Introduce `src/lib/logger.ts` (leveled: error/warn/debug, environment-aware — silent in prod unless critical)
- [ ] Replace ad-hoc `console.error('[Module] ...')` calls with `logger.error('Module', ...)`
- [ ] Audit the ~24 silent `{ error }` Supabase result sites; ensure each either logs or surfaces user-facing feedback — no silent failures on health/workout data paths (Privacy & Stability pillars)

### Phase 5 — Type-safety hardening
- [ ] Replace Realtime payload `as any` casts in `App.tsx:293,297,323` with typed `RealtimePostgresChangesPayload<T>` generics
- [ ] Type `PushListener({ push })` and `NotificationContext`'s `t` properly (use `i18next.TFunction`)
- [ ] Replace `undefined as unknown as PrimaryGoal`-style wizard-step initializers with a typed factory/default-value pattern (e.g., `Partial<WizardState>` + explicit optional fields)
- [ ] Remove remaining `as unknown as` in `InboxScreen.tsx`, `CheckInVoice.tsx`

### Phase 6 — SQL migration hygiene
- [ ] Classify each of the 25 root `supabase-*.sql` files: active migration vs. historical reference
- [ ] Move active ones into `supabase/migrations/` with proper timestamp-prefixed naming (Supabase CLI convention)
- [ ] Archive historical/reference-only ones under `policies/references/Trainer 2.0/artifacts/sql-archive/`
- [ ] Update any scripts/docs pointing to old root paths

### Phase 7 — Naming & module consistency pass
- [ ] Normalize `src/contexts/index.ts` exports to a single convention (`*Context` for the context object, `*Provider` for the provider component — document the rule in `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md` if not already)
- [ ] Spot-check hooks/screens/components for convention drift introduced post-TS-conversion

---

## Sequencing Notes
- Phases 1–2 are independent and lowest-risk — execute first, in either order.
- Phase 3 (workout consolidation) should follow Phase 2 (lint clean baseline) to avoid masking new issues.
- Phases 4–5 can run in parallel once Phase 3 stabilizes the workout contract (avoids rework on `useAIContext.ts`).
- Phase 6–7 are housekeeping — schedule opportunistically, no functional risk.

Each phase: incremental, reversible commits; validate build (`npm run build`) and smoke-test affected screens before moving to the next phase — per Stability & Predictability pillar (`PROFILE.md`).
