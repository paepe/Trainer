# TrAIner i18n Architecture

## Overview

The TrAIner app supports 4 languages: **English (en)**, **Português (pt)**, **Español (es)**, and **Deutsch (de)**. All are LTR.

## Stack

- **i18next** + **react-i18next** — runtime translation engine
- **Namespace**: single flat namespace per language (`en.json`, `pt.json`, `es.json`, `de.json`)
- **Key convention**: dot-notation domain keys (`trainer.detail.noClientSelected`, `coachDna.step01.hint`)

## File structure

```
src/i18n/
  index.ts          — i18next init, detectDeviceLanguage(), BCP47 map, exports
  locales/
    en.json         — canonical source (1370+ keys)
    pt.json         — Portuguese (Brazil)
    es.json         — Spanish
    de.json         — German
```

## Adding a new translation key

1. **Add the key to `en.json`** first — this is the canonical source.
2. **Add matching keys to `pt.json`, `es.json`, `de.json`** with translated values.
3. Keys follow the pattern: `domain.subdomain.value`. Use objects for enum lookups, arrays for ordered lists.

Example:
```json
{
  "checkin": {
    "postWorkout": {
      "kicker": "CHECK-IN · POST-WORKOUT",
      "title": "How was the workout?"
    }
  }
}
```

## Using translations in components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t: tr } = useTranslation();
  return <h1>{tr('checkin.postWorkout.title')}</h1>;
}
```

> **Important**: rename `t` to `tr` to avoid collision with the theme object `t` (used throughout the app for colors/tokens).

### With interpolation

```tsx
tr('trainer.planner.exercisesHeader', { count: exercises.length })
```

### With pluralization

```tsx
// en.json: "planCount_one": "{{count}} plan waiting", "planCount_other": "{{count}} plans waiting"
tr('client.workout.planCount', { count: trainerPlans.length })
```

### In module-level functions (no hooks)

```tsx
import i18n from '../../i18n';
const tr = i18n.t;
tr('perf.voice.responseSummary', { completed, planned, adh, streak, fatigueDesc });
```

## Locale-aware formatting

For `Date.toLocaleDateString()` / `toLocaleTimeString()` and `SpeechRecognition.lang`:

```tsx
import i18n from '../../i18n';
// date formatting
new Date().toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric' });
// voice recognition
rec.lang = i18n.language || 'en-US';
```

The BCP-47 map is defined in `src/i18n/index.ts`:
```
en → en-US, pt → pt-BR, es → es-ES, de → de-DE
```

## AI prompt localization

The system prompt sent to the LLM now includes the user's locale via `AIContext.locale`. All generated workout content (titles, coach notes, exercise cues) respects the user's language. See `src/ai/buildPrompt.ts`.

## Namespace domains

| Domain | Scope |
|---|---|
| `auth.*` | Login, register, welcome, OAuth |
| `checkin.*` | Check-in Hub, Voice, Quick, Detailed, Result, PostWorkout |
| `checkinEnums.*` | Shared enums (sleep, bodyPart, location, equipment, signals, adaptations, emotional) |
| `client.*` | History, Stats, Goal, Cycle, Workout (start + mode) |
| `coachDna.*` | Coach DNA wizard (13 steps, components, output) |
| `common.*` | Shared: about, version, signOut, refresh, live, today, yesterday |
| `detailedCheckin.*` | Detailed check-in form labels |
| `nav.*` | Bottom navigation labels |
| `perf.*` | Performance dashboard (7 tabs, voice, milestones) |
| `postWorkout.*` | Post-workout summary screen |
| `quickCheckin.*` | Quick check-in form labels |
| `sideMenu.*` | Side menu navigation labels |
| `trainer.*` | Dashboard, Studio, ClientDetail, PlanEditor, Library |
| `wizard.*` | Profile wizard (steps 01-15, voice overlay, goal enums) |

## Supported languages

| Code | Language | BCP-47 |
|---|---|---|
| `en` | English | `en-US` |
| `pt` | Português (Brasil) | `pt-BR` |
| `es` | Español | `es-ES` |
| `de` | Deutsch | `de-DE` |

## Phase completion

- [x] Phase 2 — String externalisation (~55 files, ~1048 strings)
- [x] Phase 3 — Translations pt/es/de
- [x] Phase 4 — AI prompt locale injection
- [x] Phase 5 — Voice + locale formatting (20 callsites)
- [x] Phase 6 — Documentation
