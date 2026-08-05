// POST /api/generate-smart-workout
// Input:  SmartWorkoutRequest  (trainer + client + today + stats + library + task)
// Output: SmartWorkoutResponse (workout | objectives | insight + usage + context_snapshot)
// Uses DeepSeek deepseek-chat. No Supabase calls — client pre-fetches and sends data.
// Privacy: sensitive_factors/body_rhythm are included in client.sensitiveFactors/bodyRhythm only when
// consent.allow_ai_adaptation is true (gated in buildAIContext.ts). When false, both are omitted before the request is sent.
// NOTE: All types and prompt-building logic are inlined (self-contained) for Vercel bundling.

// Auth + entitlements now come from shared api/_lib modules — Fase 0/2 of
// docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md confirmed relative
// imports inside api/ (and api/ → src/) ARE traced into the deployed bundle
// by Vercel's function builder, disproving the premise this file used to
// carry ("does not trace relative imports"). This was the first of the 3 AI
// gates without server-side authority; see resolveAuthoritativeTaskGates
// below for where the fix actually happens.
import { hasJsonContentType, verifyRequestUser, hasActiveLink } from './_lib/auth.js';
import {
  resolveUserEntitlements, countSessionsThisWeek, isSessionsPerWeekCapReached,
  resolveAuthoritativeTaskGates,
} from './_lib/entitlements.js';
import { emitAIUsageEvent } from './_lib/aiTelemetry.js';

// ─── Inlined types (from src/ai/types.ts + src/types/coach-dna.ts) ────────────

type CoachArchetype = 'performance' | 'technician' | 'motivator' | 'guide' | 'drill' | 'movement';
type AITask = 'generate_workout' | 'suggest_objectives' | 'daily_insight';

interface TrainerContext {
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

interface ClientContext {
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
  trainabilityTier?:   string | undefined;
  priorityGoal?:       string | undefined;
  intensityCeiling?:   string | undefined;
  progressionRate?:    string | undefined;
  safetyFlags?:        string[] | undefined;
  aiNotes?:            string | undefined;
}

interface TodayContext {
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

interface StatsContext {
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
    // Real ATL/CTL/TSB-derived load scores (Fase 5.1) — see src/ai/types.ts.
    acuteLoad:            number;
    trainingForm:         number;
    trainingStrain:       number;
  };
}

interface LibraryContext {
  excludedRegions:    string[];
  favoriteExercises:  string[];
  avoidExercises:     string[];
  equipmentAvailable: string[];
}

interface TaskContext {
  type:                AITask;
  durationMin?:        number | undefined;
  focusOverride?:      string | undefined;
  extraInstructions?:  string | undefined;
  maxExercises?:       number | undefined; // plan gate: max exercises per session (already read below; was missing from this type)
  fitnessOnly?:        boolean;            // plan gate: exclude performance exercises (already read below; was missing from this type)
  // ai.checkin_adjustment gate: false disables daily calibration by
  // energy/sleep/fatigue only. Never gates a safety signal — pain and Safety
  // Gate reach the prompt regardless, for every tier. Defaults to true.
  adjustmentAllowed?:  boolean;
}

// Version history (docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md Fase 1,
// directive §6.3 "version AI response schemas alongside prompt versions"):
//   1.0 — original contract (no per-exercise `category`)
//   1.1 — WorkoutExercise gained `category: 'fitness'|'performance'|'mobility'`
//         (optional on input — the model may omit it; see enforceExerciseTypePolicy)
type ContextVersion = '1.0' | '1.1';

interface AIContext {
  trainer:        TrainerContext;
  client:         ClientContext;
  today:          TodayContext;
  stats:          StatsContext;
  library:        LibraryContext;
  task:           TaskContext;
  locale:         string;
  contextVersion: ContextVersion;
  builtAt:        string;
}

interface SmartWorkout {
  title:           string;
  format:          string;
  totalDurationMin: number;
  coachNote:       string;
  adaptations:     string[];
  phases:          WorkoutPhase[];
}

interface WorkoutPhase {
  phase:       string;
  label:       string;
  durationMin: number;
  exercises:   WorkoutExercise[];
}

// 'fitness' | 'performance' | 'mobility' — same three categories and
// definitions as api/classify-exercises.ts (mirrored, not imported: api/*
// handlers are self-contained, the Vercel function builder does not trace
// relative imports outside each handler). Optional on the wire: older
// responses and any model call that omits the field must not break parsing
// (docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md Fase 1).
type ExerciseTypeCategory = 'fitness' | 'performance' | 'mobility';

interface WorkoutExercise {
  name:            string;
  muscleGroup:     string;
  sets:            number;
  reps:            string | null;
  durationSeconds: number | null;
  load:            string;
  restSeconds:     number;
  cue:              string;
  safetyNote?:      string | undefined;
  category?:        ExerciseTypeCategory | undefined;
}

// ── Time budget enforcement ───────────────────────────────────────────────────
// Same model and band as generate-workout.ts and the client-side estimators
// (StartWorkoutScreen, WorkoutPlanEditorScreen). Duplicated rather than shared
// because api/* files must stay self-contained (see header note).
const FILL_FLOOR      = 0.9;
const FILL_CEILING    = 1.1;
const MAX_PADDED_SETS = 5;
// Only the working blocks absorb time fitting; preparation (mobility, warmup,
// technique) and cooldown are prescriptive and are never trimmed or inflated.
// Same vocabulary as src/lib/sessionStructure.ts and generate-workout.ts —
// duplicated because api/* handlers must stay self-contained.
// 'main' is the pre-2026-07-31 value and is kept so older phase labels still
// resolve to a working block instead of being treated as prescriptive.
const ADJUSTABLE_PHASES = new Set(['strength', 'conditioning', 'main']);

// Canonical session vocabulary — mirrors src/lib/sessionStructure.ts and
// generate-workout.ts. Duplicated because api/* handlers must stay
// self-contained (Vercel's function builder does not trace relative imports).
const SESSION_BLOCKS = ['mobility', 'warmup', 'technique', 'strength', 'conditioning', 'cooldown'];
const KNOWN_BLOCKS   = new Set<string>(SESSION_BLOCKS);
const DEFAULT_SESSION_ORDER = ['warmup', 'strength', 'conditioning', 'cooldown'];

/** Keeps only known blocks, preserving the trainer's declared order. */
function sanitizeSessionOrder(order: readonly string[] | undefined): string[] {
  if (!order?.length) return DEFAULT_SESSION_ORDER;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of order) {
    const key = String(raw ?? '').toLowerCase().trim();
    if (KNOWN_BLOCKS.has(key) && !seen.has(key)) { seen.add(key); cleaned.push(key); }
  }
  return cleaned.length ? cleaned : DEFAULT_SESSION_ORDER;
}

function exerciseMinutes(e: WorkoutExercise): number {
  const sets   = e.sets ?? 1;
  const active = e.durationSeconds ?? 40;
  const rest   = e.restSeconds ?? 30;
  return (sets * (active + rest)) / 60;
}

