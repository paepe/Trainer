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
} as const;


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

export const LIGHT = {
  bg:       '#FFFFFF',
  surface:  '#FFFFFF',
  surface2: '#F4F6FA',
  border:   '#E7ECF3',
  textPri:  '#102236',
  textSec:  '#5a6878',
  textMute: '#8a96a4',
} as const;
