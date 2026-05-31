import { BRAND } from '../theme/tokens';

// ─── Block 2 — Certifications ─────────────────────────────────────────────────

export const CERTS = [
  { key: 'pt',       label: 'Personal Trainer',                       icon: 'trophy'   },
  { key: 'fitness',  label: 'Fitness Trainer',                        icon: 'dumbbell' },
  { key: 'edfis',    label: 'Physical Education / Sports Science',    icon: 'grad'     },
  { key: 'physio',   label: 'Physical Therapist',                     icon: 'heart'    },
  { key: 'snc',      label: 'Strength & Conditioning',                icon: 'bolt'     },
  { key: 'other',    label: 'Other',                                  icon: 'plus'     },
] as const;

// ─── Block 3 — Fitness Levels ─────────────────────────────────────────────────

export const FITNESS_LEVELS = [
  { value: 1, label: 'Elite Athlete',        sub: 'Competition or high performance'       },
  { value: 2, label: 'Very Fit',             sub: 'Consistent advanced training'          },
  { value: 3, label: 'Fit',                  sub: 'Regular progressive training'          },
  { value: 4, label: 'Average',              sub: 'Active with occasional intense workouts'},
  { value: 5, label: 'Moderately Active',    sub: 'Health and wellness focus'             },
] as const;

// ─── Block 4 — Training Methods ───────────────────────────────────────────────

export const METHODS = [
  'CrossFit', 'Functional Training', 'HIIT', 'Circuit Training',
  'Weightlifting / Bodybuilding', 'Strength Training', 'Running',
  'Mobility', 'Athletic Performance', 'Calisthenics',
  'Machine Training', 'Other',
] as const;

// ─── Block 4 — Training Environments ─────────────────────────────────────────

export const ENVIRONMENTS = [
  'CrossFit Box', 'Commercial Gym', 'Calisthenics Park',
  'Outdoors, no equipment', 'Outdoors with bands',
  'Indoor, no equipment', 'Indoor with bands',
] as const;

// ─── Block 4 — General Intensity ─────────────────────────────────────────────

export const INTENSITY = [
  'Moderate', 'Challenging', 'Variable', 'High intensity',
] as const;

// ─── Block 5 — Coaching Styles ───────────────────────────────────────────────

export const STYLES = [
  { key: 'motiv',  label: 'Motivational',         icon: 'flame'       },
  { key: 'prof',   label: 'Professional',          icon: 'shield'      },
  { key: 'tech',   label: 'Technical',             icon: 'gauge'       },
  { key: 'perf',   label: 'Performance-driven',    icon: 'zap'         },
  { key: 'humor',  label: 'Relaxed / Fun',          icon: 'sparkle'    },
  { key: 'emp',    label: 'Empathetic',             icon: 'heart'      },
  { key: 'direct', label: 'Direct',                icon: 'target'      },
  { key: 'disc',   label: 'Disciplined',            icon: 'shieldCheck'},
] as const;

// ─── Block 6 — Core Principles ───────────────────────────────────────────────

export const PRINCIPLES = [
  { key: 'quality',    label: 'Quality before intensity'         },
  { key: 'intensity',  label: 'Intensity over perfection'        },
  { key: 'health',     label: 'Health first'                     },
  { key: 'strength',   label: 'Strength first'                   },
  { key: 'athletics',  label: 'Athletics first'                  },
  { key: 'mobility',   label: 'Mobility first'                   },
  { key: 'fun',        label: 'Enjoyment and motivation first'   },
  { key: 'function',   label: 'Function over aesthetics'         },
  { key: 'progress',   label: 'Sustainable progress'             },
] as const;

// ─── Phase 2 constants ────────────────────────────────────────────────────────

export const FOCUS_ITEMS = [
  { key: 'strength',  label: 'Strength',              color: BRAND.primary     },
  { key: 'endurance', label: 'Endurance',              color: BRAND.accent      },
  { key: 'mobility',  label: 'Mobility',               color: BRAND.lavender    },
  { key: 'athletic',  label: 'Athletic performance',   color: BRAND.amber       },
  { key: 'coord',     label: 'Coordination',           color: BRAND.primarySoft },
  { key: 'balance',   label: 'Stability / Balance',    color: BRAND.success     },
] as const;

export const FORMATS = [
  'EMOM', 'AMRAP', 'For Time', 'Interval', 'Circuit',
  'Supersets', 'Strength + MetCon', 'Strength only', 'Conditioning only', 'Tabata',
] as const;

export const STRUCTURE_BLOCKS = [
  { key: 'mobility',      label: 'Mobility',          sub: 'Joint activation',         icon: 'wave',    color: BRAND.lavender    },
  { key: 'warmup',        label: 'Warm-up',            sub: 'Temperature increase',     icon: 'flame',   color: BRAND.amber       },
  { key: 'technique',     label: 'Technique',          sub: 'Motor pattern focus',      icon: 'target',  color: BRAND.primarySoft },
  { key: 'strength',      label: 'Strength',           sub: 'Main block',               icon: 'dumbbell',color: BRAND.primary     },
  { key: 'conditioning',  label: 'Conditioning / WOD', sub: 'Metabolism & endurance',   icon: 'run',     color: BRAND.accent      },
  { key: 'cooldown',      label: 'Cool-down',          sub: 'Recovery & flexibility',   icon: 'heart',   color: BRAND.success     },
] as const;

export const CURVES = [
  { key: 'progressive', label: 'Progressive ramp-up', sub: 'Intensity builds throughout the session' },
  { key: 'wave',        label: 'Wave',                 sub: 'Alternating peaks and valleys'           },
  { key: 'peak_early',  label: 'Early peak',           sub: 'Most intense at the start'               },
  { key: 'peak_late',   label: 'Late peak',            sub: 'Most intense near the end'               },
  { key: 'constant',    label: 'Constant',             sub: 'Uniform intensity throughout'            },
] as const;

export const TONES = [
  'Professional', 'Motivational', 'Casual', 'Athletic', 'Direct', 'Technical',
] as const;

export const CLIENTS = [
  'Beginners', 'Intermediate', 'Advanced athletes',
  'Women', 'Men', 'Seniors', 'Desk workers',
  'Weight loss', 'Muscle gain', 'Rehabilitation',
  'Functional fitness enthusiasts', 'CrossFit athletes',
] as const;

export const MOTTO_EXAMPLES = [
  '"Train with purpose, recover with intelligence."',
  '"Every rep counts. Every session matters."',
  '"Performance is the result of method."',
  '"Move better. Move stronger."',
] as const;

export const TOTAL_STEPS = 12;