const workoutMinutes = (phases: WorkoutPhase[]): number =>
  phases.reduce((acc, p) => acc + (p.exercises ?? []).reduce((a, e) => a + exerciseMinutes(e), 0), 0);

/**
 * Makes the generated session actually occupy the client's available time.
 * The prompt states the target, but an LLM cannot be trusted to do the
 * arithmetic (measured 86-146% on the trainer endpoint), so the band is
 * enforced here: overflow is trimmed from the working phases, a short session
 * is padded with sets on those same phases. Warmup/cooldown are left intact.
 */
function fitWorkoutToBudget(workout: SmartWorkout, targetMinutes: number) {
  const phases: WorkoutPhase[] = (workout.phases ?? [])
    .map(p => ({ ...p, exercises: [...(p.exercises ?? [])] }));
  const ceiling = targetMinutes * FILL_CEILING;
  const floor   = targetMinutes * FILL_FLOOR;

  let trimmed = 0;
  while (workoutMinutes(phases) > ceiling) {
    const working = phases.filter(p => p.exercises.length > 1 && ADJUSTABLE_PHASES.has(p.phase));
    const pool    = working.length ? working : phases.filter(p => p.exercises.length > 1);
    if (!pool.length) break;
    pool.sort((a, b) => b.exercises.length - a.exercises.length);
    pool[0]!.exercises.pop();
    trimmed++;
  }

  let paddedSets = 0;
  let progressed = true;
  while (workoutMinutes(phases) < floor && progressed) {
    progressed = false;
    for (const p of phases) {
      if (!ADJUSTABLE_PHASES.has(p.phase)) continue;
      for (const ex of p.exercises) {
        if (workoutMinutes(phases) >= floor) break;
        if ((ex.sets ?? 1) >= MAX_PADDED_SETS) continue;
        if (workoutMinutes(phases) + exerciseMinutes({ ...ex, sets: 1 }) > ceiling) continue;
        ex.sets = (ex.sets ?? 1) + 1;
        paddedSets++;
        progressed = true;
      }
    }
  }

  // Keep the session's own declared durations consistent with what it contains.
  for (const p of phases) {
    p.durationMin = Math.round(p.exercises.reduce((a, e) => a + exerciseMinutes(e), 0));
  }

  return {
    workout: { ...workout, phases, totalDurationMin: Math.round(workoutMinutes(phases)) },
    trimmed,
    paddedSets,
  };
}

// ── Exercise-type policy (docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md) ──
// Fase 1: shadow mode only — computes and reports violations, never mutates
// the workout. Fase 2 activates cutting for the count dimension only (see
// cutExerciseCount below); category stays shadow-only until Fase 3.
export interface ExerciseTypeViolation {
  kind:         'category' | 'count' | 'missing-performance';
  exerciseName?: string;
  phase?:        string;
  detail:        string;
}

export interface ExerciseTypePolicyReport {
  violations:          ExerciseTypeViolation[];
  totalExercises:      number;
  missingCategoryCount: number;
}

// `requirePerformance` (Fase 5, level (a) — decided 2026-08-03: direct +
// detect + log, no retry) is the same policy inverted, not a parallel
// mechanism (§4.5): free/ai_fitness exclude category=performance under
// fitnessOnly (below); ai_performance instead expects at least one, when
// requiresPerformanceContent() said the context calls for it. Detection
// only — nothing here mutates the workout or retries the call.
export function enforceExerciseTypePolicy(
  workout: SmartWorkout | undefined,
  task: Pick<TaskContext, 'fitnessOnly' | 'maxExercises'>,
  requirePerformance = false,
): ExerciseTypePolicyReport {
  const violations: ExerciseTypeViolation[] = [];
  let totalExercises = 0;
  let missingCategoryCount = 0;
  let performanceCount = 0;

  for (const phase of workout?.phases ?? []) {
    for (const ex of phase.exercises ?? []) {
      totalExercises++;
      if (ex.category == null) {
        missingCategoryCount++;
        continue;
      }
      if (ex.category === 'performance') performanceCount++;
      if (task.fitnessOnly && ex.category === 'performance') {
        violations.push({
          kind: 'category', exerciseName: ex.name, phase: phase.phase,
          detail: `"${ex.name}" is category=performance but task.fitnessOnly is true`,
        });
      }
    }
  }

  if (task.maxExercises != null && totalExercises > task.maxExercises) {
    violations.push({
      kind: 'count',
      detail: `workout has ${totalExercises} exercises, task.maxExercises=${task.maxExercises}`,
    });
  }

  if (requirePerformance && totalExercises > 0 && performanceCount === 0) {
    violations.push({
      kind: 'missing-performance',
      detail: `context signals called for performance content but 0/${totalExercises} exercises are category=performance`,
    });
  }

  return { violations, totalExercises, missingCategoryCount };
}

// Fase 2: whole-block removal order for the "insatisfazível" collision (cap <
// number of declared blocks, so even 1 exercise per block still exceeds it).
// Deliberately NOT a mechanical reversal of SESSION_BLOCKS: technique
// (movement-pattern practice) is sacrificed before strength (the primary
// training stimulus) — matches the plan's own example ("cooldown →
// conditioning → technique → …"). warmup is never in this list: injury
// prevention is the last thing sacrificed, same priority already used in the
// local fallback generator.
const BLOCK_REMOVAL_ORDER = ['cooldown', 'conditioning', 'technique', 'strength', 'mobility'];

/**
 * Fase 2 of docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md — activates the
 * count dimension of the policy above: cuts a generated workout down to
 * task.maxExercises. Runs once, before fitWorkoutToBudget, so time fitting
 * works on the already-cut set and is the last step — no re-execution.
 *
 * Two-step precedence: first trim exercises one at a time from the same
 * adjustable phases fitWorkoutToBudget trims (most populous first, never
 * below 1, warmup/cooldown untouched). If the cap still can't be met once
 * every phase is down to 1 exercise, remove whole blocks per
 * BLOCK_REMOVAL_ORDER — warmup can never be removed.
 */
export function cutExerciseCount(workout: SmartWorkout, maxExercises: number) {
  const phases: WorkoutPhase[] = (workout.phases ?? [])
    .map(p => ({ ...p, exercises: [...(p.exercises ?? [])] }));

  const total = () => phases.reduce((sum, p) => sum + p.exercises.length, 0);

  let removedExercises = 0;
  while (total() > maxExercises) {
    const working = phases.filter(p => p.exercises.length > 1 && ADJUSTABLE_PHASES.has(p.phase));
    const pool    = working.length
      ? working
      : phases.filter(p => p.exercises.length > 1 && p.phase !== 'warmup' && p.phase !== 'cooldown');
    if (!pool.length) break; // every phase is down to 1 exercise (or is warmup/cooldown) — block removal below
    pool.sort((a, b) => b.exercises.length - a.exercises.length);
    pool[0]!.exercises.pop();
    removedExercises++;
  }

  const removedBlocks: string[] = [];
  if (total() > maxExercises) {
    for (const blockName of BLOCK_REMOVAL_ORDER) {
      if (total() <= maxExercises) break;
      const idx = phases.findIndex(p => p.phase === blockName);
      if (idx < 0) continue;
      removedExercises += phases[idx]!.exercises.length;
      removedBlocks.push(blockName);
      phases.splice(idx, 1);
    }
  }

  return {
    workout: { ...workout, phases },
    removedExercises,
    removedBlocks,
  };
}

