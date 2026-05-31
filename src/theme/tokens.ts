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
