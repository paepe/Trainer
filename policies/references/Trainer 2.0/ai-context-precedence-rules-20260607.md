# AI Workout-Generation Context — Data Precedence Rules

**Date:** 2026-06-07
**Scope:** How data from the Smart Student Profile, Check-In, and Readiness is combined when assembling the prompt sent to the AI for workout generation.

---

## Summary

The AI workout pipeline draws on three layers of student data:

1. **Smart Student Profile** — stable, declared-once data: goals, fitness level, declared health conditions/comorbidities, environment, equipment, and stated preferences (intensity, focus, support style).
2. **Check-In / Readiness** — real-time, session-specific data: today's energy, sleep, fatigue, pain, safety-gate status, available time, and equipment for *this* session.
3. **Trainer Context (Coach DNA)** — the trainer's archetype, methods, favorite/avoid exercises, and coaching style.

These layers are assembled independently (`src/ai/buildAIContext.ts`) and rendered as separate sections of the prompt (`src/ai/buildPrompt.ts`). For most fields there is **no conflict** — profile data describes "who the client generally is," check-in data describes "how they are right now," and both are simply presented to the AI side by side, with the system prompt instructing it to weigh readiness signals when setting today's intensity.

A conflict only arises for a small number of **structural constraints** — fields that don't just inform the AI's judgment but directly shape *what the AI is allowed to include in the plan* (equipment available, body regions to avoid). For those, an explicit precedence rule is required so the two sources combine predictably rather than one silently overwriting the other. The rule applied is:

> **Profile data is the baseline ("what is generally true"); check-in/readiness data is the session-specific layer that adds to or overrides the baseline for today only.**

This mirrors your original framing: declared preferences explain the durable picture, while check-in/readiness captures "real feelings at the moment" — and for anything safety- or capability-related, *both* must be honoured, not just the most recent one.

---

## Precedence Table

| Parameter | Source(s) | Resolution rule | Rationale |
|---|---|---|---|
| **Equipment available** | Profile (`environment.equipment`) + Check-in (`equipment_today`) | **Union** — profile equipment is the baseline; today's check-in equipment adds to it (e.g. travelling with a resistance band). Neither replaces the other. | A client who declared a home gym shouldn't lose that context just because they didn't re-list it in a quick check-in; conversely, a hotel-gym addition for one session shouldn't be lost either. |
| **Excluded body regions (pain/injury)** | Check-in only (`pain.region`, `soreness`) | **Check-in wins exclusively** — this is real-time state the profile cannot know in advance. | Today's reported soreness is the most accurate, current signal for what to avoid *today*; a static profile field would go stale. |
| **Chronic conditions / comorbidities / declared health** | Profile only (`comorbidities`, `declared_health`, `sensitive_factors`) | **Surfaced as informational context**, not a hard structural filter — included in the `## CLIENT PROFILE` prompt section for the AI to weigh in exercise selection, intensity, and pacing decisions. | These describe durable risk factors that should *inform judgment* across every session, not just today's; they are not equivalent to "avoid this body part right now." |
| **Intensity** | Profile preference (`preferences.preferred_intensity`) + Readiness (`readinessScore`, `fatigueRisk`, `intensityCeiling`) | **Readiness modulates the stated preference for the current session** — the system prompt explicitly instructs the AI to "adapt intensity based on readinessScore, fatigueRisk, and intensityCeiling." The stated preference remains the frame; today's state adjusts within it. | A client who prefers high intensity shouldn't be pushed hard on a low-readiness day — but their general preference still shapes the plan's overall character. |
| **Training focus / goals** | Profile only (`preferences.focus`, `objectives.primary_goal`, `secondary_goals`) | **Profile is authoritative** — these are durable, declared-once choices that check-in does not attempt to override. | Goals don't change session to session; only execution within them does. |
| **Available time / location** | Check-in only (`available_minutes`, `training_location`) | **Check-in wins exclusively** — these are inherently session-specific. | A profile-level "preferred session duration" exists as a planning default, but today's actual available time/location always governs the generated session. |
| **Safety gate status** | Check-in / Readiness only (`safety_gate.status`, `triggered_signals`) | **Hard override — if "blocked," the AI refuses to generate a workout entirely**, regardless of any other data. | Safety signals detected *right now* must never be outranked by stable profile data; this is the one rule with zero ambiguity by design. |
| **Body-rhythm / cycle phase** | Profile (`body_rhythm.enabled`, cycle length, adaptation preference) + Check-in (`body_rhythm_active`, current phase) | **Combined** — profile supplies the stable cycle parameters and adaptation preferences; check-in confirms whether it's active *today* and which phase applies now. | The cycle's existence and the client's general adaptation preferences are stable; the specific phase on a given day is real-time. |
| **Trainer guidance (Coach DNA)** | Trainer profile only (`archetype`, `coachingStyles`, `methods`, `focus emphasis`, `intensityCurve`, `favoriteExercises`/`avoidExercises`, `communicationTone`) | **Authoritative for plan style and exercise selection whenever a trainer relationship exists** — the AI is instructed to match the trainer's archetype, coaching style, and tone, and to honour the trainer's avoid-list as a hard constraint alongside the client's injury/pain restrictions. **Not present for fully autonomous clients** (`trainer.id === 'ai-coach'`): in that case, the system substitutes a default AI coaching voice tuned only by the client's own settings (preferred intensity, focus sliders), and plan style is governed solely by the Profile + Readiness layers. | Coach DNA is the mechanism by which a human trainer's professional judgment — discipline mix, sequencing philosophy, exercises they trust or avoid for their client base — shapes *what kind* of training is offered, not just how it's delivered. Where no trainer is engaged, that governance role is intentionally absorbed by client-declared preferences, preserving a coherent "single voice" in either configuration. |

---

## Where this lives in code

| Concern | File |
|---|---|
| Maps Profile → `ClientContext`, Check-in → `TodayContext` | `src/ai/buildAIContext.ts` |
| Renders both contexts into prompt sections | `src/ai/buildPrompt.ts` |
| Applies the **equipment union** rule before generation | `src/screens/client/StartWorkoutScreen.tsx` (`buildLibraryContext` call site) |
| Vercel-side duplicate of prompt rendering (no context assembly) | `api/generate-smart-workout.ts` |

---

## Maintenance note

If a new field is added to either the Smart Student Profile or Check-in/Readiness that overlaps semantically with an existing field in the other source, ask:

1. **Is this a structural constraint** (changes what the AI can/cannot include — equipment, exclusions, time, safety)? → It needs an explicit rule in the table above; default to **union** for "what's available" fields and **check-in wins** for "what's true right now" fields.
2. **Is this informational context** (helps the AI judge tone, intensity, pacing, risk)? → No merge needed; both sources can coexist as separate prompt lines, and the system prompt's general instruction to weigh readiness against stated preferences is sufficient.

When in doubt, prefer **transparency over silent precedence** — surface both values in the prompt and let the rule (or the AI's judgment, for soft/informational fields) resolve it, rather than dropping one silently.
