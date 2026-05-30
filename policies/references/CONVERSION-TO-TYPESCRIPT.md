# TrAIner — Conversion to TypeScript Plan

**Status:** Planned  
**Scope:** Full codebase — `src/`, `api/`, `scripts/`  
**Drivers:** Type safety for Supabase queries, assertive error visibility, modular decomposition, CSS token centralisation

---

## Master Progress Tracker

| Phase | Description | Status |
|---|---|---|
| 1 | Infrastructure | ✅ Completed |
| 2 | Types + Hooks | ✅ Completed |
| 3 | Shared Components | ✅ Completed |
| 4 | Auth Screens | ✅ Completed |
| 5 | Client Screens | ✅ Completed |
| 6 | Trainer Screens | ✅ Completed |
| 7 | Studio App | ✅ Completed |
| 8 | Shell + API | ✅ Completed |
| 9 | Cleanup | ✅ Completed |


---

## 1. Baseline Audit

| File | Lines | Problems |
|---|---|---|
| `src/screens.jsx` | 3 464 | Monolith — all screens + atoms in one file, inline CSS helpers duplicated, no types |
| `src/studio/StudioApp.jsx` | 826 | Owns its own `C` colour object, disconnected from app design tokens |
| `src/App.jsx` | ~280 | Untyped props, implicit `any` on nav payload |
| `src/hooks/useAuth.js` | 63 | No return types, error swallowed silently |
| `src/hooks/useData.js` | 107 | No types on Supabase row shapes |
| `src/hooks/useStudioData.js` | 169 | Same |
| `src/supabase.js` | 6 | No generated database types |
| `src/theme.js` | 5 | Only 4 brand tokens — surface/text helpers live inside screens.jsx |
| `api/generate-workout.js` | 127 | Untyped request/response, no guard on env vars |
| `scripts/fix-test-auth.mjs` | 56 | Fine as-is; exclude from TS scope |

---

## 2. Target Module Structure

```
src/
├── types/
│   ├── index.ts          ← re-exports everything
│   ├── auth.ts           ← User, Profile, Session shapes
│   ├── workout.ts        ← Plan, Exercise, Session, CheckIn
│   ├── studio.ts         ← Studio, Member, Protocol
│   └── supabase.ts       ← Database<> generated types (supabase gen types)
│
├── theme/
│   ├── tokens.ts         ← BRAND palette + dark/light surface values
│   ├── helpers.ts        ← surfRaised, textPri, borderSubtle, iconBtn, ghostBtn…
│   └── index.ts          ← re-exports tokens + helpers
│
├── components/           ← Shared UI atoms (no business logic)
│   ├── Icon.tsx
│   ├── Avatar.tsx        ← AvatarImage + PhotoSlot
│   ├── TopBar.tsx
│   ├── BottomTabs.tsx
│   ├── SideMenu.tsx
│   ├── PillInput.tsx
│   └── index.ts
│
├── screens/
│   ├── auth/
│   │   ├── WelcomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── OnboardingScreen.tsx
│   ├── client/
│   │   ├── ProfileScreen.tsx
│   │   ├── EditProfileScreen.tsx
│   │   ├── CheckInScreen.tsx
│   │   ├── StartWorkoutScreen.tsx
│   │   ├── WorkoutInProgressScreen.tsx
│   │   ├── GoalAchievedScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── CycleScreen.tsx
│   ├── trainer/
│   │   ├── TrainerDashboardScreen.tsx
│   │   ├── TrainerClientDetailScreen.tsx
│   │   └── WorkoutPlanEditorScreen.tsx
│   ├── shared/
│   │   └── SettingsScreen.tsx
│   └── index.ts          ← barrel export (replaces screens.jsx)
│
├── studio/
│   ├── StudioApp.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── DashboardView.tsx
│   │   ├── TeamView.tsx
│   │   ├── ClientsView.tsx
│   │   └── ProtocolsView.tsx
│   └── main.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useData.ts
│   └── useStudioData.ts
│
├── supabase.ts
├── theme.ts              ← thin shim that re-exports from theme/
├── App.tsx
└── main.tsx

api/
└── generate-workout.ts   ← convert + add typed request/response guards
```

---

## 3. CSS Centralisation Strategy

**Current state:** inline `style={{}}` throughout. Surface/text helpers (`surfRaised`, `textPri`, `borderSubtle`, `iconBtn`, `ghostBtn`) are defined locally in `screens.jsx`. `StudioApp.jsx` has a private `C` object with hardcoded hex values.

**Target:** Single source of truth in `src/theme/`.

