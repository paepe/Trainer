# Handoff: Smart Student Profile (Module 01)

> **Source module:** "Perfil Inteligente do Aluno" — TrAIner platform, Module 01.
> The prototype in this bundle is in **Portuguese (PT-BR)**. **This handoff documents the design for an ENGLISH-language build.** Every piece of UI copy below is given in English. Use the English copy when implementing; the PT-BR prototype is the visual/behavioral source of truth for *layout and interaction only*.

---

## Overview

Module 01 is the **adaptive onboarding** that builds a student's **Extended Trainability Profile** (a.k.a. "Safe Movement Profile") for an AI-assisted personal-training product. It collects health, movement, lifestyle, environment, availability, preferences, and consent across **14 functional blocks**, then derives an **operational risk level (R0–R4)** that gates how much automation the system is allowed to apply (AI-led → Trainer-led).

The defining product principle, threaded through every screen:

> **Intimate data stays private. Only the *operational consequence* is shared — masked.**
> e.g. The trainer never sees "knee surgery in 2023"; they see *"Relevant condition declared — conservative progression recommended."*

The flow is presented inside a **phone frame** (mobile-first product) with two desktop-only side panels for reviewer context (a left navigation/progress rail + risk badge, and a right live-JSON "operational output" peek). In the real product, **only the phone screen ships** — the side panels are presentation scaffolding for this prototype and should NOT be built as part of the mobile app (see "What NOT to build").

---

## About the Design Files

The files in `design_reference/` are **design references created in HTML/React (via inline Babel)** — a prototype showing intended look and behavior. **They are not production code to copy directly.**

The task is to **recreate these designs in the target codebase's existing environment** (React Native, Flutter, native iOS/Android, a web React app, etc.) using its established components, navigation, state, and styling patterns. If no environment exists yet, choose the most appropriate framework for a mobile-first product and implement there.

Files included:

| File | Role |
|---|---|
| `Perfil Inteligente do Aluno.html` | Entry point — fonts, global styles, mounts the React app |
| `perfil/perfil-atoms.jsx` | **Design tokens** (`B`), fonts, and shared primitives: `Icon`, `Chip`, `ChoiceCard`, `Field`, `PrivacyNote`, `Hint`, `VoiceBar`, `StepHeader`, `Slider`, `ToggleRow` |
| `perfil/perfil-steps.jsx` | The 14 blocks + intro + output screen, plus the `RISK` table and option lists |
| `perfil/perfil-app.jsx` | Shell: phone frame, header, progress bar, bottom action bar, `computeRisk()` logic, the two reviewer side-panels, and the prototype's tweak panel |
| `perfil/tweaks-panel.jsx` | Prototype-only tweak harness — **ignore for production** |

---

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, iconography, component states, and copy intent are all specified. Recreate the **phone-screen UI pixel-accurately** using your codebase's component library, mapping the tokens below to your design system. The two desktop side panels are reviewer scaffolding — match their *content meaning* if you build an internal review tool, but they are not part of the shipped mobile experience.

---

## Design Tokens

All values are taken verbatim from `perfil-atoms.jsx` (the `B` object) and the component source. This is a **dark, deep-navy theme with a cyan primary and a coral "sensitive/privacy" accent.**

### Colors

