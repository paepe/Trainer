# Handoff: Coach DNA — Personal Trainer Profile Builder

## Overview
**Coach DNA** is the trainer-facing onboarding/profile builder for **TrAIner** (an AI-powered fitness app, "The PT & ME Experience"). It is part of the **Coach Studio (B2B) · "Feed the AI"** track and is the trainer-side counterpart of the existing student-facing "Smart Student Profile" module.

Its job is to capture a personal trainer's **technical identity, behavioral style, and training methodology** across 12 guided blocks, so the downstream **AI Coach Engine** generates workouts that carry the coach's *real signature* instead of generic recommendations. The flow ends by deriving a **Coaching Archetype** (one of six) and emitting a structured `coach_dna.json` object.

Source of requirements: the product spec `Personal Trainer Profile (PTP)`. This module is the UI realization of that spec.

---

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes that demonstrate the intended look, layout, copy, and behavior. **They are not production code to copy directly.**

The prototype runs React 18 via in-browser Babel with all styling inline and component sharing done through `window` globals. That approach is intentional for fast design iteration but is **not** how this should ship.

**The task** is to recreate these designs in the target codebase's existing environment (React, Vue, SwiftUI, native, etc.) using its established component library, design-system tokens, and conventions. If no front-end environment exists yet, choose the most appropriate framework for the project (a React + TypeScript SPA is a natural fit given the prototype) and implement the designs there with real components, a proper build, and real state/persistence.

A companion file, **`SPEC.md`**, is included — it is an exhaustive system-design reference (tokens, atoms, per-block tables, the archetype scoring engine, data model, business rules). Use this README as the entry point and `SPEC.md` for deep detail.

---

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, and interactions are final. Recreate the UI pixel-accurately using the codebase's libraries and patterns. Exact hex values, sizes, and copy are provided below and in `SPEC.md`.

---

## Layout / Shell

The experience is presented as a **design workstation**: a centered phone mock flanked by two context panels, with a floating Tweaks panel. In production, only the **phone content** (the app itself) is the shippable UI — the left/right panels and Tweaks are *prototype scaffolding* for reviewing the design and should not ship.

```
┌─────────────┬──────────────────┬─────────────┐
│ Context     │   Phone Frame    │  Live JSON  │
│ Panel       │   420 × 860      │  Peek       │
│ (280px)     │   iOS-style      │  (320px)    │
└─────────────┴──────────────────┴─────────────┘
                                   ↘ Tweaks panel (floating, bottom-right)
```

- **Shell background:** `radial-gradient(1200px 700px at 80% -10%, rgba(239,92,60,.09), transparent 50%), radial-gradient(900px 600px at -10% 110%, rgba(45,212,224,.07), transparent 50%), #08111E`. Flex-centered, `padding: 28px; gap: 32px`.
- **Color leadership:** the student track leads with cyan; **this coach track leads with coral** (`#EF5B3C`) — primary CTA, archetype default, progress bar, and kicker are coral.

### Left — Context Panel (280px, prototype scaffolding)
- Module kicker "COACH STUDIO" (mono, coral, `.18em`, uppercase) + H2 "Coach DNA do Personal Trainer" (display 22, weight 800) + one-line description.
- Card "12 BLOCOS DE MÉTODO": 14 nav rows (intro + 12 blocks + output). Each row = status dot (done = coral check / current = filled coral / idle = hollow) + label. Current row tinted `coral 1a`. Clicking a row jumps to that step.
- Archetype chip card: tinted in the active archetype color, icon badge + `COACH_ARCHETYPE` label + archetype name. Updates live.

### Center — Phone Frame (420×860, the real app)
- Outer 420×860, `radius 52`, bezel `linear-gradient(180deg,#202B3B,#0E1822)`, `padding 12`, `box-shadow: 0 50px 100px rgba(0,0,0,.6), inset 0 0 0 1px #2a3a52`.
- Inner screen `radius 42`, `overflow hidden`, `background #0E1A2B`.
- Notch 110×28, top 8, centered, `#000`, `radius 16`, `z-index 100`.
- Status bar 44px, padding `14px 28px`: "9:41" left, "5G" + battery SVG (22×11) right.
- A `showFrame=false` fallback renders a plain 420×820 card (`radius 28`, `1px` border) with no bezel/notch.

