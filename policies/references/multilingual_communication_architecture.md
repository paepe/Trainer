# Multilingual Communication Architecture — TrAIner 2.0

**Status:** Approved | **Version:** 1.0  
**Author:** Senior System Analyst / Senior Software Architect  
**Date:** 2026-06-06  
**Reference:** `PROFILE.md`, `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md`, `project_i18n.md`

---

## 1. Problem Statement

### 1.1 Scenario

User A (Trainer, DE locale) sends a workout plan / notification / authorization to User B (Client, ES locale). Data is stored as concrete localized text at creation time. The recipient reads content in the sender's language.

| Flow | Sender locale | Stored as | Displayed to recipient |
|---|---|---|---|
| Trainer DE → Client ES | de | German text | **German** ❌ |
| Client ES → Trainer DE | es | Spanish text | **Spanish** ❌ |
| System → Trainer DE (alert from ES client) | es (via `events.ts`) | Spanish text | **Spanish** ❌ |

### 1.2 Constraints

1. **Analytics integrity** — Big Data / ML pipelines must query normalized text for pattern extraction (pain recurrence, adherence trends, injury prediction). Multi-language storage fragments the dataset.
2. **GDPR / health-data privacy** — External translation APIs (Google, DeepL) process clinical terms on third-party servers. Forbidden for sensitive categories.
3. **Latency** — On-the-fly translation at display time adds ~200-800ms per item.
4. **Existing i18n investment** — The system already has 4 fully translated locale files (en/pt/es/de) with 1700+ keys. This asset must be leveraged.

---

## 2. Architecture Decision

### 2.1 Canonical Language

**English (en-US)** is the storage language for all system-generated content. It serves as the *lingua franca* between locales.

### 2.2 Template Keys + Parameters

Notifications and system messages are stored as **semantic template keys** with **structured parameters**, not raw localized text.

```
STORED:     { template_key: "workout_approved", params: { trainerName: "Klaus" } }
NOT STORED: { title: "Klaus hat dein Training genehmigt!", body: "..." }
```

### 2.3 Render-on-Consume

Translation happens at **display time** on the recipient's device, using their active `i18n.language` preference. The `i18n.t(template_key, params)` function resolves the appropriate locale text from the device-side locale file.

### 2.4 Why This Works

| Principle | Mechanism |
|---|---|
| **Single source of truth** | Template keys are English-language identifiers (`workout_approved`, `high_pain_alert`) |
| **Receiver-side rendering** | `tr()` on the reader's device resolves to their locale |
| **No external API** | All translations exist locally in `en/pt/es/de.json` |
| **Analytics-ready** | `SELECT template_key, COUNT(*) GROUP BY 1` — language-agnostic |
| **Privacy-preserving** | No health data leaves the device → backend → device pipeline |

---

## 3. Data Flow

```
SENDER (DE)
  │
  ▼
notify(recipientId, {
  template: 'workout_approved',
  params:   { trainerName: 'Klaus' }
})
  │
  ▼
┌─────────────────────────────────────────────┐
│ notification_log                             │
│  template_key: 'workout_approved'            │
│  params:        {"trainerName": "Klaus"}     │
│  lang:          'en'  ← canonical storage    │
└─────────────────────────────────────────────┘
  │
  ▼  Realtime → RECIPIENT (ES)
  
tr('inbox.templates.workout_approved', { trainerName: 'Klaus' })
  │
  ▼
"¡Klaus aprobó tu entrenamiento!"
```

---

## 4. Implementation Plan

### Phase 1 — Template Key Infrastructure

| # | Task | Files | Effort |
|---|---|---|---|
| 1.1 | Extend `notification_log` schema: add `template_key TEXT`, `params JSONB` columns | SQL migration | 10 min |
| 1.2 | Extend `notify()` signature: accept `template` + `params` in addition to (or replacing) `title` + `body` string params | `src/lib/notify.ts` | 20 min |
| 1.3 | Add `templates` namespace to `en.json` with all notification templates in canonical English | `src/i18n/locales/en.json` | 30 min |
| 1.4 | Translate templates to pt/es/de | `pt/es/de.json` | 20 min |
| 1.5 | Update all `notify()` callers to use template keys + params | `InboxScreen.tsx`, `StartWorkoutScreen.tsx`, `CheckInProntidaoScreen.tsx`, `WorkoutPlanEditorScreen.tsx`, `lib/events.ts`, `lib/autoExpirePlans.ts`, `hooks/useWorkoutData.ts`, `hooks/useCheckinData.ts` | 1.5h |
| 1.6 | `tsc --noEmit` green gate | — | 5 min |

### Phase 2 — Render-on-Consume

| # | Task | Files | Effort |
|---|---|---|---|
| 2.1 | Extend `InboxItem` type: add `template_key?`, `params?` fields | `src/screens/shared/InboxScreen.tsx` | 5 min |
| 2.2 | InboxScreen render logic: if `item.template_key` exists → `tr('inbox.templates.' + key, params)`; else fallback to legacy `item.title` + `item.body` | `InboxScreen.tsx` | 30 min |
| 2.3 | Initial fetch + Realtime handlers: enrich items with template_key + params from DB | `InboxScreen.tsx` | 20 min |

### Phase 3 — Quality Assurance