| Token | Hex | Usage |
|---|---|---|
| `navy` | `#0E1A2B` | Primary surface / screen background |
| `navyDeep` | `#08111E` | App/page backdrop (behind frame) |
| `surfRaised` | `#142233` | Cards, raised panels, inputs-on-card |
| `surfRaised2` | `#1A2A40` | Secondary raised surface |
| `border` | `#1F2E45` | Default 1px borders, dividers |
| `borderSoft` | `#243650` | Softer borders (dashed voice bar, radio outlines) |
| `cyan` | `#2DD4E0` | **Primary** — active state, CTAs, progress, highlights |
| `cyanDeep` | `#0F8C85` | Gradient partner for cyan (icons, progress) |
| `cyanSoft` | `#9DECF3` | Code/mono text, masked-output quotes |
| `coral` | `#EF5B3C` | **Sensitive / privacy / risk** accent, required asterisks |
| `lavender` | `#A78BFA` | "Body Rhythm" (opt-in cycle) feature accent, boolean values |
| `amber` | `#F5B45A` | R2 risk, "authorized only" visibility |
| `green` | `#4ADE80` | R0 risk, positive/false-safe booleans |
| `text` | `#FFFFFF` | Primary text |
| `textSec` | `rgba(255,255,255,.65)` | Secondary text, labels |
| `textMute` | `rgba(255,255,255,.40)` | Muted hints, mono captions |
| Risk R4 critical | `#FF4D4D` | Distinct from coral — critical risk only |

**Backdrop gradient** (behind the phone, desktop presentation only):
`radial-gradient(1200px 700px at 80% -10%, rgba(45,212,224,.08), transparent 50%)`, `radial-gradient(900px 600px at -10% 110%, rgba(239,92,60,.07), transparent 50%)`, over `#08111E`.

### Typography

Three families (Google Fonts):

- **`FF_DISPLAY`** = `"Plus Jakarta Sans", "Inter", system-ui, sans-serif` — headings, titles, buttons, body emphasis. Weights 500/600/700/800.
- **`FF_BODY`** = `"Inter", system-ui, sans-serif` — default body text (set on `<body>`). Weights 400/500/600/700.
- **`FF_MONO`** = `"JetBrains Mono", ui-monospace, monospace` — eyebrows, code/JSON output, risk tokens, day-of-week buttons, numeric values in sliders. Weights 400/500.

Type scale (px, from source):

| Role | Size | Weight | Family | Notes |
|---|---|---|---|---|
| Intro H1 | 30 | 700 | Display | `letter-spacing: -0.02em`, `line-height: 1.1` |
| Output/screen H1 | 26 | 700 | Display | `letter-spacing: -0.01em` |
| Step title (`StepHeader` H2) | 24 | 700 | Display | `letter-spacing: -0.01em`, `line-height: 1.15` |
| Left-panel H2 | 22 | 700 | Display | |
| ChoiceCard title | 14.5 | 700 | Display | |
| Body / sub | 13–13.5 | 400–500 | Body | `line-height: 1.5–1.55` |
| Field input | 14.5 | 400 | Body | |
| Chip / button label | 12.5 | 600 | Body | |
| Eyebrow (`BLOCK 01 / 14`) | 10.5 | 700 | Mono | `letter-spacing: .15–.18em`, uppercase |
| Field label | 11.5 | 600 | Body | uppercase, `letter-spacing: .06em` |
| Mono value (slider/JSON) | 11–14 | 600–700 | Mono | |

### Spacing, Radius, Shadow

- **Spacing rhythm:** content padding `18px 22px` (header), step body `18px 22px 100px`, cards `12–16px`. Inter-element gaps mostly `6 / 8 / 10 / 12 / 14` — use a 2px-based scale.
- **Border radius:** chips/pills `999`; buttons & inputs `12–14`; cards `12–16`; small icon tiles `8–10`; medium icon tiles `10–12`; the intro/output icon badge `16–18`; phone frame outer `52`, inner screen `42`, notch `16`.
- **Shadows:**
  - CTA glow: `0 10px 30px {cyan}33`
  - Card lift (side peek): `0 30px 60px rgba(0,0,0,.3)`
  - Frame: `0 50px 100px rgba(0,0,0,.6), inset 0 0 0 1px #2a3a52`
  - Frameless screen: `0 40px 80px rgba(0,0,0,.4)`
- **Color-as-overlay convention:** active/tinted backgrounds use the accent hex + a low alpha hex suffix, e.g. `${cyan}22`, `${coral}10`, `${color}1f`. Borders use `${color}` at full or `${color}44/55/66`. Replicate with your platform's alpha-compositing.

