// ─── Step keys ───────────────────────────────────────────────────────────────

export type CoachDNAStep =
  | 'identity' | 'background' | 'fitness' | 'training'
  | 'dna_style' | 'dna_principles'
  | 'focus' | 'exercises' | 'design' | 'structure' | 'audience' | 'philosophy'
  | 'completed';

// ─── Archetype ────────────────────────────────────────────────────────────────

export type CoachArchetype =
  | 'performance' | 'technician' | 'motivator' | 'guide' | 'drill' | 'movement';

// ─── Block shapes (mirrors DB JSONB columns) ──────────────────────────────────

export interface CoachDNAIdentity {
  name:    string;
  gender:  string;
  age:     string;
}

export interface CoachDNABackground {
  years: number;
  certs: string[];
}

export interface CoachDNAFitness {
  level: number | null;
}

export interface CoachDNATraining {
  methods:   string[];
  envs:      string[];
  intensity: string;
}

export interface CoachDNAStyleBlock {
  style: string[];
}

export interface CoachDNAPrinciplesBlock {
  principles: string[];
}

export interface CoachDNAFocus {
  strength:  number;
  endurance: number;
  mobility:  number;
  athletic:  number;
  coord:     number;
  balance:   number;
}

export interface CoachDNAExercises {
  favorites: string[];
  avoid:     string[];
}

export interface CoachDNADesign {
  formats: string[];
  curve:   string;
}

export interface CoachDNAStructureBlock {
  order: string[];
}

export interface CoachDNAAudience {
  tone:    string[];
  clients: string[];
}

export interface CoachDNAPhilosophy {
  motto:  string;
  prompt: string;
}

// ─── Full in-memory state (mirrors spec `data` object) ───────────────────────

export interface CoachDNAData {
  identity:   CoachDNAIdentity;
  background: CoachDNABackground;
  fitness:    CoachDNAFitness;
  training:   CoachDNATraining;
  dna: {
    style:      string[];
    principles: string[];
  };
  focus:      CoachDNAFocus;
  exercises:  CoachDNAExercises;
  design:     CoachDNADesign;
  structure:  string[];
  audience:   CoachDNAAudience;
  philosophy: CoachDNAPhilosophy;
}

export const COACH_DNA_DEFAULTS: CoachDNAData = {
  identity:   { name: '', gender: '', age: '' },
  background: { years: 0, certs: [] },
  fitness:    { level: null },
  training:   { methods: [], envs: [], intensity: '' },
  dna:        { style: [], principles: [] },
  focus:      { strength: 0, endurance: 0, mobility: 0, athletic: 0, coord: 0, balance: 0 },
  exercises:  { favorites: [], avoid: [] },
  design:     { formats: [], curve: '' },
  structure:  ['mobility', 'warmup', 'technique', 'strength', 'conditioning', 'cooldown'],
  audience:   { tone: [], clients: [] },
  philosophy: { motto: '', prompt: '' },
};

// ─── DB row shape ─────────────────────────────────────────────────────────────

export interface CoachDNARow {
  id:             string;
  trainer_id:     string;
  current_step:   CoachDNAStep;
  completed_at:   string | null;
  archetype:      CoachArchetype | null;
  dna_active:     boolean;
  identity:       CoachDNAIdentity       | null;
  background:     CoachDNABackground     | null;
  fitness:        CoachDNAFitness        | null;
  training:       CoachDNATraining       | null;
  dna_style:      CoachDNAStyleBlock     | null;
  dna_principles: CoachDNAPrinciplesBlock | null;
  focus:          CoachDNAFocus          | null;
  exercises:      CoachDNAExercises      | null;
  design:         CoachDNADesign         | null;
  structure:      CoachDNAStructureBlock | null;
  audience:       CoachDNAAudience       | null;
  philosophy:     CoachDNAPhilosophy     | null;
  created_at:     string;
  updated_at:     string;
}

// ─── Upsert payload (subset for partial saves) ───────────────────────────────

export type CoachDNAUpsert = Partial<Omit<CoachDNARow, 'id' | 'created_at' | 'updated_at'>>;