### Right — Live JSON Peek (320px, prototype scaffolding)
- Kicker "LIVE · AI COACH ENGINE" (mono, cyan).
- Monospace card rendering a flattened, live `coach_dna.json` (color-coded: comments muted, archetype in archetype color, booleans lavender, values cyanSoft).
- "Coaching signature" card tinted in archetype color with the archetype's one-line description.

---

## Screens / Views (in-phone flow)

The phone shows one step at a time. `TOTAL = 12` content blocks, plus an intro (step 0) and an output (step 13).

**Persistent phone chrome (all steps):**
- **Header:** back button (34×34, `radius 10`, `surfRaised`; disabled on intro) · centered kicker "TrAIner · Coach Studio" (mono coral) + dynamic subtitle ("Coach DNA" / "Bloco N de 12" / "Concluído") · save button (34×34, check icon). Below: 3px progress track (`border`) with coral fill `linear-gradient(90deg,#C23B22,#EF5B3C)`, width = `step/12 * 100%`.
- **Bottom action bar:** padding `14px 18px 18px`, `borderTop 1px solid border`. Intro → single coral CTA "Construir meu Coach DNA". Blocks 1–11 → "Salvar" (outline) + "Continuar" (coral). Block 12 → "Salvar" + "Gerar Coach DNA". Output → "Editar" (outline, returns to block 1) + "Ativar Coach DNA" (coral).
- **Content area:** `flex: 1; overflow: auto; padding: 18px 22px 100px`. Resets scroll to top on step change.

### Step 0 — Intro
- 56px hero icon (gradient `coral → #C23B22`, `fingerprint` icon, `box-shadow 0 12px 30px coral44`).
- Kicker "COACH STUDIO · FEED THE AI" → H1 "Coach DNA" (display 30, weight 800, `-0.02em`) → purpose paragraph (one bold span "sua assinatura").
- Feature list card (`surfRaised`, `radius 14`): 5 rows, each a 28px coral-tinted icon badge + label.
- Info note (coral tone). Mono meta line: "≈ 5–8 min · 12 blocos · alimenta o AI Coach Engine".

### Step 1 — Identity (`identity`)
- `PhotoSlot` (avatar upload, 92×92, `radius 24`) + name `Field` + gender `Chip` row (Masculino / Feminino / Outro / Prefiro não informar) + age `Field` (number, suffix "anos", optional).
- VoiceBar (simulated dictation).

### Step 2 — Background & Experience (`background`)
- `Slider` "Anos de experiência" 0–40 inside a `surfRaised` card.
- 6 `ChoiceCard`s (multi-select) for certifications: Personal Trainer · Treinador Fitness · Graduação em Ed. Física/Ciências do Esporte · Fisioterapeuta · Strength & Conditioning · Outra.

### Step 3 — Self Fitness Level (`fitness`)
- `LevelPicker` 1–5 (single select): 1 Atleta de elite / 2 Muito condicionado / 3 Condicionado / 4 Mediano / 5 Moderadamente ativo. Each row shows a numeric badge + mini strength bars.
- Info note clarifying this is the trainer's personal reference, not the students' difficulty.

### Step 4 — Methods, Environments & Intensity (`training`)
- Methods: 12 multi-select chips. Environments: 7 multi-select chips (cyanSoft). General intensity: 4 single-select chips (coral) — Moderada / Desafiadora / Variável / Altamente exigente.

### Step 5 — Coach DNA · Style (`dna.style`)
- Badge "Coach DNA". 8 styles in a 2-column grid of icon+label buttons (multi). Active = `coral 1c` tint, coral border. Info note (coral) calls this the most decisive part.

### Step 6 — Core Principles (`dna.principles`)
- Badge "Escolha até 3". 9 principles as a vertical list; **max 3**; selecting shows a numeric **rank** (1–3) in the leading circle; once 3 are chosen the rest dim to `opacity 0.4` and disable. Counter "n/3".

### Step 7 — Focus Distribution (`focus`)
- Badge "Total = 100%". `FocusBars` over 6 capacities (Força, Resistência, Mobilidade, Performance atlética, Coordenação, Estabilidade/Equilíbrio). Stacked proportion bar + per-row range sliders (step 5) + live TOTAL colored green(=100)/amber(<100)/coral(>100) + "Equilibrar" auto-balance + corrective message.