### Icons

Custom 24×24 stroke icons (1.8–2.6 stroke, round caps/joins), defined as SVG paths in `ICONS` (`perfil-atoms.jsx`). Names used: `back, mic, shield, lock, eye, eyeOff, check, x, chevron, chevronDown, plus, heart, user, target, activity, home, calendar, brain, accessibility, sparkles, voice, pill, ruler, zap, shieldCheck`. Map these to your icon set (e.g. Lucide/Feather equivalents — most map 1:1). Keep stroke weight and rounded caps consistent.

---

## Frame & Layout (phone screen — the shippable surface)

Mobile screen is a vertical flex column, fixed inside a **420 × 860** frame in the prototype (treat as a standard mobile viewport in production):

1. **Header** (fixed top, `padding 16px 22px 12px`, bottom border):
   - Row: **back button** (34×34, radius 10, `surfRaised`, disabled+30% opacity on intro) · centered title block · **save/check button** (34×34).
   - Center title: mono eyebrow `TrAIner · Module 01` (cyan, uppercase, `.18em`) over a 12.5px label: `Initial setup` (intro) / `Step {n} of 14` / `Completed` (last).
   - **Progress bar:** 3px track (`border`), fill = `linear-gradient(90deg, {cyanDeep}, {cyan})`, width `= (step/14)*100%`, `transition: width .35s ease`. Intro = 0%.
2. **Scrollable content** (`flex:1; overflow:auto; padding:18px 22px 100px`). Scroll resets to top on every step change. Scrollbars hidden.
3. **Bottom action bar** (fixed bottom, top border): see "Bottom bar" per state below.

Step transitions use a subtle fade (`.step-fade`). Keyframes defined: `wave` (voice equalizer bars), `pulse-ring` (recording halo).

---

## Screens / Views

There are **16 views**: Intro (step 0), Blocks 01–14 (steps 1–14), and the Output screen (step 15). Navigation is linear (back/continue) but any step is jumpable from the left rail / tweak panel in the prototype.

Each block uses `StepHeader`: a mono eyebrow `BLOCK 0N / 14`, optional **badge** chip (coral-tinted), an H2 title, and an optional sub. Many blocks also show a `Hint` (italic, quoted, the literal question the app "asks"), one or more `PrivacyNote` callouts, and a `VoiceBar` ("speak to the app").

> **Below, each view lists: English title, English sub, English hint, the fields/controls, and English option labels.** Layout/state details follow.

### Step 0 — Intro

- **Eyebrow:** `MODULE 01 · PREDICTIVE BASE`
- **H1:** `Smart Student Profile`
- **Body:** "Health, Movement, Privacy, and a Predictive Base. Together we'll build your **Extended Trainability Profile** — the foundation TrAIner uses to adapt the intensity, safety, and progression of your plan."
- **Feature list card** (icon + label rows): `Basic data, goals & history` (user) · `Declared health — no diagnosis` (shield) · `Functional capacity & accessibility` (accessibility) · `Sensitive factors stay protected` (lock) · `Body Rhythm — opt-in, always private` (sparkles).
- **PrivacyNote (default):** "You can save and resume anytime. No partial data is lost. All sensitive information is masked before it reaches your trainer."
- **Mono footnote:** `≈ 6–9 min · 14 blocks · LGPD compliant`
- **Layout:** 56×56 gradient icon badge (brain icon) top-left, then eyebrow, H1, body, card, privacy note.
- **Bottom bar:** single full-width CTA **`Start`** (cyan, navy text, chevron). No back/save.

### Step 1 — Basic Data