// Fase 3: secondary safety net, consulted only when the model omits
// `category` — never overrides an explicit classification. Names return in
// the client's own locale (buildSystemPrompt), so this only catches literal
// keyword matches — mostly English-locale clients. Documented residual risk,
// not a primary mechanism (docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md
// Fase 3, "Limite real da rede secundária").
//
// Resolves a wording gap in the plan itself: its enumerated deny-list uses
// three narrow "X jump" phrases (box/broad/depth jump), yet it also calls
// for an allowlist exception on "Jumping Jacks" — which matches none of
// those three phrases. The only deny-list shape consistent with both is a
// bare "jump" token (catching box/broad/depth/squat/tuck jump generically),
// so that is what is implemented here, with the allowlist exception it implies.
const DENY_LIST_PATTERNS  = ['sprint', 'plyo', 'agility', 'shuttle', 'sled', 'snatch', 'clean & jerk', 'jump'];
const DENY_LIST_ALLOWLIST = new Set(['jumping jacks']);

function looksLikePerformanceByName(name: string): boolean {
  const lower = name.toLowerCase();
  if (DENY_LIST_ALLOWLIST.has(lower)) return false;
  return DENY_LIST_PATTERNS.some(p => lower.includes(p));
}

export interface CategoryFilterReport {
  removedExercises:     { name: string; phase: string; reason: 'category' | 'name-heuristic' }[];
  forcedNonEmptyPhases: string[];
}

/**
 * Fase 3 of docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md — activates the
 * category dimension of the policy: under fitnessOnly, removes (never
 * substitutes — api/* cannot import a replacement library, and inventing one
 * without equipment/injury context would be worse than removing) every
 * exercise classified or heuristically detected as performance. Never empties
 * a phase: if every exercise in a block would be removed, the first one (in
 * the model's own returned order) is kept and reported instead — degrading
 * content is acceptable, delivering a session with no work block is not.
 * Runs after cutExerciseCount and before fitWorkoutToBudget, so time fitting
 * stays the single last step.
 */
export function enforceCategoryFilter(
  workout: SmartWorkout,
  fitnessOnly: boolean,
): { workout: SmartWorkout; report: CategoryFilterReport } {
  const report: CategoryFilterReport = { removedExercises: [], forcedNonEmptyPhases: [] };
  if (!fitnessOnly) return { workout, report };

  const isPerformance = (ex: WorkoutExercise) =>
    ex.category === 'performance' || (ex.category == null && looksLikePerformanceByName(ex.name));

  const phases: WorkoutPhase[] = (workout.phases ?? []).map(p => {
    const original = p.exercises ?? [];
    let kept = original.filter(ex => !isPerformance(ex));

    if (kept.length === 0 && original.length > 0) {
      report.forcedNonEmptyPhases.push(p.phase);
      kept = [original[0]!];
    }

    for (const ex of original) {
      if (!kept.includes(ex)) {
        report.removedExercises.push({
          name: ex.name, phase: p.phase,
          reason: ex.category === 'performance' ? 'category' : 'name-heuristic',
        });
      }
    }

    return { ...p, exercises: kept };
  });

  return { workout: { ...workout, phases }, report };
}

interface DailyInsight {
  title:    string;
  body:     string;
  action?:  string | undefined;
  tone:     string;
}

type SmartWorkoutRequest = {
  trainer: TrainerContext;
  client:  ClientContext;
  today:   TodayContext;
  stats:   StatsContext;
  library: LibraryContext;
  task:    TaskContext;
  locale:  string;
};