### Step 8 — Signature Exercises (`exercises`)
- Favorites: `TagPicker` (max 10) with suggestions. To-avoid: `TagPicker` (free) with suggestions, coral. Info note: avoid list becomes a hard rule.

### Step 9 — Formats & Intensity Curve (`design`)
- Formats: 10 multi-select mono chips (EMOM, AMRAP, For Time, Intervalado, Circuito, Super-séries, Força + MetCon, Apenas Força, Apenas Condicionamento, Tabata). Curve: 5 single-select `ChoiceCard`s (coral).

### Step 10 — Session Structure (`structure`)
- Badge "Arraste para ordenar". `StructureSorter` over 6 blocks (Mobilidade, Aquecimento, Técnica, Força, Condicionamento/WOD, Volta à calma). Drag-and-drop **and** up/down arrow buttons; numbered 1–6 with grip handle.

### Step 11 — Communication & Audience (`audience`)
- Tone: 6 multi-select chips. Client profiles: 12 multi-select chips (lavender).

### Step 12 — Philosophy & AI Personality (`philosophy`)
- Badge "Final". Motto `Field` + 4 example chips that fill it. AI personality `TextArea` (4 rows) with example helper. Info note (coral): keeps generated workouts consistent with the coach's identity.

### Step 13 — Output (Coach DNA)
- Hero icon in the archetype color + archetype icon. Kicker "SAÍDA · COACH DNA" → H1 = **archetype name** → descriptive sub.
- 6-segment archetype scale (active segment in archetype color).
- `coach_dna.json` summary card (key→value): coach, experiencia, estilo, principios, metodos, foco_top (top-3 capacities by %), favoritos, evitar, formatos, publico, archetype.
- If a motto exists: quote card (icon `quote` + italic display text). Closing coral info note.

---

## Interactions & Behavior
- **Navigation:** `step` integer 0–13. Header back decrements; bottom CTA increments; context-panel rows and the Tweaks "Go to block" select jump directly. Content scroll resets to top on each change.
- **Progress bar:** width animates `transition: width .35s ease`.
- **Multi vs single select:** chips/cards toggle membership in arrays (multi) or set a scalar (single).
- **Max-N rules:** principles cap at 3 (disable + dim others); favorites cap at 10 (input disabled + "limite atingido").
- **Focus distribution:** must total 100; "Equilibrar" splits 100 evenly (remainder to first items); color + message reflect over/under/exact.
- **Drag sort:** native HTML5 DnD (`draggable`, `onDragStart/Enter/Over/Drop/End`) with `dragIdx`/`overIdx`; arrow buttons as accessible fallback. `move(from,to)` reorders via splice.
- **Photo upload:** hidden `<input type=file accept=image/*>`, `URL.createObjectURL` preview; initials fallback derived from the name.
- **Simulated:** VoiceBar dictation, save buttons (`alert`), and "Ativar Coach DNA" (`alert`) are mocks — wire to real services in production (see State & Data).
- **Animations:** `wave` (voice bars) and `pulse-ring` (active mic). **No entrance animation on the step container** — see the critical note in Design Tokens.

---

## State Management

Single source of truth `data` (merged shallowly per top-level key via `set(key, val)`):

```js
{
  identity:   { photo, name, gender, age },
  background: { years, certs: [] },          // certs = cert keys
  fitness:    { level },                      // 1..5
  training:   { methods: [], envs: [], intensity },
  dna:        { style: [], principles: [] },  // principles max 3
  focus:      { strength, endurance, mobility, athletic, coord, balance }, // sum = 100
  exercises:  { favorites: [], avoid: [] },   // favorites max 10
  design:     { formats: [], curve },
  structure:  ['mobility','warmup','technique','strength','conditioning','cooldown'], // ordered keys
  audience:   { tone: [], clients: [] },
  philosophy: { motto, prompt },
  voice:      null,  // id of block with active voice input, or null
}
```
Plus UI state: `step` (0–13). Prototype tweaks: `showFrame`, `showJsonOutput`, `archetypeOverride`, `accent`, `step`.

**Derived:** `archetype = computeArchetype(data)` (overridable). See Archetype Engine.