- **Title:** `Basic data` — **Sub:** "So we can adapt the intensity, language, safety, and progression of your plan."
- **Hint:** "We use this information to adapt the intensity, language, safety, and evolution of your plan."
- **Fields:** `Name` (placeholder "What should we call you?") · row[`Age` (number, suffix "yrs"), `Language` (default "English")] · row[`Height` (number, suffix "cm"), `Weight` (number, suffix "kg", helper "optional")].
- **Biological sex** chip group (label note: "useful for metrics & cycle"): `Female`, `Male`, `Intersex`, `Prefer not to say`.
- **Emergency contact** field (placeholder "Name and phone", helper "recommended for supervised training or elevated risk").
- **VoiceBar hint:** "e.g. 'I'm 32, 1m72, 68 kg, I speak English.'"

### Step 2 — Goals

- **Title:** `What can movement improve in your life?` — **Sub:** "Aesthetics, performance, health, autonomy, or well-being — all valid."
- **Hint:** "What would you like movement to improve in your life?"
- **Primary goal** (`*` required): 2-col grid of 8 icon cards (single-select). **Secondary goals** (optional): full chip set (multi-select).
- **Goal labels (English):** Hypertrophy, Weight loss, Strength gain, Conditioning, Mobility, Longevity, Return to training, Emotional well-being, Daily autonomy, Balance, Body composition, Sports performance.
- **VoiceBar hint:** "e.g. 'I want to gain strength, but my main goal is improving mobility.'"

### Step 3 — Training History

- **Title:** `History & relationship with movement` — **Sub:** "To understand experience, adherence patterns, and what usually gets in the way."
- **Controls:**
  - "Do you train currently?" chips: `Yes, regularly`, `Sometimes`, `I don't train`.
  - "Current level" chips: `Beginner`, `Intermediate`, `Advanced`.
  - Slider "Typical frequency" 1–7, suffix `× / week`.
  - "Practiced modalities" multi-chips: Strength training, Running, Walking, Yoga, Pilates, Cycling, Swimming, Functional, Martial arts, Dance, CrossFit, Other.
  - Card: "Have you abandoned a training program before?" `Yes`/`No`. If **Yes** → reveal "Main reason" chips: Lack of time, Injury, Lack of results, Loss of motivation, Cost, Routine change, Embarrassment, Other + **PrivacyNote:** "This data feeds the **Churn Risk Engine** internally — it's never shown as a 'reason for failure.'"
  - "How do you prefer to progress?" chips: `Gradual`, `Moderate`, `Intense`.
- **VoiceBar hint:** "e.g. 'I've trained for 2 years, stopped due to an injury, prefer to return gradually.'"

### Step 4 — Declared Health  · **Badge: `No diagnosis`**

- **Title:** `Declared health` — **Sub:** "The system does not diagnose. It only uses what you declare to adapt training safely."
- **Hint:** "Is there any health condition, limitation, prior diagnosis, surgery, treatment, or professional recommendation we should consider when adapting your plan?"
- Top chips: `Yes, I want to share`, `Not applicable`, `Prefer not to say`.
- If **Yes** → "Categories" multi-chips: Cardiovascular, Metabolic, Renal, Respiratory, Musculoskeletal, Neurological, Chronic pain, Emotional health, Pregnancy or postpartum, Post-operative, Physical disability, Other condition. Plus a free-text **`Free note`** field (placeholder "e.g. knee surgery in 2023, cleared for light strength training", helper "The AI structures the text into operational consequence — never as a diagnosis.") + **PrivacyNote (sensitive):** "**Sensitive data.** Visible only to you and your authorized trainer. Output to other profiles: operational mask (e.g. 'Relevant condition declared — conservative progression recommended.')."
- If **Prefer not to say** → **PrivacyNote (optional):** "That's fine. The system will run in conservative mode until you choose to add more — and will never pressure you to share."
- **VoiceBar hint:** "e.g. 'I had knee surgery in 2023, was cleared for light strength training.'"

### Step 5 — Comorbidities & Care  · **Badge: `Voluntary`**

