# TrAIner — TypeScript Validation Record

**Date:** 2026-05-23  
**Scope:** New TypeScript app surface (`src/`, `api/`, `vite.config.ts`, deployed client/studio flows)  
**Objective:** Establish a validation plan, execute the first smoke pass, and expand the scenario matrix for subsequent use-case testing.

---

## 1. Validation plan

### Phase A — Environment gate

Validate whether the TypeScript runtime can boot with the local development configuration before testing feature flows.

### Phase B — Static integrity

Run:

- TypeScript compile validation
- production build validation

### Phase C — Runtime smoke

Validate the most critical entry points:

- client welcome/login shell
- studio login shell
- authentication baseline
- evidence capture via screenshots

### Phase D — Domain scenarios

Expand the test matrix across:

- client fitness flows
- cycle-aware flows
- trainer flows
- studio flows
- AI workout generation
- resilience / degraded-environment behavior

### Phase E — Record and govern

Persist findings, blockers, evidence, and next scenarios under `policies/references/`.

---

## 2. Executed checks

| Check | Result | Notes |
|---|---|---|
| `./node_modules/.bin/tsc --noEmit` | ✅ Pass | No TypeScript compile errors found in the migrated codebase. |
| `npm run build` | ✅ Pass | Production bundle generated successfully. |
| Local browser smoke (`npm run dev`) | ❌ Fail | App booted to a blank screen in dev mode. |
| Deployed client welcome screen | ✅ Pass | Welcome screen rendered correctly on mobile viewport. |
| Deployed client login with test account | ❌ Fail | Login showed `Database error querying schema`. |
| Deployed studio login shell | ✅ Pass | Studio sign-in screen rendered correctly on mobile viewport. |

---

## 3. Primary findings

### F1 — Local TypeScript dev runtime is blocked by missing Vite Supabase variables

**Severity:** Critical for local validation

**Observed behavior**

- `npm run dev` starts successfully.
- The browser renders a blank dark screen.
- Console error: `supabaseUrl is required`.

**Root cause**

`src/supabase.ts` depends on:

- `import.meta.env.VITE_SUPABASE_URL`
- `import.meta.env.VITE_SUPABASE_ANON_KEY`

The current `.env.local` available to dev mode does not define these keys, while `.env.production.local` does.

**Impact**

- Local end-to-end validation of the new TypeScript app is blocked before any auth or domain flow can be exercised.
- This is an environment-gate failure, not a compile-time failure.

### F2 — Provided client test credential failed on deployed login

**Severity:** High for use-case testing

**Account used**

- `beatriz.nunes@client.test`

**Observed behavior**

- Login form renders correctly.
- Submitting the documented test credential surfaces: `Database error querying schema`.

**Impact**

- The current shared test roster cannot be trusted as an executable smoke baseline until the schema/query issue is corrected.
- Auth/data validation is blocked independently of the local TypeScript environment issue.

### F3 — AI workout generation remains unverified in the local TypeScript runtime

**Severity:** Medium

**Reason**

`StartWorkoutScreen.tsx` calls:

- `http://localhost:3000/api/generate-workout` when running on localhost

This means the client app requires a companion API runtime for local AI flow testing, in addition to valid Vite Supabase variables.

**Impact**

- A local green `npm run dev` alone is insufficient to validate the core AI workout flow.
- AI scenarios should remain blocked until both prerequisites are satisfied:
  - valid `VITE_SUPABASE_*` values in dev mode
  - local `/api/generate-workout` availability

### F4 — The project currently lacks a formal automated test command

**Severity:** Medium

**Observed behavior**

`package.json` exposes only:

- `dev`
- `build`
- `preview`
- Capacitor sync/open commands

**Impact**

- Regression confidence currently depends on build checks plus manual/browser validation.
- The TypeScript migration would benefit from at least a smoke-level automated suite for auth shell, screen rendering, and critical hooks.

---

## 4. Evidence

Artifacts stored in:

- `policies/references/artifacts/20260523-typescript-validation/`

| Artifact | Meaning |
|---|---|
| `local-dev-blank.png` | Local TypeScript dev runtime rendering a blank screen |
| `deployed-welcome.png` | Deployed client welcome screen rendered correctly |
| `deployed-login-error.png` | Deployed client login showing `Database error querying schema` |
| `deployed-studio-login.png` | Deployed studio login shell rendered correctly |

---

## 5. Expanded scenario matrix

### 5.1 Environment and shell

| ID | Scenario | Account / setup | Expected outcome | Status |
|---|---|---|---|---|
| ENV-01 | Local dev boot with `.env.local` | Local app | Welcome screen renders without blank page | ❌ Failed |
| ENV-02 | Local dev boot with valid `VITE_SUPABASE_*` | Local app | Auth shell, client shell, and studio shell load correctly | ⏳ Pending |
| ENV-03 | Missing Supabase config | Local app | App shows explicit configuration error UI, not a blank screen | ⏳ Pending |
| ENV-04 | Local AI companion offline | Local app + workout screen | User receives actionable retry/error state | ⏳ Pending |

### 5.2 Authentication and onboarding

