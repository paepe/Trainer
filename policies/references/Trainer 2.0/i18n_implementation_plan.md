# i18n Implementation Plan — TrAIner

**Status:** In progress (started 2026-06-05)
**Scope:** Portuguese · English · Spanish · German — all LTR (no Arabic/RTL)
**Stack:** Vite + React + Capacitor · `i18next` + `react-i18next` (already in package.json)

## Baseline (audited 2026-06-05)

- 48 screens, 175 TS/TSX files, ~600–900 user-facing strings.
- System currently **hardcoded to American English** (a prior "i18n"-labelled effort that was actually PT→EN normalisation, not internationalisation).
- `i18next` + `react-i18next` installed but **inert** — no init, no catalogs, 0 `useTranslation` usage.
- Voice STT hardcoded `en-US` (`WizardVoiceOverlay.tsx:46`, `CheckInVoice.tsx:50`).
- AI prompts (`src/ai/buildPrompt.ts`) have **no output-language directive**.
- `language` pref not wired (only a comment in `src/types/preferences.ts`); no DB column.

## Defaults adopted (open decisions resolved to recommendation on "prossiga")

1. **Key strategy:** nested by domain (`settings.title`, `workout.start`).
2. **Initial detection:** device locale on first run → persisted pref override.
3. **Scope:** PT/EN/ES/DE, no RTL.
4. **Exercise/muscle-group names:** to be confirmed in Phase 0 (code enum vs DB content). DB content is out of static-i18n scope.

---

## Phase 0 — Foundation / Infra
- [ ] Commit `i18next` + `react-i18next` deps (currently uncommitted)
- [ ] `src/i18n/index.ts` — `createInstance` + `initReactI18next`, `fallbackLng: 'en'`, interpolation, namespaces
- [ ] Key strategy: nested by domain
- [ ] Catalog layout: `src/i18n/locales/{en,pt,es,de}.json`
- [ ] Boot import in `main.tsx`; detection = device locale (1st run) → pref
- [ ] Confirm exercise/muscle-group data source (code vs DB) → scope decision
- [ ] **Gate:** build/tsc green

## Phase 1 — `language` preference wiring
- [ ] `preferences.ts`: `AppLanguage = 'en'|'pt'|'es'|'de'` + interface field
- [ ] `App.tsx`: default `'en'`, fetch `data.language ?? 'en'`, save `language:`, effect → `i18n.changeLanguage()`
- [ ] Migration `add_language_preference` (`language text default 'en'`) → PROD
- [ ] `SettingsScreen`: "Language" `SelectorSection` (all roles)
- [ ] **Gate:** switching language persists + re-renders

## Phase 2 — String externalisation
- [ ] Pattern proof: `SettingsScreen` 100% → `t()` + canonical `en.json`
- [ ] Batch A — shell/nav/common components
- [ ] Batch B — auth + wizard
- [ ] Batch C — client screens
- [ ] Batch D — check-in screens
- [ ] Batch E — trainer + studio
- [ ] Batch F — coach-dna, inbox, shared, remainder
- [ ] Interpolation (`{{name}}`), plurals (`_one/_other`), dynamic enums
- [ ] **Gate:** residual-literal scan clean; build/tsc green

## Phase 3 — Translation generation
- [ ] Fitness glossary (set/rep/load/warm-up) for consistency
- [ ] Generate `pt/es/de.json` from canonical `en.json`
- [ ] Visual overflow review — German (~30% longer)

## Phase 4 — AI output localisation
- [ ] `buildPrompt.ts`: inject target-language directive from active locale
- [ ] Thread locale into `workoutGeneration` path
- [ ] Per-language output QA

## Phase 5 — Voice + formatting
- [ ] `WizardVoiceOverlay.tsx:46` + `CheckInVoice.tsx:50`: `rec.lang` from locale (pt→pt-BR, en→en-US, es→es-ES, de→de-DE)
- [ ] TTS voice selection per locale (if used)
- [ ] Verify 12 `toLocale*`/`Intl` call-sites use active locale

## Phase 6 — QA + ship
- [ ] Visual pass per language (overflow/truncation, esp. DE)
- [ ] build/tsc green
- [ ] Commit(s) per phase + push
- [ ] Memory: create `project_i18n.md`; supersede deferred note in settings/ts-conversion plans