- **Title:** `Comorbidities & care` — **Sub:** "Only what you're comfortable sharing. Influences automation and human validation."
- Multi-chips: Hypertension, Type 1 diabetes, Type 2 diabetes, Asthma, Obesity, Osteoarthritis, Osteoporosis, Fibromyalgia, Chronic pain, Cardiovascular condition, Renal condition, Post-operative, Pregnancy, Postpartum, Other, Prefer not to say (last one rendered in a muted color).
- If any selected (and not "Prefer not to say"):
  - "Is the condition controlled?" chips: `Yes, under supervision`, `Partially`, `No / not sure`.
  - `ToggleRow`: title "I have medical clearance for physical activity", sub "When applicable. Keeps AI-led enabled within declared limits."
  - **PrivacyNote (default):** "A relevant comorbidity can **limit automation**, require AI-assisted or Trainer-led, and may require professional validation. You'll always see the reason behind each decision."

### Step 6 — Functional Capacity & Accessibility

- **Title:** `Functional capacity & accessibility` — **Sub:** "Possible movement before ambitious movement. Let's make sure the plan is realistic."
- Four chip rows (single-select each): **Mobility** (low / moderate / good) · **Balance** (unstable / assisted / stable) · **Autonomy** (assisted / partial / independent) · **Effort tolerance** (low / moderate / good).
- "Support resources you use" multi-chips: Wheelchair, Cane, Walker, Prosthesis, Nearby support, None.
- "How do you prefer to receive instructions?" chips: Visual, Auditory, Simplified text, Vibration, Default.
- **PrivacyNote (default):** "This data generates your **Functional Capacity Profile** and filters the exercise library — e.g. if you can't lie on the floor, floor workouts stop being the default."

### Step 7 — Habits & Risk Factors

- **Title:** `Routine that affects energy and recovery` — **Sub:** "No judgment — share only what feels relevant to your training."
- **Hint:** "Some routines can influence energy, recovery, and safety. Share only what feels relevant."
- Multi-chips: Irregular sleep, High stress, Prolonged sedentary time, Low hydration, Exhausting routine, Night shifts, Irregular eating, Frequent travel, Caring for children/family, Smoking, Regular alcohol, Transportation barriers.
- **PrivacyNote (default):** "This data feeds internal predictions of **fatigue**, **adherence**, and **recovery**. Nothing is shown as a 'bad habit.'"

### Step 8 — Protected Sensitive Factors  · **Badge: `Masked`**

- **Title:** `Protected sensitive factors` — **Sub:** "The intimate data stays protected. Only the operational consequence feeds your plan."
- Lead callout (coral-bordered card, lock icon): "Medications, voluntarily declared substances, psychiatric history — visible **only to you**. Your trainer only sees:" → mono chip: *"Declared safety factor — conservative progression."*
- `Field` **`Regular medications`** (marked **SENSITIVE**, placeholder "Optional — only if it affects energy, sleep, balance, or effort", helper "Operational output: watch for fatigue, dizziness, or reduced tolerance.").
- `ToggleRow` (sensitive) "I want to declare emotional/psychiatric history" — sub "Used only to adjust communication tone and progression. Masked for all other profiles."
- `ToggleRow` (sensitive) "I want to declare recreational substance use" — sub "Voluntary. Influences tolerance recommendation and monitoring."
- **PrivacyNote (sensitive):** "Core rule: **Intimate data** = private. **Operational consequence** = shareable, masked. You can revoke anytime in Block 13."
- **VoiceBar hint:** "Confirmation required before saving."

### Step 9 — Body Rhythm  · **Badge: `Opt-in`**

- **Title:** `Body Rhythm` — **Sub:** "Private adaptation to your physiological cycle, whenever you choose to enable it. Never an intimate questionnaire."
- `ToggleRow` "Enable Body Rhythm" — sub "This feature is opt-in. You can disable it and delete the data anytime."
- When **enabled** (lavender-accented card): Slider "Current cycle day" (1–`length`, suffix "th day", lavender) · Slider "Average cycle length" (21–35, suffix " days", lavender) · toggle button "Period started today" (coral when active) · "Adaptation preference" multi-chips (lavender): Keep normal, Reduce intensity, Reduce impact, Increase rest, Shorten session, Prioritize mobility.
  - **PrivacyNote (optional):** "We never display things like 'the student is menstruating' or 'luteal phase.' Your operational display reads: *'Temporary physiological factor recommends a moderate, lower-impact version.'*"
