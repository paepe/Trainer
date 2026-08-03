import type { CoachArchetype } from '../types/coach-dna';

export type AITask = 'generate_workout' | 'suggest_objectives' | 'daily_insight';

// ─── Trainer (Coach DNA) ──────────────────────────────────────────────────────

export interface TrainerContext {
  id:                string;
  name:              string;
  archetype:         CoachArchetype;
  coachingStyles:    string[];
  coreValues:        string[];
  coachVoice:        string;
  motto:             string;
  methods:           string[];
  environments:      string[];
  intensity:         string;
  focus: {
    strength:  number;
    endurance: number;
    mobility:  number;
    athletic:  number;
    coord:     number;
    balance:   number;
  };
  preferredFormats:    string[];
  intensityCurve:      string;
  sessionOrder:        string[];
  communicationTone:   string[];
  clientProfiles:      string[];
  favoriteExercises:   string[];
  avoidExercises:      string[];
}

// ─── Client (Profile V2 + Amplified) ─────────────────────────────────────────

export interface ClientContext {
  id:                  string;
  name:                string;
  age?:                number | undefined;
  biologicalSex?:      string | undefined;
  heightCm?:           number | undefined;
  weightKg?:           number | undefined;
  primaryGoal:         string;
  secondaryGoals:      string[];
  voiceNote?:          string | undefined;
  fitnessLevel:        string;
  daysPerWeek:         number;
  sessionDuration:     number;
  preferredTime:       string;
  preferredDays?:      number[] | undefined;
  adherenceBarriers?:   string[] | undefined;
  modalities:          string[];
  hasHealthCondition:  boolean;
  healthCategories:    string[];
  healthFreeText?:     string | undefined;
  healthVoiceNote?:     string | undefined;
  comorbidities:       string[];
  comorbiditiesNote?:   string | undefined;
  mobilityLevel:       string;
  balanceLevel:        string;
  autonomyLevel?:      string | undefined;
  effortTolerance:     string;
  baselinePainLevel:   string;
  accessLevel?:        string | undefined;
  supportResources?:   string[] | undefined;
  instructionFormat?:   string[] | undefined;
  accessibility?:       string[] | undefined;
  locations:           string[];
  equipment:           string[];
  preferenceIntensity: string;
  explanationLevel:    string;
  preferredLanguage?:  string | undefined;
  trainingFocus:       string;
  company?:            string | undefined;
  supportLevel?:       string | undefined;
  riskLevel:           string;
  riskFlags:           string[];
  lifestyleBarriers?:  string[] | undefined;
  sensitiveFactors?: {
    regularMedications?:            string | undefined;
    emotionalHistory:               boolean;
    recreationalSubstance:          boolean;
    voiceNote?:                     string | undefined;
  } | undefined;
  bodyRhythm?: {
    enabled:              boolean;
    cycleCurrentDay?:     number | undefined;
    cycleDurationDays?:   number | undefined;
    adaptationPreference?: string[] | undefined;
  } | undefined;
  abandonHistory?: {
    reasons:               string[];
    hadNegativeExperience?: boolean | undefined;
    fearOfInjury?:          boolean | undefined;
    feltGymConstraint?:     boolean | undefined;
    whatHelped?:            string | undefined;
    whatDisrupted?:         string | undefined;
    voiceNote?:             string | undefined;
  } | undefined;
  consentAiAdaptation?: boolean | undefined;
  // Amplified (optional — only present when generate-amplified ran)
  trainabilityTier?:   string | undefined;
  priorityGoal?:       string | undefined;
  intensityCeiling?:   string | undefined;
  progressionRate?:    string | undefined;
  safetyFlags?:        string[] | undefined;
  aiNotes?:            string | undefined;
}

// ─── Today (Check-in V2) ──────────────────────────────────────────────────────

export interface TodayContext {
  checkinAt:         string;
  variant:           string;
  readinessScore:    number;
  energyLevel:       number;
  sleepQuality:      string;
  sleepHours?:       number | undefined;
  fatigueLevel:      number;
  fatigueType?:      string | undefined;
  emotionalState?:   string | undefined;
  painPresent:       boolean;
  painIntensity:     number;
  painRegions:       string[];
  safetyStatus:      string;
  aiLedBlocked:      boolean;
  safetySignals:     string[];
  availableMinutes:  number;
  location:          string;
  equipmentToday?:   string[] | undefined;
  cycleActive?:      boolean | undefined;
  cyclePhase?:       string | undefined;
  cycleDayOfPhase?:  number | undefined;
  cycleAdaptation?:  string | undefined;
}

