# Status Audit — TrAIner Project

**Date:** 2026-06-06  
**Scope:** All status enums across database CHECK constraints, TypeScript types, and code write paths.

---

## 1. `workout_plans` — Plan Status

| SQL CHECK | TypeScript | Match? |
|---|---|---|
| `draft`, `pending_review`, `approved`, `sent`, `active`, `completed`, `cancelled`, `postponed` | `'sent' \| 'active' \| 'completed'` | ❌ **MISMATCH — TS missing 5 values** |

| Value | Written? | Where |
|---|---|---|
| `draft` | ❌ Dead | — |
| `pending_review` | ❌ Dead | — |
| `approved` | ❌ Dead | — |
| `sent` | ✅ | `WorkoutPlanEditorScreen.tsx:211` |
| `active` | ✅ | `StartWorkoutScreen.tsx:122,443` |
| `completed` | ✅ | `useWorkoutData.ts:144` |
| `cancelled` | ✅ | `StartWorkoutScreen.tsx:466`, `autoExpirePlans.ts:36` |
| `postponed` | ✅ | `StartWorkoutScreen.tsx:459` |

**Risk:** TypeScript type is dangerously incomplete. `cancelled` and `postponed` are written by code but not declared in the type.

---

## 2. `workout_sessions` — Session Status

| SQL CHECK | TypeScript | Match? |
|---|---|---|
| `active`, `paused`, `completed`, `abandoned` | `'active' \| 'paused' \| 'completed' \| 'abandoned'` | ✅ |

| Value | Written? | Where |
|---|---|---|
| `active` | ✅ | `useWorkoutData.ts:34` |
| `completed` | ✅ | `useWorkoutData.ts:136` |
| `abandoned` | ✅ | `useWorkoutData.ts:24`, `App.tsx:83` |
| `paused` | ❌ **Dead** | Never written — no pause UI exists |

---

## 3. `workout_session_exercises` — Exercise Status

| SQL CHECK | TypeScript | Match? |
|---|---|---|
| `pending`, `in_progress`, `completed`, `skipped`, `substituted` | `'pending' \| 'in_progress' \| 'completed' \| 'skipped' \| 'substituted'` | ✅ |

| Value | Written? | Where |
|---|---|---|
| `pending` | ✅ | `useWorkoutData.ts:57` |
| `in_progress` | ✅ | `WorkoutModeScreen.tsx:169` |
| `completed` | ✅ | `WorkoutModeScreen.tsx:197` |
| `skipped` | ✅ | `WorkoutModeScreen.tsx:225` |
| `substituted` | ❌ **Dead** | Never written — no substitution UI exists |

---

## 4. `plan_exercises` — Completed Boolean

| Field | Written? |
|---|---|
| `completed` (boolean) | ❌ **Dead** — never written by any code. Execution tracking uses `workout_session_exercises.status`. |

---

## 5. `trainer_alerts` — Alert Status

| SQL CHECK | TypeScript | Match? |
|---|---|---|
| ❌ **No CHECK constraint** | `'open' \| 'acknowledged' \| 'resolved'` | ❌ **GAP — DB not enforced** |

| Value | Written? | Where |
|---|---|---|
| `open` | ✅ | `events.ts:62` |
| `acknowledged` | ✅ | `useAlerts.ts:67` |
| `resolved` | ✅ | `useAlerts.ts:77` |

---

## 6. `operational_tasks` — Task Status

| SQL CHECK | TypeScript | Match? |
|---|---|---|
| ❌ **No CHECK constraint** | `'pending' \| 'in_progress' \| 'completed' \| 'cancelled'` | ❌ **GAP — DB not enforced** |

| Value | Written? | Where |
|---|---|---|
| `pending` | ✅ | `events.ts:83` |
| `completed` | ✅ | `useAlerts.ts:86` |
| `in_progress` | ❌ Dead | Never written |
| `cancelled` | ❌ Dead | Never written |

---

## 7. Check-in Statuses

| Column | SQL CHECK | TypeScript | Match? | All written? |
|---|---|---|---|---|
| `variant` | `voice`, `quick`, `detailed`, `post_workout` | ✅ Same | ✅ | ✅ |
| `input_source` | `voice`, `form` | ✅ Same | ✅ | ✅ |
| `sleep_quality` | `poor`, `regular`, `good`, `excellent` | ✅ Same | ✅ | ✅ |
| `safety_gate_events.status` | `clear`, `caution`, `blocked` | ✅ Same | ✅ | ✅ |

---

## 8. `exercises` (library) — Exercise Status

| SQL CHECK | TypeScript |
|---|---|
| ❌ **Unknown** — no CREATE TABLE SQL exists in repository | `'draft' \| 'active' \| 'restricted' \| 'blocked'` (4 values) |

**All 4 values written by code.** Cleaned of 5 dead values (`pending_review`, `studio_only`, `ai_allowed`, `ai_restricted`, `archived`) on 2026-06-06.

---

## Summary

| Table | DB ↔ TS Match | Dead Values | Missing DB Enforcement |
|---|---|---|---|
| `workout_plans` | ❌ | 3 | — |
| `workout_sessions` | ✅ | 1 (`paused`) | — |
| `session_exercises` | ✅ | 1 (`substituted`) | — |
| `plan_exercises` | N/A | 1 (`completed`) | — |
| `trainer_alerts` | ❌ (no CHECK) | 0 | All 3 |
| `operational_tasks` | ❌ (no CHECK) | 2 | All 4 |
| Check-in (4 columns) | ✅ | 0 | — |
| `exercises` library | Unknown | 5 | Unknown |

**Total dead values:** 13 across 5 tables.  
**Total CHECK gaps:** 2 tables (`trainer_alerts`, `operational_tasks`).  
**Total type mismatches:** 1 (`workout_plans` — TS missing 5 values that SQL allows).

---

## Consolidated Status Reference

| Group | Status | Transition | Trigger |
|---|---|---|---|
| **Plan** | `sent` | → `active` | Trainer envia → cliente inicia o plano |
| | | → `cancelled` | Auto-expiry (> N dias sem ação) ou cliente cancela manualmente |
| | | → `postponed` | Trainer adia para outra data |
| | `active` | → `completed` | Cliente finaliza todas as sessões do plano |
| | `postponed` | → `active` | Cliente reativa plano adiado |
| | `cancelled` | — | Estado terminal |
| | `completed` | — | Estado terminal |
| **Session** | `active` | → `completed` | Cliente executa todos os exercícios e clica "Finalizar" |
| | | → `abandoned` | Nova sessão inicia (abandona a anterior) OU > 24h sem conclusão |
| | `completed` | — | Estado terminal |
| | `abandoned` | — | Estado terminal |
| **Exercise** | `pending` | → `in_progress` | Cliente abre o formulário de sets para este exercício |
| | | → `skipped` | Cliente pula o exercício (motivo registrado) |
| | `in_progress` | → `completed` | Todos os sets são registrados |
| | `completed` | — | Estado terminal |
| | `skipped` | — | Estado terminal |
| **Alert** | `open` | → `acknowledged` | Trainer reconhece o alerta |
| | `acknowledged` | → `resolved` | Trainer resolve o alerta |
| | `resolved` | — | Estado terminal |
| **Task** | `pending` | → `completed` | Trainer marca tarefa como concluída |
| | `completed` | — | Estado terminal |