- When **disabled** → **PrivacyNote (optional):** "Optional feature. We don't collect flow, cramps, mood, or contraceptives by default — only the minimum needed to adapt training, if you want."

### Step 10 — Environment / Equipment

- **Title:** `Where you train, in real life` — **Sub:** "So we never prescribe an exercise that depends on equipment, space, or support you don't have."
- "Possible locations" 2-col `ChoiceCard` grid (multi): Home, Gym, Studio, Park, Condo gym, Online.
- "Available equipment" multi-chips: Dumbbells, Resistance bands, Barbell, Bench, Treadmill, Bike, Machines, Kettlebell, Cable/pulley, None.
- "Accessibility conditions" multi-chips: Wheelchair accessible, Support bars, Safe flooring, Privacy to train, Companion available, Adapted equipment.
- **VoiceBar hint:** "e.g. 'I train at home, I have 5–20 kg dumbbells and resistance bands.'"

### Step 11 — Availability & Barriers

- **Title:** `Availability & barriers` — **Sub:** "A realistic plan beats an ambitious one. Let's calibrate to what fits."
- Slider "Days per week" (1–7, suffix " days / week") · Slider "Session duration" (10–120, step 5, suffix " min").
- "Best time" chips: Morning, Afternoon, Evening, Variable.
- "Preferred days" — 7 mono day-letter toggle buttons (M T W T F S S), multi-select.
- "Adherence barriers" multi-chips (coral): Night shift, Family care, Frequent travel, Treatment/physio, Post-work fatigue, Transportation, Cost, Emotional.
- **PrivacyNote (default):** "Someone who can only train 3× a week for 30 minutes will never get a 5×70 plan — except as a declared aspirational goal."

### Step 12 — Training & Support Preferences

- **Title:** `Training & support preferences` — **Sub:** "Sets the communication tone and tunes the plan to your behavioral profile."
- Six single-select chip rows: **Preferred intensity** (light / moderate / intense) · **Train alone or with others?** (alone / with others / no preference) · **Preferred language** (direct / warm / technical) · **Explanation level** (simple / detailed / technical) · **Goal focus** (performance / health / aesthetics / consistency) · **Support level** (autonomy / close guidance / continuous support).
- **PrivacyNote (default):** "Preferences feed predictions of **adherence**, **friction**, and **effective communication type**."

### Step 13 — Consent & Visibility  · **Badge: `LGPD`**

- **Title:** `Consent & visibility` — **Sub:** "You decide who sees what. You can revoke at any time."
- **Visibility matrix** — a table with columns **Category | Personal | Studio**. Each row's Personal/Studio cell is a `<select>` styled with the value's color. Categories & default values:

  | Category (EN) | Personal default | Studio default | Sensitive |
  |---|---|---|---|
  | Training goal | share | share | no |
  | Training history | share | summary | no |
  | Pain / operational restriction | share | summary | no |
  | Relevant comorbidity | authorized only | masked | **yes** |
  | Sensitive medication | authorized only | hidden | **yes** |
  | Emotional / psychiatric health | hidden | hidden | **yes** |
  | Body Rhythm | authorized only | hidden | **yes** |

  Visibility values & colors: `share` (cyan), `authorized only` (amber), `summary` (cyanSoft), `masked` (lavender), `hidden` (coral). Sensitive rows show a coral lock icon.
- `ToggleRow` "Allow AI to use this for plan adaptation" — sub "The AI uses only operational outputs — never raw intimate data."
- `ToggleRow` "Keep access history" — sub "You'll be able to audit who saw what and when."
- **PrivacyNote (sensitive):** "Revoking consent **prevents future unauthorized use** and keeps an auditable record of the decision."

