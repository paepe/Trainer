// ── PROFILE SYSTEM DESIGN — single source of truth ───────────────────────────
// The active profile decides ONE signature/action colour, applied to every screen
// through `t.primary` (see App.tsx where `t = {...(isTrainer ? TRAINER_BRAND : BRAND)}`).
//   • CLIENT  → primary = CYAN  (#2DD4E0)
//   • TRAINER → primary = CORAL (#EF5B3C)
// Screens never branch on role for colour: they read `t.primary` and adapt automatically.
// `accent` is the secondary pop colour; `*Soft`/lavender/amber/success are archetype tones.

export const BRAND = {
  primary:     '#2DD4E0', // CLIENT signature/action — cyan
  primaryDeep: '#0F8C85',
  accent:      '#EF5B3C',
  primarySoft: '#9DECF3',
  // Semantic / archetype palette
  lavender:    '#A78BFA',
  amber:       '#F5B45A',
  success:     '#4ADE80',
  criticalRed: '#FF4D4D',
  liveAction:  '#10B981', // "active session" / "start now" — distinct from archetype `success`
} as const;

// TRAINER_BRAND — same shape as BRAND so `t.primary` is profile-correct everywhere.
// Per references/coach_dna_system_design.md the Trainer signature/action colour is CORAL.
export const TRAINER_BRAND = {
  primary:     '#EF5B3C', // TRAINER signature/action — coral (CTAs, active states, progress)
  primaryDeep: '#C23B22', // coral-deep — gradients, hero shadows
  accent:      '#EF5B3C', // coral — kept as secondary pop (legacy trainer screens use accent)
  primarySoft: '#9DECF3', // archetype: Technician
  lavender:    '#A78BFA', // archetype: Movement Specialist
  amber:       '#F5B45A', // archetype: Motivator / warm-up icons
  success:     '#4ADE80', // archetype: Guide / cool-down icons
  criticalRed: '#FF4D4D',
  liveAction:  '#10B981', // "active session" / "start now" — distinct from archetype `success`
} as const;

// Shape of the `t` brand-theme object assembled in App.tsx (BRAND/TRAINER_BRAND
// spread plus runtime fields). Used where components only need brand colours.
export type BrandTheme = (typeof BRAND | typeof TRAINER_BRAND) & {
  dark: boolean;
  role: string;
};

export const DARK = {
  bg:         '#0E1A2B',
  surface:    '#142233',
  surface2:   '#122034',
  surface3:   '#1A2A40',   // drag-elevation / raised state
  border:     '#1F2E45',
  borderSoft: '#243650',   // secondary / dashed hairlines
  textPri:    '#FFFFFF',
  textSec:    'rgba(255,255,255,.65)',
  textMute:   'rgba(255,255,255,.40)',
} as const;

// Theme-variable bridge with the SAME shape as DARK. Dark-only atoms become
// theme-responsive by importing `THEME_VARS as DARK` — zero usage-site changes,
// every DARK.x now resolves to the active [data-theme] palette (theme/themes.css).
export const THEME_VARS = {
  bg:         'var(--bg)',
  surface:    'var(--surface)',
  surface2:   'var(--sunken)',
  surface3:   'var(--surface-3)',
  border:     'var(--border)',
  borderSoft: 'var(--border-soft)',
  textPri:    'var(--text-pri)',
  textSec:    'var(--text-sec)',
  textMute:   'var(--text-mute)',
} as const;

// "Arctic" — premium light theme for the CLIENT (cyan signature).
// Never pure white: a whisper of the cyan signature is pulled into the neutrals
// so the light theme reads cool and on-brand. Trainer stays always-dark (§8),
// so this single light palette serves the client only.
export const LIGHT = {
  bg:         '#F5F9FB', // base — cool off-white
  surface:    '#FFFFFF', // cards lift above the bg
  surface2:   '#E9F1F4', // sunken / inset surface
  surface3:   '#EEF4F6', // raised / drag-elevation
  border:     '#D5E3E8', // soft cool-grey hairline
  borderSoft: '#E2ECEF', // secondary / dashed hairline
  textPri:    '#0C2A33', // deep teal-navy (ties to cyan)
  textSec:    '#46606A',
  textMute:   '#849AA1',
} as const;