### 3.1 `src/theme/tokens.ts`
```ts
export const BRAND = {
  primary:     '#2DD4E0',
  primaryDeep: '#0F8C85',
  accent:      '#EF5B3C',
  primarySoft: '#9DECF3',
} as const;

export const DARK = {
  bg:       '#0E1A2B',
  surface:  '#142233',
  surface2: '#122034',
  border:   '#1F2E45',
  textPri:  '#FFFFFF',
  textSec:  'rgba(255,255,255,.65)',
  textMute: 'rgba(255,255,255,.45)',
} as const;

export const LIGHT = {
  bg:       '#FFFFFF',
  surface:  '#FFFFFF',
  surface2: '#F4F6FA',
  border:   '#E7ECF3',
  textPri:  '#102236',
  textSec:  '#5a6878',
  textMute: '#8a96a4',
} as const;
```

### 3.2 `src/theme/helpers.ts`
```ts
// All helper functions accept `dark: boolean` and return CSSProperties values
export const surfRaised   = (dark: boolean) => dark ? DARK.surface  : LIGHT.surface;
export const surfSunken   = (dark: boolean) => dark ? DARK.bg       : LIGHT.surface2;
export const borderSubtle = (dark: boolean) => dark ? DARK.border   : LIGHT.border;
export const textPri      = (dark: boolean) => dark ? DARK.textPri  : LIGHT.textPri;
export const textSec      = (dark: boolean) => dark ? DARK.textSec  : LIGHT.textSec;
export const textMute     = (dark: boolean) => dark ? DARK.textMute : LIGHT.textMute;
export const iconBtn      = (dark: boolean): React.CSSProperties => ({ ... });
export const ghostBtn     = (dark: boolean): React.CSSProperties => ({ ... });
```

### 3.3 Studio alignment
`StudioApp.jsx`'s `C` object is replaced by imports from `theme/tokens.ts`. The studio uses DARK palette exclusively — its colour values already match `DARK.*`.

---

## 4. Type Definitions (key shapes)

```ts
// types/auth.ts
export type UserRole = 'client' | 'trainer' | 'studio_admin' | 'studio_trainer';

export interface Profile {
  id:         string;
  name:       string;
  email:      string;
  phone:      string;
  dob:        string;
  location:   string;
  gender:     'male' | 'female' | 'non-binary' | 'prefer_not_to_say' | '';
  role:       UserRole;
  avatar_url: string | null;
  created_at: string;
}

// types/workout.ts
export interface CheckIn {
  energy:        number;
  soreness:      string[];
  minutes:       number;
  goal:          string;
  location:      'gym' | 'home' | 'outdoor';
  sleep_quality: 'poor' | 'fair' | 'good';
  equipment:     string[];
}

export interface Exercise {
  exercise_name: string;
  muscle_group:  MuscleGroup;
  sets:          number;
  reps:          number;
  load_kg:       number | null;
  rest_seconds:  number;
  notes?:        string;
}

// Shared nav function type — eliminates `any` payload
export type NavFn = (screen: string, payload?: Record<string, unknown>) => void;
```

---

## 5. Conversion Phases

### Phase 1 — Infrastructure (no behaviour change)

- [ ] Add `tsconfig.json` with strict mode
- [ ] Update `vite.config.js` → `vite.config.ts`
- [ ] Add `@types/react`, `@types/react-dom` to devDependencies
- [ ] Generate Supabase database types via `supabase gen types typescript`
- [ ] Create `src/theme/tokens.ts` and `src/theme/helpers.ts`
- [ ] Migrate `src/supabase.js` → `src/supabase.ts`
- [ ] Migrate `src/theme.js` → thin shim importing from `src/theme/`
- [ ] `vite build` passes with zero errors

### Phase 2 — Types + Hooks

- [ ] Create `src/types/auth.ts`
- [ ] Create `src/types/workout.ts`
- [ ] Create `src/types/studio.ts`
- [ ] Create `src/types/index.ts` (barrel)
- [ ] `src/hooks/useAuth.js` → `useAuth.ts` (typed return, typed AuthError, console.error on every non-null error)
- [ ] `src/hooks/useData.js` → `useData.ts` (typed Supabase row shapes)
- [ ] `src/hooks/useStudioData.js` → `useStudioData.ts` (typed row shapes)
- [ ] `vite build` passes with zero errors

### Phase 3 — Shared Components (decompose from screens.jsx)

- [ ] Extract `src/components/Icon.tsx`
- [ ] Extract `src/components/Avatar.tsx` (AvatarImage + PhotoSlot)
- [ ] Extract `src/components/TopBar.tsx`
- [ ] Extract `src/components/SideMenu.tsx`
- [ ] Extract `src/components/PillInput.tsx`
- [ ] Extract `src/components/BottomTabs.tsx` (from App.jsx)
- [ ] Create `src/components/index.ts` barrel export
- [ ] All CSS helpers imported from `src/theme/` — no local re-declarations
- [ ] `vite build` passes with zero errors