### Step 14 — Operational Risk Classification  · **Badge: `Technical output`**

- **Title:** `Operational risk classification` — **Sub:** "Calculated from the previous blocks. You can review it and request human validation."
- Big risk card (tinted by risk color): `R{n}` badge tile + `RISK_LEVEL = "R{n}"` (mono) + risk name + sub. Below, a mono config block:
  ```
  automation_allowed = "{ai_led|ai_led_with_limits|ai_assisted|human_review|trainer_led}"
  human_validation_required = {true if R3/R4 else false}
  privacy_masking_required = true
  safety_gate_required = {false if R0 else true}
  ```
- **Risk scale row** R0→R4, current one highlighted. Short labels: Low, Mild, Mod., High, Critical.
- **PrivacyNote (default):** "The classification is **explainable**: you can request a breakdown of the factors that weighed into each decision."

### Step 15 — Output: Extended Trainability Profile

- **Eyebrow:** `PRIMARY OUTPUT · MODULE 01`
- **H1:** `Extended Trainability Profile` — caption: "Also called the **Safe Movement Profile**."
- **JSON summary card** (`// extended_trainability_profile.json`) — key/value mono rows: `primary_goal`, `secondary_goals` (count), `training_level`, `environment`, `availability` (`{days}x · {duration}min`), `abandonment_history`, `declared_health`, `functional_capacity` (`mobility / balance / autonomy`), `relevant_habits` (count), `body_rhythm` (`active (private)` / `disabled`), `risk_level`, `automation_allowed`, `privacy_masking` (`true`).
- **Risk summary strip** (risk-tinted): `R{n}` tile + automation label + sub.
- **PrivacyNote (default):** "Ready for **Module 2 — Initial Assessment & Physical Check-in**. You can edit any block anytime."
- **Bottom bar (last step):** `Edit` (outline) + **`Go to Module 2`** (cyan CTA, chevron).

---

## Interactions & Behavior

- **Linear navigation** with back (header) / Continue (bottom). Continue label is context-aware: `Start` (intro) → `Continue` (1–13) → `Generate Extended Profile` (step 14) → on output, `Go to Module 2`.
- **Save & resume:** "Save for later" (bottom, steps 1–14) and the header check button both trigger a confirmation ("Progress saved. You can resume anytime.") In production, wire these to real persistence — the prototype uses `alert()`.
- **Conditional reveals:** Step 3 (abandonment reason on "Yes"), Step 4 (categories/note on "Yes", reassurance on "Prefer not to say"), Step 5 (control/clearance on selection), Step 9 (cycle controls on enable). Animate reveals subtly.
- **Selection states:** Chips/cards toggle a tinted background (`{color}22`-ish) + colored border + (multi) a check icon. Single-select replaces; multi-select toggles a Set.
- **Sliders:** native range with `accentColor`; current value shown in mono; min/max ticks beneath.
- **VoiceBar:** tap toggles a "recording" state — coral fill, pulsing halo (`pulse-ring`), animated equalizer bars (`wave`). This is a mocked affordance; back it with real speech-to-text + AI structuring if/when available. Sub-copy when recording: "Release to confirm. The AI will structure it for you."
- **Scroll resets** to top on every step change.
- **Progress bar** animates width on step change (`.35s ease`).

## State Management

State is a single `data` object with one key per block, plus a derived `risk`. Shape (see `perfil-app.jsx` initial state):

```
basic   { name, age, lang, height, weight, sex, emergency }
goals   { primary, secondary[] }
history { trains, level, freq, mods[], abandoned, reason, pace }
health  { has, cats[], note }
comorbid{ items[], controlled, releaseDoc }
func    { mobility, balance, autonomy, tolerance, supports[], instruction }
habits  { items[] }
sensitive { meds, psychiatric, recreational }
rhythm  { active, day, length, periodStart, adapt[] }
env     { places[], equip[], access[] }
routine { days, duration, prefTime, days_pref[], barriers[] }
prefs   { intensity, companions, tone, detail, focus, support }
consent { visibility{}, ai, history }
voice   (which block's voice bar is active, or null)
step    (current block index 0–15)
```