interface SmartWorkoutResponse {
  workout?:    SmartWorkout    | undefined;
  objectives?: { analysis: string; objectives: { type: string; title: string; rationale: string; metrics: string; priority: string; timeframe: string }[]; adjustments: { aspect: string; current: string; suggested: string; reason: string }[] } | undefined;
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

// ─── Inlined prompt builder (from src/ai/buildPrompt.ts) ──────────────────────

const LOCALE_TO_LANG: Record<string, string> = {
  'en': 'English', 'en-US': 'English', 'en-GB': 'English',
  'pt': 'Portuguese (Brazil)', 'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)',
  'es': 'Spanish', 'es-ES': 'Spanish', 'es-MX': 'Spanish (Mexico)',
  'de': 'German', 'de-DE': 'German',
};

function buildSystemPrompt(task: TaskContext['type'], locale: string, isAutonomous: boolean): string {
  const lang = LOCALE_TO_LANG[locale] ?? locale ?? 'English';
  const base = `You are an AI personal training assistant for TrAIner, a professional fitness coaching platform.
You receive structured context about ${isAutonomous ? 'the client (profile + history), today\'s readiness (check-in), performance statistics, and exercise constraints' : 'the trainer (Coach DNA), the client (profile + history), today\'s readiness (check-in), performance statistics, and an exercise library'}.
${isAutonomous ? 'This client trains autonomously — there is no trainer profile. Base your recommendations solely on the client\'s profile, goals, preferences, health context, and readiness data.' : ''}
Rules:
- Always honour safety: if safetyStatus is "blocked", refuse to generate a workout and return a safety note instead.
- Never expose raw sensitive fields in public-facing output. However, ALL data in the input context is available for personalisation — use body_rhythm, sensitive_factors, comorbidities, habits, and abandon_history to inform exercise selection, intensity, format, and safety decisions.
${isAutonomous ? '- Since there is no trainer, generate a plan consistent with the client\'s stated goals, intensity preference, training focus, and fitness level. Use an encouraging, evidence-based coaching voice.' : '- Match the trainer\'s archetype, coaching style, and communication tone.'}
- Respect equipment and location constraints exactly — never prescribe equipment not listed.
- Honour the trainer's avoidExercises and client's injury/pain restrictions.
- Adapt intensity based on readinessScore, fatigueRisk, and intensityCeiling.
- If training_form is low (below 40) or training_strain is high (70+), the client is carrying real accumulated fatigue from recent sessions — reduce this session's volume and/or intensity accordingly, even if today's check-in looks fine. Say so plainly in coachNote/adaptations as something you adjusted, not as a warning for the client to act on themselves.
- For rep-based exercises, set "reps" to a plain count (e.g. "10" or "8-12") and leave "durationSeconds" null.
- For isometric, breathing, or hold-based exercises (e.g. plank, neck rotations, diaphragmatic breathing) that have no meaningful rep count, set "reps" to null and set "durationSeconds" to the hold/execution time in seconds instead. Every exercise MUST have either "reps" or "durationSeconds" set — never both null.
- SESSION STRUCTURE: a workout is a complete session, not a list of lifts. The user message states
  the exact block sequence for this session — follow it, in that order, and tag every phase with
  the block it belongs to in "phase". Block meanings:
    mobility     — joint preparation and range of motion
    warmup       — raising temperature and heart rate, progressive activation
    technique    — motor pattern work at low load, before the heavy sets
    strength     — the main resistance block
    conditioning — metabolic or endurance work
    cooldown     — recovery, stretching, breathing, low-intensity return
  Every declared block must appear as a phase with at least one exercise, and no block outside
  the declared sequence may be added. Preparation and recovery blocks belong to the time budget
  like any other exercise, so account for them in the arithmetic. As a default split, allow
  roughly 15-25% of the session for the preparation blocks (mobility/warmup/technique) and
  10-15% for the cool-down, adjusted to goal, energy and soreness.
- Respond in ${lang}. All workout titles, coach notes, exercise cues, descriptions, and adaptation notes MUST be written in ${lang}. Never mix languages.
- Return ONLY valid JSON matching the required output shape — no markdown fences, no commentary.
- For "generate_workout" only: classify every exercise into exactly one "category":
  - fitness: general strength, hypertrophy, endurance, flexibility, mobility, and health-oriented exercises
    (e.g. Squat, Bench Press, Deadlift, Plank, Row, Bicep Curl, Yoga stretch, Swimming laps)
  - performance: sport-specific, power, speed, agility, and athletic development exercises
    (e.g. Sprint, Box Jump, Olympic lifts, ATL/CTL training, Plyometrics, Agility ladder, Throw)
  - mobility: dedicated range-of-motion, stretching, and joint health exercises
    (e.g. Hip flexor stretch, Foam roll, PNF stretch, Thoracic rotation, Joint circles)
  When in doubt between fitness and performance, choose fitness. Compound movements like Squat or
  Deadlift are fitness unless explicitly athletic/power-focused.`;

  const shapes: Record<typeof task, string> = {
    generate_workout: `
Output shape:
{
  "workout": {
    "title": "string",
    "format": "string",
    "totalDurationMin": number,
    "coachNote": "string — 1-2 sentences in the trainer's voice",
    "adaptations": ["string — each adaptation made for today's readiness"],
    "phases": [
      {
        "phase": "mobility|warmup|technique|strength|conditioning|cooldown",
        "label": "string",
        "durationMin": number,
        "exercises": [
          {
            "name": "string",
            "muscleGroup": "string",
            "sets": number,
            "reps": "string | null — plain rep count, e.g. '10' or '8-12'; null for hold/duration-based exercises",
            "durationSeconds": "number | null — hold/execution time in seconds for isometric or breathing exercises; null when reps is set",
            "load": "string — e.g. 'bodyweight', '60% 1RM', 'light'",
            "restSeconds": number,
            "cue": "string — 1 coaching cue in trainer's tone",
            "safetyNote": "string | omit if not needed",
            "category": "fitness|performance|mobility — see the classification rule above"
          }
        ]
      }
    ]
  },
  "usage": { "input_tokens": 0, "output_tokens": 0 },
  "context_snapshot": { "readinessScore": 0, "safetyStatus": "string", "adaptations": [] }
}`,

    suggest_objectives: `
Output shape:
{
  "objectives": {
    "analysis": "string — 2-3 sentences clinical analysis",
    "objectives": [
      {
        "type": "short_term|medium_term|long_term",
        "title": "string",
        "rationale": "string",
        "metrics": "string — measurable success criteria",
        "priority": "high|medium|low",
        "timeframe": "string — e.g. '4 weeks'"
      }
    ],
    "adjustments": [
      {
        "aspect": "string",
        "current": "string",
        "suggested": "string",
        "reason": "string"
      }
    ]
  },
  "usage": { "input_tokens": 0, "output_tokens": 0 },
  "context_snapshot": { "readinessScore": 0, "safetyStatus": "string", "adaptations": [] }
}`,

    daily_insight: `
Output shape:
{
  "insight": {
    "title": "string — short headline",
    "body": "string — 2-3 sentences in trainer's voice",
    "action": "string | omit if not actionable",
    "tone": "motivational|clinical|empathetic|direct"
  },
  "usage": { "input_tokens": 0, "output_tokens": 0 },
  "context_snapshot": { "readinessScore": 0, "safetyStatus": "string", "adaptations": [] }
}`,
  };

  return base + shapes[task];
}

// Fase 5 of docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md — same signals
// Fases 0-3 already read, inverted: instead of excluding performance content,
// decide whether the context calls for requiring some. Not read from a
// license flag — task.fitnessOnly=false (ai_performance, and any autonomous
// default) is necessary but not sufficient; a neutral trainer/client profile
// should not be steered into performance content it never asked for (the
// Findings' own neutral-trainer control delivered 0/3 performance content,
// which is the correct baseline, not a defect).
//
// Safety floor is checked first and is absolute: no combination of other
// signals overrides it (§4.1 — content may degrade, safety may not).
export function requiresPerformanceContent(ctx: AIContext, isAutonomous: boolean): boolean {
  const { trainer, client, today, task } = ctx;

  if (task.fitnessOnly) return false; // mutually exclusive with the exclude-side of the policy
  if (today.aiLedBlocked || today.safetyStatus === 'blocked') return false;
  if (today.painPresent) return false;
  if (today.readinessScore < 50) return false;

  if (isAutonomous) {
    // No Coach DNA reaches the prompt for this client (buildUserPrompt's own
    // `if (!isAutonomous)` gate below) — fall back to the client's own
    // profile signals, which are always present.
    const focus     = (client.trainingFocus ?? '').toLowerCase();
    const intensity = (client.preferenceIntensity ?? '').toLowerCase();
    const level     = (client.fitnessLevel ?? '').toLowerCase();
    return focus.includes('athletic') || focus.includes('performance') || focus.includes('sport')
      || (intensity === 'high' && level !== 'beginner');
  }

  return trainer.archetype === 'performance'
    || trainer.focus.athletic >= 7
    || trainer.intensity === 'high';
}

function buildUserPrompt(ctx: AIContext): string {
  const { trainer, client, today, stats, library, task } = ctx;

  const lines: string[] = [];

  const isAutonomous = trainer.id === 'ai-coach';

  if (!isAutonomous) {
    lines.push('## TRAINER PROFILE (Coach DNA)');
    lines.push(`Archetype: ${trainer.archetype}`);
    lines.push(`Name: ${trainer.name}`);
    lines.push(`Coaching style: ${trainer.coachingStyles.join(', ') || 'not specified'}`);
    lines.push(`Core values: ${trainer.coreValues.join(', ') || 'not specified'}`);
    if (trainer.motto) lines.push(`Motto: "${trainer.motto}"`);
    if (trainer.coachVoice) lines.push(`Coach voice: ${trainer.coachVoice}`);
    lines.push(`Methods: ${trainer.methods.join(', ') || 'not specified'}`);
    lines.push(`Preferred environments: ${trainer.environments.join(', ') || 'not specified'}`);
    lines.push(`Typical intensity: ${trainer.intensity || 'not specified'}`);
    lines.push(`Focus emphasis (0-10): strength=${trainer.focus.strength}, endurance=${trainer.focus.endurance}, mobility=${trainer.focus.mobility}, athletic=${trainer.focus.athletic}, coord=${trainer.focus.coord}, balance=${trainer.focus.balance}`);
    lines.push(`Preferred session formats: ${trainer.preferredFormats.join(', ') || 'not specified'}`);
    // Sanitized so this descriptive line can never disagree with the binding
    // sequence in the SESSION STRUCTURE section below.
    lines.push(`Session order: ${sanitizeSessionOrder(trainer.sessionOrder).join(' \u2192 ')}`);
    lines.push(`Intensity curve: ${trainer.intensityCurve || 'not specified'}`);
    lines.push(`Communication tone: ${trainer.communicationTone.join(', ') || 'not specified'}`);
    if (trainer.favoriteExercises.length > 0) {
      // Under fitnessOnly the plan limit must win over any conflicting
      // favourite — labelling this as a subordinate preference here, paired
      // with the precedence sentence on the PLAN LIMIT line below, is what
      // makes that an explicit hierarchy instead of two directives of equal
      // weight left for the model to arbitrate on its own
      // (docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md, Fase 0).
      const favouritesLabel = task.fitnessOnly
        ? 'Trainer favourite exercises (secondary preference — the PLAN LIMIT below overrides any of these it conflicts with)'
        : 'Trainer favourite exercises';
      lines.push(`${favouritesLabel}: ${trainer.favoriteExercises.slice(0, 10).join(', ')}`);
    }
    if (trainer.avoidExercises.length > 0)
      lines.push(`Trainer avoid exercises: ${trainer.avoidExercises.slice(0, 10).join(', ')}`);
    lines.push('');
  }

  lines.push('## CLIENT PROFILE');
  lines.push(`Name: ${client.name}`);
  if (client.age)              lines.push(`Age: ${client.age}`);
  if (client.biologicalSex)    lines.push(`Biological sex: ${client.biologicalSex}`);
  if (client.heightCm)         lines.push(`Height: ${client.heightCm} cm`);
  if (client.weightKg)         lines.push(`Weight: ${client.weightKg} kg`);
  lines.push(`Fitness level: ${client.fitnessLevel}`);
  lines.push(`Primary goal: ${client.primaryGoal}`);
  if (client.secondaryGoals.length > 0)
    lines.push(`Secondary goals: ${client.secondaryGoals.join(', ')}`);
  if (client.voiceNote)        lines.push(`Goal voice note: "${client.voiceNote}"`);
  lines.push(`Training frequency: ${client.daysPerWeek}x/week, ${client.sessionDuration} min/session`);
  lines.push(`Preferred time: ${client.preferredTime}`);
  if (client.preferredDays?.length) {
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    lines.push(`Preferred days: ${client.preferredDays.map(d => dayNames[d] ?? d).join(', ')}`);
  }
  if (client.adherenceBarriers?.length)
    lines.push(`Adherence barriers: ${client.adherenceBarriers.join(', ')}`);
  lines.push(`Modalities: ${client.modalities.join(', ') || 'not specified'}`);
  lines.push(`Intensity preference: ${client.preferenceIntensity}`);
  lines.push(`Explanation level: ${client.explanationLevel}`);
  lines.push(`Training focus: ${client.trainingFocus}`);
  if (client.preferredLanguage) lines.push(`Communication style: ${client.preferredLanguage}`);
  if (client.company)           lines.push(`Training company: ${client.company}`);
  if (client.supportLevel)      lines.push(`Support preference: ${client.supportLevel}`);
  if (client.mobilityLevel)     lines.push(`Mobility: ${client.mobilityLevel}`);
  if (client.balanceLevel)      lines.push(`Balance: ${client.balanceLevel}`);
  if (client.autonomyLevel)     lines.push(`Autonomy: ${client.autonomyLevel}`);
  if (client.effortTolerance)   lines.push(`Effort tolerance: ${client.effortTolerance}`);
  if (client.baselinePainLevel && client.baselinePainLevel !== 'none')
    lines.push(`Baseline pain: ${client.baselinePainLevel}`);
  if (client.supportResources?.length)
    lines.push(`Support resources: ${client.supportResources.join(', ')}`);
  if (client.instructionFormat?.length)
    lines.push(`Instruction format: ${client.instructionFormat.join(', ')}`);
  if (client.accessibility?.length)
    lines.push(`Accessibility needs: ${client.accessibility.join(', ')}`);
  if (client.accessLevel)       lines.push(`Access level: ${client.accessLevel}`);
  if (client.hasHealthCondition && client.healthCategories.length > 0)
    lines.push(`Health categories: ${client.healthCategories.join(', ')}`);
  if (client.healthFreeText)  lines.push(`Health notes: "${client.healthFreeText}"`);
  if (client.healthVoiceNote) lines.push(`Health voice note: "${client.healthVoiceNote}"`);
  if (client.comorbidities.length > 0)
    lines.push(`Comorbidities: ${client.comorbidities.join(', ')}`);
  if (client.comorbiditiesNote) lines.push(`Comorbidities note: "${client.comorbiditiesNote}"`);
  if (client.lifestyleBarriers?.length)
    lines.push(`Lifestyle barriers: ${client.lifestyleBarriers.join(', ')}`);
  if (client.sensitiveFactors) {
    const sf = client.sensitiveFactors;
    lines.push('## SENSITIVE FACTORS (for personalization only — never displayed)');
    if (sf.regularMedications)  lines.push(`Regular medications: ${sf.regularMedications}`);
    if (sf.emotionalHistory)    lines.push('Emotional health history: declared');
    if (sf.recreationalSubstance) lines.push('Recreational substance use: declared');
    if (sf.voiceNote)           lines.push(`Sensitive note: "${sf.voiceNote}"`);
  }
  if (client.bodyRhythm?.enabled) {
    const br = client.bodyRhythm;
    lines.push('## MENSTRUAL CYCLE (for phase-aware training)');
    if (br.cycleDurationDays)   lines.push(`Cycle duration: ${br.cycleDurationDays} days`);
    if (br.cycleCurrentDay != null) lines.push(`Current cycle day: ${br.cycleCurrentDay}`);
    if (br.adaptationPreference?.length)
      lines.push(`Adaptation preferences: ${br.adaptationPreference.join(', ')}`);
  }
  if (client.abandonHistory) {
    const ah = client.abandonHistory;
    lines.push('## TRAINING HISTORY CONTEXT');
    if (ah.reasons.length > 0) lines.push(`Previous abandon reasons: ${ah.reasons.join(', ')}`);
    if (ah.hadNegativeExperience)     lines.push('Had negative training experience: yes');
    if (ah.fearOfInjury)              lines.push('Fear of injury: yes');
    if (ah.feltGymConstraint)         lines.push('Felt constrained by gym environment: yes');
    if (ah.whatHelped)                lines.push(`What helped consistency: "${ah.whatHelped}"`);
    if (ah.whatDisrupted)             lines.push(`What disrupted routine: "${ah.whatDisrupted}"`);
    if (ah.voiceNote)                 lines.push(`Abandon voice note: "${ah.voiceNote}"`);
  }
  if (client.consentAiAdaptation !== undefined)
    lines.push(`AI adaptation consent: ${client.consentAiAdaptation ? 'granted' : 'not granted'}`);
  lines.push(`Risk level: ${client.riskLevel}`);
  if (client.riskFlags.length > 0) lines.push(`Risk flags: ${client.riskFlags.join(', ')}`);
  if (client.trainabilityTier)  lines.push(`Trainability tier: ${client.trainabilityTier}`);
  if (client.intensityCeiling)  lines.push(`Intensity ceiling: ${client.intensityCeiling}`);
  if (client.progressionRate)   lines.push(`Progression rate: ${client.progressionRate}`);
  if (client.safetyFlags?.length) lines.push(`Safety flags: ${client.safetyFlags.join(', ')}`);
  if (client.aiNotes)           lines.push(`AI notes: ${client.aiNotes}`);
  lines.push('');

  lines.push("## TODAY'S READINESS (Check-in)");
  lines.push(`Check-in type: ${today.variant}`);
  // Calibration by today's energy/sleep/fatigue is gated by
  // ai.checkin_adjustment (a plan feature); safety signals below are not
  // gated by any plan and always reach the prompt (docs/
  // WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md Fase 0 — a commercial tier must
  // never be able to turn off pain/Safety Gate awareness).
  const adjustmentAllowed = task.adjustmentAllowed !== false;
  if (adjustmentAllowed) {
    lines.push(`Readiness score: ${today.readinessScore}/100`);
    lines.push(`Energy: ${today.energyLevel}/10`);
    lines.push(`Sleep quality: ${today.sleepQuality}${today.sleepHours ? ` (${today.sleepHours}h)` : ''}`);
    lines.push(`Fatigue: ${today.fatigueLevel}/10${today.fatigueType ? ` — type: ${today.fatigueType}` : ''}`);
    if (today.emotionalState) lines.push(`Emotional state: ${today.emotionalState}`);
  } else {
    lines.push('Daily calibration: not available on this plan — generate at a moderate, general-population intensity, not adapted to today\'s energy/sleep/fatigue.');
  }
  lines.push(`Pain present: ${today.painPresent ? `yes — intensity ${today.painIntensity}/10${today.painRegions.length ? ', regions: ' + today.painRegions.join(', ') : ''}` : 'no'}`);
  lines.push(`Safety gate: ${today.safetyStatus}${today.safetySignals.length ? ` (signals: ${today.safetySignals.join(', ')})` : ''}`);
  lines.push(`AI-led session blocked: ${today.aiLedBlocked}`);
  lines.push(`Available time: ${today.availableMinutes} min`);
  lines.push(`Location today: ${today.location}`);
  if (today.equipmentToday?.length)
    lines.push(`Equipment today: ${today.equipmentToday.join(', ')}`);
  if (today.cycleActive) {
    lines.push(`Menstrual cycle: active${today.cyclePhase ? ` — phase: ${today.cyclePhase}` : ''}`);
    if (today.cycleAdaptation) lines.push(`Cycle adaptation request: ${today.cycleAdaptation}`);
  }
  lines.push('');

  lines.push('## PERFORMANCE STATISTICS');
  lines.push(`Adherence rate: ${stats.adherenceRate}%`);
  lines.push(`Current streak: ${stats.workoutStreak} sessions`);
  lines.push(`Sessions last 30d: ${stats.sessionsLast30d}`);
  lines.push(`Avg energy (7d): ${stats.avgEnergy7d}/10`);
  lines.push(`Avg readiness (7d): ${stats.avgReadiness7d}`);
  if (stats.avgRPELast3 > 0) lines.push(`Avg RPE (last 3): ${stats.avgRPELast3}/10`);
  lines.push(`Pain events (14d): ${stats.painEvents14d}${stats.primaryPainRegion ? ` — primary region: ${stats.primaryPainRegion}` : ''}`);
  if (stats.painRecurrenceAlert) lines.push('\u26a0 Pain recurrence alert: yes');
  lines.push(`Predictive scores (0-100): progression_readiness=${stats.predictiveScores.progressionReadiness}, fatigue_risk=${stats.predictiveScores.fatigueRisk}, pain_recurrence=${stats.predictiveScores.painRecurrence}, session_completion=${stats.predictiveScores.sessionCompletion}, plan_fit=${stats.predictiveScores.planFit}`);
  // Real ATL/CTL/TSB-derived load (Fase 5.1): low training_form or high
  // training_strain means the accumulated load from prior sessions — including
  // ones this same AI prescribed — is high. Autonomous sessions must self-
  // regulate on this signal now, not just report it after the fact.
  lines.push(`Training load (0-100, low = more fatigue): acute_load=${stats.predictiveScores.acuteLoad}, training_form=${stats.predictiveScores.trainingForm}, training_strain=${stats.predictiveScores.trainingStrain}`);
  lines.push('');

  lines.push('## EXERCISE CONSTRAINTS');
  lines.push(`Equipment available: ${library.equipmentAvailable.join(', ') || 'bodyweight only'}`);
  if (library.excludedRegions.length > 0)
    lines.push(`Excluded body regions (injury/pain): ${library.excludedRegions.join(', ')}`);
  if (library.favoriteExercises.length > 0)
    lines.push(`Preferred exercises: ${library.favoriteExercises.slice(0, 8).join(', ')}`);
  if (library.avoidExercises.length > 0)
    lines.push(`Exercises to avoid: ${library.avoidExercises.slice(0, 8).join(', ')}`);
  lines.push('');

  lines.push('## TASK');
  const taskLabel: Record<string, string> = {
    generate_workout:    'Generate a smart workout',
    suggest_objectives:  'Suggest training objectives',
    daily_insight:       'Generate a daily insight',
  };
  lines.push(taskLabel[task.type] ?? task.type);
  if (task.durationMin)       lines.push(`Target duration: ${task.durationMin} min`);
  if (task.focusOverride)     lines.push(`Focus override: ${task.focusOverride}`);
  if (task.extraInstructions) lines.push(`Additional instructions: ${task.extraInstructions}`);
  if (task.maxExercises)      lines.push(`PLAN LIMIT — max exercises this session: ${task.maxExercises}. Do not exceed this number.`);
  if (task.fitnessOnly)       lines.push(`PLAN LIMIT — fitness exercises only. Do NOT include performance, sport-specific, or high-intensity power exercises. Keep all exercises in the general fitness / hypertrophy / endurance categories. This limit takes precedence over the trainer's favourite exercises listed above — skip any favourite that falls into a restricted category rather than including it anyway.`);
  // Fase 5 (docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md) — the same policy,
  // inverted direction: the profile above already reads as athletic/high-
  // intensity, so ask for genuine performance content instead of merely
  // allowing it. Never fires alongside the PLAN LIMIT line above (mutually
  // exclusive by construction in requiresPerformanceContent).
  if (requiresPerformanceContent(ctx, isAutonomous))
    lines.push('PLAN FOCUS — this profile calls for genuine sport-specific/athletic training. Include at least one performance-category exercise (explosive, powerful, speed, or sport-specific movement) alongside any general fitness work, unless doing so would conflict with a safety instruction above.');

  // Sessions were coming back at 55-80% of the client's window (measured live),
  // because the prompt only stated the available time without a fill target or
  // the arithmetic to reach it. The response is still fitted server-side, but
  // padding sets cannot rescue a session that is structurally too short.
  // The trainer's declared structure is binding, not decorative. Before this
  // section the order reached the model only as one descriptive line inside the
  // Coach DNA dump, with nothing instructing the model to follow it — so a
  // linked client could receive a session ignoring the structure their trainer
  // configured. Autonomous clients fall back to DEFAULT_SESSION_ORDER.
  if (task.type === 'generate_workout') {
    const sessionOrder = sanitizeSessionOrder(trainer.sessionOrder);
    lines.push('');
    lines.push('## SESSION STRUCTURE');
    lines.push(
      isAutonomous
        ? `Block sequence for this session, to be followed in this order: ${sessionOrder.join(' → ')}.`
        : `This trainer's declared block sequence, to be followed in this order: ${sessionOrder.join(' → ')}.`,
    );
    lines.push(`Every one of those ${sessionOrder.length} blocks must appear as a phase with at least one exercise, in that order, and no other block may be added. Their time counts towards the target below.`);
  }

  if (task.type === 'generate_workout') {
    const budget = task.durationMin ?? today.availableMinutes;
    if (budget > 0) {
      lines.push('');
      lines.push('## TIME TARGET');
      lines.push(`The session must total ~90-110% of ${budget} minutes across ALL phases.`);
      lines.push('Compute it before answering: every set costs (active_seconds + rest_seconds), where active_seconds is 40 for a rep-based set or durationSeconds for a hold. An exercise costs sets x (active_seconds + rest_seconds). Sum that over every exercise in every phase.');
      lines.push(`Add exercises or sets until the sum reaches ${budget} minutes — a session that ends early wastes the client's stated time. Long rests (90-120s) mean fewer exercises, not a shorter session.`);
    }
  }

  return lines.join('\n');
}

// Exported as a test seam: the session-structure contract is a property of the
// prompt, so it is asserted directly instead of being inferred from a live
// generation. The handler remains the default export.
export function buildPrompt(ctx: AIContext): { system: string; user: string } {
  const isAutonomous = ctx.trainer.id === 'ai-coach';
  return {
    system: buildSystemPrompt(ctx.task.type, ctx.locale, isAutonomous),
    user:   buildUserPrompt(ctx),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

interface VercelRequest  { method?: string; body?: SmartWorkoutRequest; headers?: Record<string, string | string[] | undefined> }
interface VercelResponse {
  status(c: number): VercelResponse;
  json(b: unknown): VercelResponse;
  end(): void;
  setHeader(name: string, value: string): void;
}

declare const process: { env: Record<string, string | undefined> };

const MAX_TOKENS: Record<string, number> = {
  generate_workout:   2048,
  suggest_objectives: 1536,
  daily_insight:       512,
};

// The client context is intentionally rich, but no legitimate workout request
// should approach Vercel's multi-megabyte parser limit. Bound it before any
// entitlement, database or provider work so an authenticated caller cannot
// turn arbitrary JSON into prompt volume or backend load.
export const MAX_SMART_WORKOUT_REQUEST_CHARS = 128_000;
export function isSmartWorkoutRequestWithinLimit(value: unknown): boolean {
  try {
    return JSON.stringify(value).length <= MAX_SMART_WORKOUT_REQUEST_CHARS;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — required for Capacitor WebView and for local dev, where the client
  // (Vite, one origin) and this function (api-server.mjs, another port) are
  // cross-origin. Absent until 2026-08-01: every response this handler ever
  // sent lacked it, so any real browser call silently failed as a network
  // error (masked by StartWorkoutScreen's fallback-plan catch) — this endpoint
  // had, as far as can be determined, never been exercised from a real
  // browser. Same pattern as generate-workout.ts.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  // Caller must be the client themself, or a trainer actively linked to them.
  // ('ai-coach' autonomous sessions are always initiated by the client's device.)
  const caller = await verifyRequestUser(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });
  if (!hasJsonContentType(req)) return res.status(415).json({ error: 'Content-Type must be application/json' });
  if (!isSmartWorkoutRequestWithinLimit(body)) {
    return res.status(413).json({ error: 'Request exceeds maximum size' });
  }
  if (!body?.trainer || !body?.client || !body?.today || !body?.task) {
    return res.status(400).json({ error: 'trainer, client, today, and task are required' });
  }
  const isClientSelf = caller.id === body.client.id;
  const isLinkedTrainer = caller.id === body.trainer.id
    && body.trainer.id !== 'ai-coach'
    && await hasActiveLink(caller.id, body.client.id);
  if (!isClientSelf && !isLinkedTrainer) {
    return res.status(403).json({ error: 'Caller is not the client or their linked trainer' });
  }

  // ── Server-side authority for the AI generation gates (Fase 2 of
  // docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md, auditoria §3.1).
  // body.task.maxExercises/fitnessOnly are still accepted on the wire for
  // backward compatibility but are no longer trusted — resolveAuthoritativeTaskGates
  // below is what actually decides. Resolved against body.client.id: content
  // is always gated by the CLIENT's plan, whether the caller is the client
  // themself or their linked trainer generating on their behalf.
  const clientEntitlements = await resolveUserEntitlements(body.client.id);

  const sessionsThisWeek = await countSessionsThisWeek(body.client.id);
  if (isSessionsPerWeekCapReached(clientEntitlements, sessionsThisWeek)) {
    return res.status(403).json({
      error: 'sessions_per_week_limit_reached',
      limit: clientEntitlements['workout.sessions_per_week'].limitValue,
    });
  }

  const resolvedGates = resolveAuthoritativeTaskGates(clientEntitlements, body.task);
  if (resolvedGates.divergences.length > 0) {
    // Measurement window per the plan's checklist: log divergence for ~1
    // week before hardening further. Never blocks — cutExerciseCount /
    // enforceCategoryFilter below already enforce the resolved values
    // regardless of what the client claimed.
    console.warn(
      `[generate-smart-workout] client task diverges from server entitlements ` +
      `(${resolvedGates.divergences.join('; ')})`,
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
  }

  if (body.today.aiLedBlocked || body.today.safetyStatus === 'blocked') {
    const snapshot = {
      readinessScore: body.today.readinessScore,
      safetyStatus:   body.today.safetyStatus,
      adaptations:    ['AI-led session blocked by safety gate'],
    };
    const blockResponse: SmartWorkoutResponse = {
      insight: {
        title:  'Safety Gate Active',
        body:   'Your check-in data indicates this is not a safe moment for an AI-led session. Please consult your trainer before proceeding.',
        action: 'Contact your trainer for guidance.',
        tone:   'empathetic',
      },
      usage: { input_tokens: 0, output_tokens: 0 },
      context_snapshot: snapshot,
    };
    return res.status(200).json(blockResponse);
  }

  const ctx: AIContext = {
    ...body,
    // Overrides the client-supplied task gates with the server-resolved
    // ones — from here on, everything downstream (the prompt itself via
    // buildPrompt(ctx), requiresPerformanceContent(ctx), the post-hoc
    // cutExerciseCount/enforceCategoryFilter) reads the true entitlement,
    // never body.task directly.
    task: { ...body.task, maxExercises: resolvedGates.maxExercises, fitnessOnly: resolvedGates.fitnessOnly },
    contextVersion: '1.1',
    builtAt: new Date().toISOString(),
  };
  const isAutonomous = ctx.trainer.id === 'ai-coach';

  const { system, user } = buildPrompt(ctx);
  const maxTokens = MAX_TOKENS[body.task.type] ?? 1024;

  const ctrl    = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 28_000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'deepseek-chat',
        max_tokens:  maxTokens,
        temperature: 0.45,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user   },
        ],
      }),
      signal: ctrl.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '(unreadable body)');
      throw new Error(`DeepSeek returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
      usage?:   { prompt_tokens?: number; completion_tokens?: number };
      error?:   { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? 'DeepSeek request failed');
    }

    const raw   = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned unexpected format');

    const parsed = JSON.parse(match[0]) as Partial<SmartWorkoutResponse>;

    // Shadow mode (Fase 1 of docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md):
    // measure category/count violations on the model's raw output — before
    // fitWorkoutToBudget reshapes it — and log them. Never alters `parsed`.
    // Fases 2/3 consume the same report to actually cut violations. Fase 5
    // adds the inverted direction (requirePerformance) — detect-and-log only,
    // level (a), no retry: never alters `parsed` either.
    if (parsed.workout?.phases?.length) {
      const requirePerformance = requiresPerformanceContent(ctx, isAutonomous);
      // ctx.task, not body.task — this shadow-mode measurement must reflect
      // the real entitlement, not whatever the client claimed, or a spoofed
      // request would silently under-report its own violations.
      const report = enforceExerciseTypePolicy(parsed.workout, ctx.task, requirePerformance);
      if (report.violations.length > 0) {
        console.warn(
          `[generate-smart-workout] exercise-type policy violations (shadow mode, not enforced): ` +
          `${report.violations.length} violation(s) of ${report.totalExercises} exercise(s) — ` +
          JSON.stringify(report.violations),
        );
      }
      if (report.missingCategoryCount > 0) {
        console.warn(
          `[generate-smart-workout] ${report.missingCategoryCount}/${report.totalExercises} exercises missing "category"`,
        );
      }
    }

    // Fase 2 of docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md: activate the
    // count dimension measured above. Runs once, before fitWorkoutToBudget,
    // so time fitting operates on the already-cut set.
    if (parsed.workout?.phases?.length && ctx.task.maxExercises != null) {
      const cut = cutExerciseCount(parsed.workout, ctx.task.maxExercises);
      if (cut.removedExercises > 0) {
        console.warn(
          `[generate-smart-workout] cut to maxExercises=${ctx.task.maxExercises}: removed ${cut.removedExercises} exercise(s)` +
          (cut.removedBlocks.length ? `, dropped block(s) [${cut.removedBlocks.join(', ')}]` : ''),
        );
      }
      parsed.workout = cut.workout;
    }

    // Fase 3 of docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md: activate the
    // category dimension. Runs after the count cut, still before
    // fitWorkoutToBudget, so time fitting remains the single last step.
    if (parsed.workout?.phases?.length && ctx.task.fitnessOnly) {
      const filtered = enforceCategoryFilter(parsed.workout, ctx.task.fitnessOnly);
      if (filtered.report.removedExercises.length > 0 || filtered.report.forcedNonEmptyPhases.length > 0) {
        console.warn(
          `[generate-smart-workout] category filter (fitnessOnly): removed ${filtered.report.removedExercises.length} exercise(s)` +
          (filtered.report.forcedNonEmptyPhases.length ? `, forced non-empty in [${filtered.report.forcedNonEmptyPhases.join(', ')}] (all exercises were performance)` : '') +
          ` — ${JSON.stringify(filtered.report.removedExercises)}`,
        );
      }
      parsed.workout = filtered.workout;
    }

    // Enforce the time budget on generated sessions (safety-gate responses carry
    // an insight and no workout, so there is nothing to fit in that case).
    const budgetMinutes = body.task.durationMin ?? body.today.availableMinutes;
    if (parsed.workout?.phases?.length && budgetMinutes > 0) {
      const before = workoutMinutes(parsed.workout.phases);
      const fitted = fitWorkoutToBudget(parsed.workout, budgetMinutes);
      if (fitted.trimmed || fitted.paddedSets) {
        console.warn(
          `[generate-smart-workout] fitted to budget: model returned ~${Math.round(before)} min ` +
          `for ${budgetMinutes} min (trimmed ${fitted.trimmed}, padded ${fitted.paddedSets} set(s)) -> ` +
          `~${fitted.workout.totalDurationMin} min`,
        );
      }
      parsed.workout = fitted.workout;
    }

    const usage = {
      input_tokens:  data.usage?.prompt_tokens     ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    };

    await emitAIUsageEvent({
      actorId: caller.id,
      endpoint: 'generate-smart-workout',
      outcome: 'succeeded',
      httpStatus: 200,
      provider: 'deepseek',
      model: 'deepseek-chat',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    });

    // Cost instrumentation carries only aggregate dimensions. Actor-level
    // observability is handled by the HMAC-based telemetry event above; raw
    // client/caller identifiers must never enter application logs.
    console.log(JSON.stringify({
      event:         'ai_generation_cost',
      endpoint:      'generate-smart-workout',
      task_type:     body.task.type,
      origin:        isAutonomous ? 'autonomous_ai' : (isClientSelf ? 'client_self' : 'linked_trainer'),
      input_tokens:  usage.input_tokens,
      output_tokens: usage.output_tokens,
    }));

    const context_snapshot = parsed.context_snapshot ?? {
      readinessScore: body.today.readinessScore,
      safetyStatus:   body.today.safetyStatus,
      adaptations:    [],
    };

    return res.status(200).json({ ...parsed, usage, context_snapshot });

  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[generate-smart-workout] timed out');
      return res.status(504).json({ error: 'Generation timed out' });
    }
    console.error('[generate-smart-workout] provider request failed');
    return res.status(500).json({ error: 'generation failed' });
  } finally {
    clearTimeout(timeout);
  }
}