| ID | Scenario | Account / setup | Expected outcome | Status |
|---|---|---|---|---|
| AUTH-01 | Client login happy path | `beatriz.nunes@client.test` | Login succeeds and lands on client home/profile | ❌ Failed |
| AUTH-02 | Trainer login happy path | `carlos.silva@trainer.test` | Login succeeds and lands on trainer dashboard | ⏳ Pending |
| AUTH-03 | Studio sign-in shell render | `/studio` | Login form renders cleanly on mobile viewport | ✅ Passed |
| AUTH-04 | Invalid password handling | Any test account with wrong password | Clear inline error, no crash | ⏳ Pending |
| AUTH-05 | New client registration + onboarding | Fresh disposable account | Register, complete goal/level/time/body flow, persist state | ⏳ Pending |

### 5.3 Client training flows

| ID | Scenario | Account / setup | Expected outcome | Status |
|---|---|---|---|---|
| CLIENT-01 | High-energy advanced hypertrophy | `andre.lima@client.test` | Plan intensity scales up appropriately | ⏳ Pending |
| CLIENT-02 | Low-energy multiple restrictions | `bruno.correia@client.test` | Plan avoids lower-back and shoulder loading | ⏳ Pending |
| CLIENT-03 | Outdoor endurance workout | `gustavo.rocha@client.test` | Plan respects outdoor / no-equipment context | ⏳ Pending |
| CLIENT-04 | Home mobility workout | `marta.teixeira@client.test` | Plan uses low-complexity home-compatible movements | ⏳ Pending |
| CLIENT-05 | Profile edit persistence | Any client | Updated profile data persists and reloads correctly | ⏳ Pending |
| CLIENT-06 | History/stats render with existing data | Any client with seeded history | No crash, charts/list render coherently | ⏳ Pending |

### 5.4 Cycle-aware flows

| ID | Scenario | Account / setup | Expected outcome | Status |
|---|---|---|---|---|
| CYCLE-01 | Menstrual day 1 + knee restriction | `constanca.pereira@client.test` | Lower-intensity recommendation, knee-safe bias | ⏳ Pending |
| CYCLE-02 | Follicular phase uplift | `beatriz.nunes@client.test` | Moderate strength progression guidance | ⏳ Pending |
| CYCLE-03 | Ovulatory phase peak | `mariana.santos@client.test` | Higher-intensity recommendation allowed | ⏳ Pending |
| CYCLE-04 | Late luteal moderation | `raquel.silva@client.test` | Intensity is moderated near PMS window | ⏳ Pending |
| CYCLE-05 | Cycle config edit persistence | Female client | Day/length changes persist and reflect in UI guidance | ⏳ Pending |

### 5.5 Trainer flows

| ID | Scenario | Account / setup | Expected outcome | Status |
|---|---|---|---|---|
| TRAINER-01 | Trainer dashboard load | `carlos.silva@trainer.test` | Active/pending clients load without schema errors | ⏳ Pending |
| TRAINER-02 | Invite existing client | Trainer + existing client email | Pending relationship created once, no duplicates | ⏳ Pending |
| TRAINER-03 | Trainer client detail | Trainer with active clients | Client profile/detail screen opens without crash | ⏳ Pending |
| TRAINER-04 | Workout plan editor load | Trainer role | Editor opens and respects selected client context | ⏳ Pending |
| TRAINER-05 | Restriction-heavy trainer portfolio | `rita.carvalho@trainer.test` | Mixed-client list and detail views remain coherent | ⏳ Pending |

### 5.6 Studio flows

| ID | Scenario | Account / setup | Expected outcome | Status |
|---|---|---|---|---|
| STUDIO-01 | Studio login shell render | `/studio` | Clean mobile rendering, no broken layout | ✅ Passed |
| STUDIO-02 | Studio admin sign-in | Valid studio admin credentials | Dashboard loads with studio KPIs | ⏳ Pending |
| STUDIO-03 | Protocol list/detail | Studio session | Protocol views load and navigate correctly | ⏳ Pending |
| STUDIO-04 | Team/clients segmentation | Studio session | Team and client modules remain isolated and stable | ⏳ Pending |

### 5.7 AI and resilience

| ID | Scenario | Account / setup | Expected outcome | Status |
|---|---|---|---|---|
| AI-01 | Workout generation happy path | Logged-in client + local API | 4–6 exercise JSON-backed plan rendered | ⏳ Pending |
| AI-02 | AI response format deviation | Mock malformed response | UI shows safe error state, no crash | ⏳ Pending |
| AI-03 | API unavailable | Local API down | Retry path visible and app remains navigable | ⏳ Pending |
| AI-04 | Supabase unavailable after auth | Network fault / invalid config | User gets explicit error state, not a white screen | ⏳ Pending |
| AI-05 | Mobile render during loading state | Any slow plan-generation scenario | Spinner and loading copy remain legible and stable | ⏳ Pending |

---

## 6. Recommended next pass

1. Add valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the local development env path actually used by `vite dev`.
2. Re-run `ENV-01` and confirm the local TypeScript app reaches the welcome/login shell.
3. Repair the deployed/test-environment schema issue behind the failing test credential.
4. Enable the companion local API runtime for `/api/generate-workout`.
5. Execute the scenario groups in this order:
   - `AUTH-*`
   - `CLIENT-*`
   - `CYCLE-*`
   - `TRAINER-*`
   - `STUDIO-*`
   - `AI-*`

---

## 7. Current validation verdict

The TypeScript migration currently passes compile/build validation but does **not** yet pass minimum runtime readiness for local use-case testing. The immediate blockers are:

1. local dev configuration does not provide required `VITE_SUPABASE_*` values
2. deployed/test auth baseline currently fails with a schema-query error

Until those are corrected, deeper fitness, trainer, and AI scenario validation should be treated as **planned but blocked**, not as passed.