### Risk engine (`computeRisk`) — port this logic exactly

Risk is the **max level triggered** by these rules (start at 0):

- **R4:** an uncontrolled comorbidity (`comorbid.controlled === 'No / not sure'` AND ≥1 real comorbidity); OR declared **post-operative** health category **without** medical clearance (`releaseDoc === false`).
- **R3:** ≥2 comorbidities; OR any support resource other than "None"/"Nearby support"; OR `balance === 'unstable'`.
- **R2:** exactly 1 comorbidity; OR `health.has === 'yes'`; OR `tolerance === 'low'`; OR `mobility === 'low'`.
- **R1:** `trains === "I don't train"`; OR `level === 'Beginner'`; OR ≥3 habit items selected.
- **R0:** none of the above.

"Prefer not to say" comorbidity is excluded from the comorbidity count. Each risk level maps to an automation policy (see RISK table below). The prototype also exposes a manual `riskOverride` for demos — **not a production feature**.

### Risk table (R0–R4)

| Level | Name (EN) | Automation | Sub (EN) | Color |
|---|---|---|---|---|
| R0 | Low operational risk | AI-led | No relevant limitation declared. | green |
| R1 | Mild attention | AI-led with limits | Mild pain, sedentary, or low experience. | cyan |
| R2 | Moderate | AI-assisted | Controlled condition or functional limitation. | amber |
| R3 | Elevated | Human review | Multiple conditions or fall risk. | coral |
| R4 | Critical | Trainer-led | Warning signs — automation blocked. | #FF4D4D |

---

## What NOT to build (prototype scaffolding)

These exist only to present the prototype on desktop and must **not** ship inside the mobile app:

- **Left context panel** (`ContextPanel`): module title, the 14-block jump list with progress checks, and a live risk badge. Reuse its *content* only if you build an internal reviewer/coach console.
- **Right "Live · Operational output" peek** (`SidePeek`): a live JSON mirror + a "Visible to Studio" masked-quote card. Great spec for what the **trainer/studio-facing view** should show, but it's not part of the student onboarding screen.
- **Phone frame, notch, status bar** (`PhoneFrame`): device chrome for presentation.
- **Tweaks panel** (`tweaks-panel.jsx`, `useTweaks`, the `TWEAK_DEFAULTS` object, `riskOverride`): prototype-only harness.

---

## Localization note

The reference renders PT-BR (`<html lang="pt-BR">`). **Build the English version using the English copy in this README.** Keep all strings in an i18n layer so PT-BR can be reintroduced — the product is bilingual by design (note the in-app "Language" field in Block 1). Privacy/masked-output phrasing is product-critical: translate for meaning, not word-for-word, and keep the "operational consequence, never the intimate datum" framing intact.

## Assets

No external image/binary assets. All icons are inline SVG paths (`ICONS` map in `perfil-atoms.jsx`) — map to your icon library. Fonts are Google Fonts: **Plus Jakarta Sans**, **Inter**, **JetBrains Mono** (load equivalents in your platform).

## Files to reference

- `design_reference/Perfil Inteligente do Aluno.html`
- `design_reference/perfil/perfil-atoms.jsx` — tokens + primitives
- `design_reference/perfil/perfil-steps.jsx` — all 16 views + risk table + option lists
- `design_reference/perfil/perfil-app.jsx` — shell, header, bottom bar, `computeRisk()`
- `design_reference/perfil/tweaks-panel.jsx` — prototype-only (ignore)

To view the prototype: open the `.html` file in a browser (it loads React + Babel from CDN; needs internet on first load).