**Production data needs (replace mocks):**
- Persist the profile (autosave / "Salvar"); resume in progress.
- Photo upload to storage; store URL in `identity.photo`.
- On "Ativar Coach DNA": serialize to canonical `coach_dna.json` (below) and POST to the AI Coach Engine.
- Optional speech-to-text for VoiceBar.

---

## Archetype Engine

`computeArchetype(data)` returns one of six keys via weighted scoring over style + principles + focus + intensity; `tweaks.archetypeOverride` (≠ `'auto'`) wins.

| key | name (PT) | tag (EN) | color | icon |
|---|---|---|---|---|
| `performance` | Arquiteto de Performance | Performance Architect | `#EF5B3C` | zap |
| `technician` | O Técnico | The Technician | `#2DD4E0` | compass |
| `motivator` | O Motivador | The Motivator | `#F5B45A` | flame |
| `guide` | O Guia | The Guide | `#4ADE80` | heart |
| `drill` | O Disciplinador | The Drill Coach | `#FF4D4D` | mountain |
| `movement` | Especialista em Movimento | Movement Specialist | `#A78BFA` | wave |

**Weights (summary):**
- Style: `perf`+3→performance · `tech`+3→technician · `motiv`+3/`humor`+2→motivator · `emp`+3→guide · `prof`+1→technician&guide · `disc`+3/`direct`+2→drill.
- Principles: "Atletismo primeiro"+2 / "Força primeiro"+2 / "Intensidade antes da perfeição"(+1 perf, +2 drill); "Qualidade antes da intensidade"+3→technician; "Prazer e motivação primeiro"+3→motivator; "Saúde primeiro"+3 / "Progresso sustentável"+2→guide; "Mobilidade primeiro"+3 / "Função acima da estética"+3→movement.
- Focus: athletic≥20 +2 / strength≥30 +1→performance; mobility≥25 +2 / balance≥20 +1→movement; coord≥20 +1→technician.
- Intensity: "Altamente exigente" +1 performance & +1 drill; "Moderada" +1 guide.
- **Tie-break order:** performance → technician → movement → drill → guide → motivator. **Fallback** when all ≤0: `technician`.

---

## Canonical output — `coach_dna.json`

Emit this on completion (PTP target shape + a `derived` block):

```json
{
  "personalTrainerProfile": {
    "personalInformation":   { "profilePhoto":"", "fullName":"", "gender":"", "age":null },
    "professionalBackground":{ "yearsOfExperience":null, "certificationsEducation":[] },
    "personalFitnessLevel":  null,
    "trainingPreferences":   { "preferredTrainingMethods":[], "preferredTrainingEnvironments":[], "generalWorkoutIntensity":"" },
    "coachDNA": {
      "coachingStyle":[], "coreTrainingPrinciples":[],
      "trainingFocusDistribution":{ "strength":0,"endurance":0,"mobility":0,"athleticPerformance":0,"coordination":0,"stabilityBalance":0 }
    },
    "exercisePreferences":   { "favoriteExercises":[], "exercisesToAvoid":"" },
    "workoutDesignPreferences":{ "preferredWorkoutFormats":[], "preferredWorkoutStructure":[], "preferredIntensityCurve":"" },
    "communicationStyle":[], "primaryClientFocus":[],
    "coachPhilosophy":       { "motto":"", "aiPersonalityPrompt":"" },
    "derived":               { "coachArchetype":"" }
  }
}
```

---

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| navy | `#0E1A2B` | In-app background |
| navyDeep | `#08111E` | Shell background |
| surfRaised | `#142233` | Cards, sections, inputs |
| surfRaised2 | `#1A2A40` | Active drag elevation |
| border | `#1F2E45` | Hairlines |
| borderSoft | `#243650` | Secondary/dashed hairlines |
| cyan (primary) | `#2DD4E0` | Neutral selection, focus, "strength" |
| cyanDeep | `#0F8C85` | Depth/gradients |
| cyanSoft | `#9DECF3` | Highlights, mono AI text, environments |
| **coral (accent / coach)** | `#EF5B3C` | Module CTA, Coach DNA, default archetype, "avoid" |
| lavender | `#A78BFA` | Boolean true, mobility, audience |
| amber | `#F5B45A` | Attention, coordination |
| green | `#4ADE80` | Success, balance |
| critical red | `#FF4D4D` | Drill archetype |
| text | `#FFFFFF` | Primary text |
| textSec | `rgba(255,255,255,.65)` | Secondary text |
| textMute | `rgba(255,255,255,.4)` | Labels, metadata |

