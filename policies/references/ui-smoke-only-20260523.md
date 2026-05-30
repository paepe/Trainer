# TrAIner — UI Smoke Only Pass

**Date:** 2026-05-23  
**Scope:** Local TypeScript UI shell only  
**Mode:** `ui-smoke`  
**Server:** `http://localhost:4173/`  

---

## 1. Purpose

Run the first UI-only validation pass for the TypeScript app before deeper auth, client, cycle, trainer, studio, and AI scenarios.

This pass validates rendering, navigation to core public screens, absence of current browser console errors, and absence of Vite/runtime overlays.

---

## 2. Environment handling

The production/development env files currently contain empty values for:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Vercel environment pull also returned those keys as empty. Direct Supabase API key enumeration was not used because it can expose broader credentials than required for a render-only smoke pass.

For this pass only, an ignored local file was created:

- `.env.ui-smoke.local`

It contains:

- the linked Supabase project URL
- a non-secret placeholder anon key

This is sufficient to validate public UI rendering because no auth submission, data persistence, or backend query flow is exercised in this pass.

---

## 3. Execution

Command used:

```bash
npm run dev -- --host localhost --port 4173 --mode ui-smoke --force
```

Browser viewport:

- `390 x 844`

Screens validated:

- Welcome
- Login
- Register
- Studio Login

---

## 4. Results

| ID | Screen | URL | Result | Current console errors | Runtime overlay |
|---|---|---|---|---|---|
| UI-01 | Welcome | `/` | Pass | 0 | No |
| UI-02 | Login | `/` SPA state | Pass | 0 | No |
| UI-03 | Register | `/` SPA state | Pass | 0 | No |
| UI-04 | Studio Login | `/studio` | Pass | 0 | No |

---

## 5. Evidence

Artifacts stored in:

- `policies/references/artifacts/20260523-ui-smoke-only/`

| Artifact | Meaning |
|---|---|
| `01-welcome.png` | Local Welcome screen |
| `02-login.png` | Local Login screen |
| `03-register.png` | Local Register screen |
| `04-studio-login.png` | Local Studio Login screen |

---

## 6. Observations

The UI shell now renders locally when the Supabase client receives non-empty frontend env values.

The original blocker is still real for normal development mode:

- the actual local/deployed env values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are empty
- auth-backed scenarios remain blocked until those values are populated with real project credentials

The smoke pass should therefore be treated as:

- passed for render-only UI validation
- not a pass for auth, data, role routing, workout generation, or persistence

---

## 7. Next gate

Before running `AUTH-*` scenarios, configure real frontend Supabase values in the active Vite environment and confirm:

1. client login succeeds with a roster account
2. trainer login reaches the trainer dashboard
3. `/studio` login can reach the studio dashboard
4. the `Database error querying schema` issue is resolved
