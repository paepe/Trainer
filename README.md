# TrAIner — Fitness & Gym Workout App

Interactive high-fidelity prototype for **TrAIner** ("The PT & ME Experience"), an AI-powered fitness app that pairs real trainers with KI-personalized workouts. Based on the brand brief in `uploads/Kamil-Fijalkowski-Datum-18-Juni-2025-6bec6931.pdf`.

---

## How to open

- **Interactive prototype** → `TrAIner App.html` (this is what the user lives in)
- **Print/PDF version** → `TrAIner App-print.html` (1 cover + 15 screens, A4 landscape, calls `window.print()` automatically)
- **v1 backup** (purple palette, pre-brand) → `TrAIner App v1.html`

---

## File layout

| File | Role |
|---|---|
| `TrAIner App.html` | Main entry. Loads React 18 + Babel, then `tweaks-panel.jsx` → `screens.jsx` → `app.jsx`. |
| `app.jsx` | App shell — navigation, side menu, phone frame, bottom tabs, FlowPills, brand mark, TweaksPanel wiring. Owns app-wide state: `user`, `prefs`, `checkin`, `cycleConfig`. |
| `screens.jsx` | All screen components + shared atoms (Icon, PillInput, HeroIllustration, OAuth, etc). Currently large (~1900 lines) — split if it grows further. |
| `tweaks-panel.jsx` | Starter component (don't hand-edit; from `copy_starter_component`). |
| `android-frame.jsx` | Starter component (currently unused — we have a custom iPhone-style frame in app.jsx). Safe to delete. |
| `app-print.jsx` + `TrAIner App-print.html` | PDF export — renders every screen one per A4 landscape page, auto-prints. |
| `app-v1.jsx`, `screens-v1.jsx`, `TrAIner App v1.html` | First-pass design preserved for compare. |
| `assets/trainer-logo.png` | Original uploaded logo (with navy bg). |
| `assets/trainer-logo-circle.png` | Circular crop of original (kept for reference). |
| `assets/trainer-logo-clean.png` | **Use this one.** Transparent BG, no navy. Used on Welcome / Login / Register. |
| `uploads/` | Source materials from user — PDF brief + logo screenshot. |
| `pdf-page-*.png` | Cached renderings of pages 1, 9, 10, 19 of the PDF (for reference). |

---

## Brand system (extracted from the PDF)

| Token | Value | Use |
|---|---|---|
| Navy | `#0E1A2B` | App background, button text on cyan |
| Navy deep | `#08111E` | Outer page gradient |
| Surface raised | `#142233` | Cards, inputs |
| Cyan **(primary)** | `#2DD4E0` | Primary actions, the "AI" in TrAIner, focus rings |
| Teal (primaryDeep) | `#0F8C85` | Hero gradients, side menu |
| **Coral (accent)** | `#EF5B3C` | The logo ring, badges, errors, period/menstrual phase |
| Cyan soft | `#9DECF3` | Highlights, ovulation phase |
| Border subtle | `#1F2E45` | Hairlines |

Phase color for **Luteal**: `#A78BFA` (lavender, hardcoded).

Typography: **Plus Jakarta Sans** (display, headings), **Inter** (UI body, mono fallback `ui-monospace`).

Tagline: *"Train smarter, not harder."* / Claim: *"The PT & ME Experience"*

---

## Screens (15 total)

Navigation states are in `app.jsx`'s `screen` switch. Order:

1. **Welcome** — transparent logo + "Train smarter, not harder" badge + Login/Register CTAs
2. **Login** — OAuth (Google + Apple) + email/password; logo hero
3. **Register** — same shape as login; routes to Onboarding
4. **Onboarding** — 4 steps: Goal → Level → Time → Body (incl. cycle opt-in WITH cycle-length slider 21–35 days)
5. **Profile** — avatar, daily check-in CTA card, 4 stat cards (Targets / Activity / Workout / Cycle-or-Settings)
6. **Edit Profile** — 6 fields, "Save changes"
7. **Daily Check-in** — energy slider 1–10, time chips, soreness chips, focus picker, AI summary card
8. **Start Workout** — trainer card, mode tabs, map placeholder, dynamic AI plan synthesized from check-in
9. **Goal Achieved** — weekly km, 3 rings, activity list, route map, AI analysis
10. **Workout Stats** — day tabs, dual-line chart (current + ghost), AI trend insight
11. **Workout History** — day tabs, completion list
12. **Cycle** — interactive 4-phase ring (drag/tap to set day), bottom-sheet editor with BOTH day + length sliders, phase-aware AI recommendation
13. **Trainer Studio (B2B)** — KPI strip, "Feed the AI" methodology card, client list with adherence
14. **Settings** — 3 groups (AI personalization, Notifications, B2B/Studio), 11 toggles
15. **Side Menu** — opened from any internal screen, slide-in from left

The user can also jump between any screen via:
- **FlowPills** (bottom-left of viewport) — dev-style navigation grid
- **Tweaks panel → "Go to screen"** select

---

## Key features implemented (from the brief)

- ✅ **AI-personalized workouts** (synthesized live from daily check-in)
- ✅ **Daily adjustments** (energy, soreness, time → plan adapts)
- ✅ **Cycle tracking** with proportional 4-phase scaling (21–35 day range)
- ✅ **Trainer Studio (B2B)** with "Feed the AI" methodology v3.2 panel
- ✅ **White-label mode** (Tweaks toggle — hides TrAIner brand, shows "Your Studio")
- ✅ **Role switch** (client / trainer — Tweaks)
- ✅ **OAuth** (Google + Apple) — harmonized with dark navy theme
- ✅ **Workout history database** (per-day list, kept for long-term coaching)

---

## App-wide state (in `TrAInerApp`)

```jsx
user          → { name, email, role }
prefs         → 11 settings booleans (notifications, cycle, whiteLabel, …)
checkin       → { energy, soreness[], minutes, goal }
cycleConfig   → { length, periodLength, lastStartOffset }
screen        → which screen is mounted
menuOpen      → side menu visibility
```

`cycleConfig.length` is set in Onboarding (step 4) and editable in Cycle screen's bottom sheet. Phases auto-scale via `computeCyclePhases(length, palette)` in `screens.jsx`.

---

## Tweaks panel (toolbar toggle)

- **Brand**: palette (4 presets — brand cyan/teal/coral is default), dark mode, device frame, white-label
- **Features**: cycle tracking on/off, role (client/trainer)
- **Navigate**: jump to any of 14 screens

Defaults live inside `/*EDITMODE-BEGIN*/…/*EDITMODE-END*/` block in `app.jsx`. Host can rewrite them when tweaks change.

---

## Logo

Original is `assets/trainer-logo.png` (430×402, navy bg). For UI we use:
- `trainer-logo-clean.png` — background removed via `run_script` (alpha derived from per-pixel distance to navy bg, then inverse alpha-composite to recover ink color). Used on Welcome (200px), Login + Register (110–120px) with cyan drop-shadow.
- `trainer-logo-circle.png` — circular crop, used in watermark (top-left of viewport) and PDF header/cover.

---

## Print/PDF flow

`app-print.jsx` renders 16 pages (cover + 15 screens) as static React. Each screen is rendered with stub `nav`/`setUser` props. A4 landscape page CSS in `TrAIner App-print.html`. Page calls `window.print()` after fonts settle.

---

## Conventions / gotchas

- **Style objects:** all are inlined or scoped per-component — no shared `styles` object (would collide across `<script type="text/babel">` files).
- **Globals:** components are exposed via `Object.assign(window, …)` at the end of `screens.jsx` and `app.jsx`. Required because Babel-transpiled scripts each get their own scope.
- **Color helpers:** `surfRaised(dark)`, `surfSunken(dark)`, `borderSubtle(dark)`, `textPri/Sec/Mute(dark)` — defined near top of `screens.jsx`. Use these instead of hardcoding.
- **Buttons:** `primaryBtn(primary, dark)`, `outlineBtn(primary, dark)`, `ghostBtn(dark)` — return style objects.
- **Icons:** all SVG paths live in one `Icon` component (~30 icons). Add new icons there.
- **Cycle phases:** if you change `computeCyclePhases`, keep all 4 phases present even at extremes (current logic uses Math.max guards).

---

## Open follow-ups (not yet done)

- "Workout in progress" live timer screen (between Start Workout and Goal Achieved)
- Trainer-side onboarding flow (separate from client onboarding)
- Subscription/upsell screen with B2C 15–25€ / B2B 40–70€ pricing from the brief
- Replace photo placeholders (striped slots) with real trainer images
- Workout-detail screen (drill-down from history)

---

## Resume in a new chat

Just say: *"Read README.md and continue from here. [your next request]"*