### Typography
- Display: `"Plus Jakarta Sans","Inter",system-ui,sans-serif` (H1 800/27–30px; StepHeader H2 700/24px).
- Body: `"Inter",system-ui,-apple-system,sans-serif` (13–13.5px, line 1.45–1.55; Hint italic 12.5).
- Mono: `"JetBrains Mono",ui-monospace,SFMono-Regular,monospace` (kickers 700/10.5px `.18em` uppercase; values 11px; "BLOCO NN/NN" `.15em`).
- Field labels: Body 600, 11.5–12px, `.06em`, uppercase, `textSec`.

### Spacing & radius
- Gaps 8–14px · card padding 12–14px · screen padding `18px 22px 100px`.
- Radius: pill 999 · small card 10–13 · large card 14 · PhotoSlot 24 · button 9–14 · phone notch 16 · phone screen 42 · phone outer 52.

### Shadows
- Phone: `0 50px 100px rgba(0,0,0,.6), inset 0 0 0 1px #2a3a52`.
- Coral CTA: `0 10px 30px #EF5B3C44`.
- JSON peek: `0 30px 60px rgba(0,0,0,.3)`.
- Hero icon: `0 12px 30px <accent>44`.

### Keyframes
```css
@keyframes wave       { 0%,100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
@keyframes pulse-ring { 0% { transform: scale(.9); opacity:.7; } 100% { transform: scale(1.6); opacity:0; } }
```

> **CRITICAL (known regression):** do **not** put an entrance animation on the step container that starts from `opacity: 0`. When the iframe/render animation clock is frozen (preview/screenshot/throttled), the running animation's 0% value (`opacity:0`) overrides the base and the content stays invisible — even with `animation-fill-mode: both`. Keep the resting state explicitly visible: `.step-fade { opacity: 1; } .step-fade > * { opacity: 1; }`. In production this maps to: never let a list/route transition leave content pinned at opacity 0; prefer transitions that animate *to* the resting state or use proper enter/leave lifecycles.

---

## Components inventory (atoms to rebuild)
Standard: `Icon` (~40 inline 24×24 SVGs), `Chip`, `ChoiceCard`, `Field`, `TextArea`, `PrivacyNote` (tones: default/coach/optional), `Hint`, `StepHeader`, `FieldLabel`, `Slider`, `ToggleRow`, `VoiceBar`.
Module-specific (see `SPEC.md` §4 for full specs): **`PhotoSlot`** (avatar upload), **`LevelPicker`** (1–5 with strength bars), **`FocusBars`** (100%-sum distribution with auto-balance), **`StructureSorter`** (drag + arrow reorder), **`TagPicker`** (free-text tags + suggestions + max).

---

## Assets
- **No external image assets.** All icons are inline SVG paths in the `Icon` component. Fonts load from Google Fonts (Plus Jakarta Sans, Inter, JetBrains Mono). The profile photo is user-uploaded at runtime.
- If integrating into the broader TrAIner app, reuse its existing brand/logo assets and design-system tokens rather than re-declaring the palette.

---

## Files in this bundle
- `Coach DNA - Perfil do Personal Trainer.html` — host page (fonts, keyframes, script load order).
- `coach/coach-atoms.jsx` — tokens (`B`), `Icon`, and all atoms (including the 5 module-specific ones).
- `coach/coach-steps.jsx` — catalogs/constants, `StepIntro`, `Step01`–`Step12`, `StepOutput`, `ARCHETYPES`.
- `coach/coach-app.jsx` — `CoachApp` shell, `computeArchetype`, `Header`, `BottomBar`, `PhoneFrame`, `ContextPanel`, `SidePeek`, mount.
- `coach/tweaks-panel.jsx` — prototype-only Tweaks shell (do **not** ship; it's review tooling).
- `SPEC.md` — exhaustive system-design reference (deep detail for every section above).

> Prototype mechanics to drop in production: in-browser Babel, `window` globals for cross-file sharing, inline styles, and the Tweaks/Context/Peek scaffolding. Keep: the tokens, the 12-block flow, the atoms, the archetype engine, the max-N/100%-sum rules, and the canonical `coach_dna.json`.