| # | Task | Effort |
|---|---|---|
| 3.1 | Full audit: verify zero `notify()` calls pass raw text strings | 15 min |
| 3.2 | Template catalog: document all templates in `project_i18n.md` appendices | 15 min |
| 3.3 | `tsc --noEmit` + locale key sync check | 5 min |
| 3.4 | Manual QA: Trainer DE ↔ Client ES cross-language notification flow | 20 min |
| 3.5 | Regression check: legacy `title` + `body` fallback works for pre-migration `notification_log` rows | 10 min |

---

## 5. Template Catalog

### 5.1 System Notifications

| Template Key | Parameters | Trigger |
|---|---|---|
| `workout_approved` | `{ trainerName }` | Trainer approves workout request |
| `workout_rejected` | `{ trainerName }` | Trainer rejects workout request |
| `ready_to_train` | `{ name, score }` | Client completes readiness check-in |
| `new_plan` | `{ trainerName }` | Trainer sends workout plan |
| `plan_cancelled` | `{ name, planDate }` | Client cancels trainer plan |
| `plan_postponed` | `{ name, planDate }` | Client postpones trainer plan |
| `workout_completed` | `{ duration }` | Client finishes workout session |
| `safety_gate_blocked` | — | AI blocks session |
| `safety_gate_blocked_body` | — | Safety gate explanation |
| `low_readiness` | `{ score }` | Client score below threshold |
| `plans_expired` | `{ count, expiryDays }` | Auto-expire cleanup |
| `high_pain_alert` | `{ region, intensity }` | Pain reported during workout |
| `review_pain` | `{ region, intensity }` | Operational task for trainer |

### 5.2 Example — en.json

```json
{
  "inbox": {
    "templates": {
      "workout_approved": "{{trainerName}} approved your workout!",
      "workout_rejected": "{{trainerName}} returned your workout request.",
      "ready_to_train": "{{name}} is ready to train",
      "ready_to_train_body": "Readiness {{score}}/100 — approve or reject their workout request.",
      "new_plan": "New workout plan from {{trainerName}}",
      "new_plan_body": "{{trainerName}} sent you a workout plan.",
      "plan_cancelled": "{{name}} cancelled the workout plan from {{planDate}}.",
      "plan_postponed": "{{name}} postponed the workout plan from {{planDate}}.",
      "workout_completed": "Workout completed",
      "workout_completed_body": "Your client finished a {{duration}}min session.",
      "safety_gate_blocked": "Safety Gate blocked",
      "safety_gate_blocked_body": "A client check-in requires human review.",
      "low_readiness": "Low readiness alert",
      "low_readiness_body": "Client scored {{score}}/100. Review recommended.",
      "plans_expired": "Plans expired",
      "plans_expired_body": "{{count}} pending plan(s) were auto-cancelled after {{expiryDays}} days.",
      "high_pain_alert": "High pain reported — {{region}}",
      "high_pain_alert_body": "Intensity {{intensity}}/10 during workout session. Review and adjust plan.",
      "review_pain": "Review pain — {{region}}",
      "review_pain_body": "Client reported {{intensity}}/10 intensity in {{region}}."
    }
  }
}
```

---

## 6. Risk Assessment

| Risk | Probability | Mitigation |
|---|---|---|
| Legacy `notification_log` rows without `template_key` | High (pre-migration data) | Fallback: render `title` + `body` directly if `template_key` is null |
| Template key drift between `en.json` and callers | Medium | `tsc --noEmit` + type-safe `TemplateKey = 'workout_approved' \| ...` union type |
| Large `params` payloads bloating DB | Low | JSONB compression, limit params to primitive types only |

---

## 7. Checklist

- [x] Phase 1.1 — Schema migration (`template_key`, `params`) — `supabase/sql-archive/supabase-add-template-keys.sql` + `supabase/sql-archive/supabase-add-template-keys-events.sql`
- [x] Phase 1.2 — `notify()` signature extended
- [x] Phase 1.3 — `inbox.templates.*` in `en.json`
- [x] Phase 1.4 — Templates translated to pt/es/de
- [x] Phase 1.5 — All 8 `notify()` callers updated + `events.ts` migrated to canonical English + notify() pipeline
- [x] Phase 1.6 — `tsc --noEmit` passes
- [x] Phase 2.1 — `InboxItem` type extended
- [x] Phase 2.2 — Render-on-consume logic in InboxScreen
- [x] Phase 2.3 — Fetch + Realtime enrichment
- [x] Phase 3.1 — Zero raw-text `notify()` audit
- [x] Phase 3.2 — Template catalog (7 templates: `workout_approved`, `workout_rejected`, `ready_to_train`, `new_plan`, `high_pain_alert`, `review_pain`, `workout_completed`, `plans_expired`, `checkin_alert`)
- [x] Phase 3.3 — Build + locale sync verified
- [x] Phase 3.4 — Cross-language QA (DE ↔ ES) — 27 hardcoded strings fixed across CheckInVoice, CycleScreen, HistoryScreen, RefreshChip; 44 i18n keys added
- [x] Phase 3.5 — Legacy fallback regression test (InboxScreen:213-216 — `template_key` null → renders stored `title`/`body`)

---

**Governance:** This document is authoritative for the multilingual communication subsystem. Changes must follow the `EXECUTIVE_TECHNOLOGY_DIRECTIVE.md` change governance process. All code decisions must respect the pillars established in `PROFILE.md` — particularly *Information Security & Privacy* and *Stability & Predictability*.