### Phase 4 — Auth Screens

- [ ] `WelcomeScreen.tsx` → `src/screens/auth/`
- [ ] `LoginScreen.tsx` → `src/screens/auth/`
- [ ] `RegisterScreen.tsx` → `src/screens/auth/`
- [ ] `OnboardingScreen.tsx` → `src/screens/auth/`
- [ ] All CSS helpers imported from `src/theme/` — no local re-declarations
- [ ] `vite build` passes with zero errors

### Phase 5 — Client Screens

- [ ] `ProfileScreen.tsx` → `src/screens/client/`
- [ ] `EditProfileScreen.tsx` → `src/screens/client/`
- [ ] `CheckInScreen.tsx` → `src/screens/client/`
- [ ] `StartWorkoutScreen.tsx` → `src/screens/client/`
- [ ] `WorkoutInProgressScreen.tsx` → `src/screens/client/`
- [ ] `GoalAchievedScreen.tsx` → `src/screens/client/`
- [ ] `StatsScreen.tsx` → `src/screens/client/`
- [ ] `HistoryScreen.tsx` → `src/screens/client/`
- [ ] `CycleScreen.tsx` → `src/screens/client/`
- [ ] All CSS helpers imported from `src/theme/` — no local re-declarations
- [ ] `vite build` passes with zero errors

### Phase 6 — Trainer Screens

- [ ] `TrainerDashboardScreen.tsx` → `src/screens/trainer/`
- [ ] `TrainerClientDetailScreen.tsx` → `src/screens/trainer/`
- [ ] `WorkoutPlanEditorScreen.tsx` → `src/screens/trainer/`
- [ ] All CSS helpers imported from `src/theme/` — no local re-declarations
- [ ] `vite build` passes with zero errors

### Phase 7 — Studio App

- [ ] `StudioApp.tsx` → `src/studio/`
- [ ] Extract `src/studio/components/Sidebar.tsx`
- [ ] Extract `src/studio/components/DashboardView.tsx`
- [ ] Extract `src/studio/components/TeamView.tsx`
- [ ] Extract `src/studio/components/ClientsView.tsx`
- [ ] Extract `src/studio/components/ProtocolsView.tsx` (ProtocolDetail inline)
- [ ] Move `useStudioData.ts` → `src/studio/hooks/useStudioData.ts`
- [ ] Replace `C` object with imports from `src/theme/tokens.ts` (DARK)
- [ ] `vite build` passes with zero errors

### Phase 8 — Shell + API

- [ ] `src/App.jsx` → `App.tsx` (NavFn, Profile, CheckIn fully typed)
- [ ] `src/main.jsx` → `main.tsx`
- [ ] `src/studio/main.jsx` → `studio/main.tsx`
- [ ] `api/generate-workout.js` → `generate-workout.ts` (typed body, typed response, env var guards)
- [ ] `vite build` passes with zero errors

### Phase 9 — Cleanup

- [ ] Delete `src/screens.jsx` (barrel `src/screens/index.ts` takes over)
- [ ] Delete `src/studio/StudioApp.jsx` (modular `src/studio/` takes over)
- [ ] Delete all remaining `.js` / `.jsx` source files under `src/` and `api/`
- [ ] Remove old `src/theme.js`
- [ ] Run `tsc --noEmit` — zero errors gate passes
- [ ] Run `vite build` — zero errors
- [ ] Deploy to Vercel — smoke test on preview URL before promoting to production

---

## 6. tsconfig.json Target

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "api"],
  "exclude": ["node_modules", "dist", "scripts"]
}
```

---

## 7. Auth Debug Value — Why This Matters

The current "Database error querying schema" failure on seeded test accounts has no visible error path — `signIn()` swallows the error silently beyond returning `{ error }`. Once `useAuth.ts` is typed with explicit `AuthError` handling and `console.error` on every non-null error, the exact GoTrue failure reason will surface in the browser DevTools console, ending the guesswork entirely.

---

## 8. Execution Rules

- Each phase is a **single commit** — build must pass (`vite build`) before merging
- No feature changes during conversion — only types, structure, and CSS centralisation
- `strict: true` enforced from Phase 1 — no `any` escape hatches
- Each screen migrated in isolation — old `screens.jsx` stays until Phase 9 deletes it
- CSS helpers imported from `src/theme/` exclusively — no local re-declarations

---

*Created: 2026-05-23 · Applies to: TrAIner v2 codebase*
