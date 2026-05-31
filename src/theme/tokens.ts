export const BRAND = {
  primary:     '#2DD4E0',
  primaryDeep: '#0F8C85',
  accent:      '#EF5B3C',
  primarySoft: '#9DECF3',
  // Semantic / archetype palette
  lavender:    '#A78BFA',
  amber:       '#F5B45A',
  success:     '#4ADE80',
  criticalRed: '#FF4D4D',
} as const;

// TRAINER_BRAND — Canonical values per references/coach_dna_system_design.md
// Hierarchy note: accent (Coral) is the PRIMARY action color for Trainer UI.
// This is the inverse of the CLIENT theme where primary (Cyan) drives actions.
export const TRAINER_BRAND = {
  primary:     '#2DD4E0', // cyan   — structural labels, icons (BLOCK 01/12, detail)
  primaryDeep: '#0F8C85',
  accent:      '#EF5B3C', // coral  — CTAs, kicker labels, progress bar, hero shadows
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