// ─── Stats (Personal Statistics / M5) ────────────────────────────────────────

export interface StatsContext {
  adherenceRate:        number;
  workoutStreak:        number;
  sessionsLast30d:      number;
  avgEnergy7d:          number;
  avgReadiness7d:       number;
  avgRPELast3:          number;
  painEvents14d:        number;
  primaryPainRegion?:   string | undefined;
  painRecurrenceAlert:  boolean;
  predictiveScores: {
    progressionReadiness: number;
    fatigueRisk:          number;
    painRecurrence:       number;
    sessionCompletion:    number;
    planFit:              number;
  };
}

// ─── Library (Exercise Library constraints) ───────────────────────────────────

export interface LibraryContext {
  excludedRegions:    string[];
  favoriteExercises:  string[];
  avoidExercises:     string[];
  equipmentAvailable: string[];
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface TaskContext {
  type:                AITask;
  durationMin?:        number | undefined;
  focusOverride?:      string | undefined;
  extraInstructions?:  string | undefined;
  maxExercises?:       number | undefined; // plan gate: max exercises per session (null = unlimited)
  fitnessOnly?:        boolean;            // plan gate: exclude performance exercises
  // ai.checkin_adjustment gate (docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md Fase
  // 0): false disables daily calibration by energy/sleep/fatigue only. Never
  // gates a safety signal — pain and Safety Gate reach the prompt regardless,
  // for every tier. Defaults to true (calibration on) when unset.
  adjustmentAllowed?:  boolean;
}

// ─── Unified AI Context ───────────────────────────────────────────────────────

export interface AIContext {
  trainer:        TrainerContext;
  client:         ClientContext;
  today:          TodayContext;
  stats:          StatsContext;
  library:        LibraryContext;
  task:           TaskContext;
  locale:         string;
  // 1.1 (docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md Fase 1): response
  // WorkoutExercise gained `category`. The server overrides whatever is sent
  // here, so this only documents intent — see api/generate-smart-workout.ts
  // for the version this build actually declares.
  contextVersion: '1.0' | '1.1';
  builtAt:        string;
}

// ─── Output shapes ────────────────────────────────────────────────────────────

export interface WorkoutExercise {
  name:            string;
  muscleGroup:     string;
  sets:            number;
  reps:            string | null;
  durationSeconds: number | null;
  load:            string;
  restSeconds:     number;
  cue:              string;
  safetyNote?:      string | undefined;
}

export interface WorkoutPhase {
  phase:       string;
  label:       string;
  durationMin: number;
  exercises:   WorkoutExercise[];
}

export interface SmartWorkout {
  title:           string;
  format:          string;
  totalDurationMin: number;
  coachNote:       string;
  adaptations:     string[];
  phases:          WorkoutPhase[];
}

export interface ObjectiveItem {
  type:      'short_term' | 'medium_term' | 'long_term';
  title:     string;
  rationale: string;
  metrics:   string;
  priority:  'high' | 'medium' | 'low';
  timeframe: string;
}

export interface PlanAdjustment {
  aspect:    string;
  current:   string;
  suggested: string;
  reason:    string;
}

export interface ObjectiveSuggestions {
  analysis:    string;
  objectives:  ObjectiveItem[];
  adjustments: PlanAdjustment[];
}

export interface DailyInsight {
  title:    string;
  body:     string;
  action?:  string | undefined;
  tone:     string;
}

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface SmartWorkoutRequest {
  trainer: TrainerContext;
  client:  ClientContext;
  today:   TodayContext;
  stats:   StatsContext;
  library: LibraryContext;
  task:    TaskContext;
  locale:  string;
}

export interface SmartWorkoutResponse {
  workout?:    SmartWorkout    | undefined;
  objectives?: ObjectiveSuggestions | undefined;
  insight?:    DailyInsight    | undefined;
  usage: {
    input_tokens:  number;
    output_tokens: number;
  };
  context_snapshot: {
    readinessScore: number;
    safetyStatus:   string;
    adaptations:    string[];
  };
}
