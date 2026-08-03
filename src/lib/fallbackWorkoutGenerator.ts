// Local contingency generator — docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md
// Fase 4. Replaces the old GOAL_TEMPLATES (6 fixed exercises) with a
// selection over the 129-exercise mirror (src/data/fallbackExerciseLibrary.ts,
// Fase 3), assembled deliberately over budget and then subtracted down to the
// 90-110% band via the same fitToBudget used by the client's own estimator
// (src/lib/sessionBudget.ts) and the remote generator. This is a continuity
// plan (ITIL sense), not a use model: it only needs to be safe and coherent,
// not exhaustive — see the plan doc's "Decisões de desenho".
import { FALLBACK_LIBRARY, type FallbackLibraryExercise, type ContraindicationRegion } from '../data/fallbackExerciseLibrary';
import { sortBySessionBlock, type SessionBlock } from './sessionStructure';
import { fitToBudget, estimateExerciseSeconds, estimateSessionMinutes, FILL_CEILING, FILL_FLOOR, type BudgetExercise } from './sessionBudget';
import type { GeneratedWorkoutExercise } from './workoutGeneration';
import type { AppLanguage } from '../i18n';

// Fixed structure — mirrors DEFAULT_SESSION_ORDER (sessionStructure.ts), the
// same "no Coach DNA on record" sequence used elsewhere. mobility/technique
// blocks exist in the library but are reserved for the trainer-configured
// path; the contingency generator keeps one uniform structure for every goal.
const WARMUP: SessionBlock = 'warmup';
const STRENGTH: SessionBlock = 'strength';
const CONDITIONING: SessionBlock = 'conditioning';
const COOLDOWN: SessionBlock = 'cooldown';

const MIN_WARMUP_SECONDS = 60;
const OVERPROVISION_FACTOR = 1.3;

export type GoalCategory = 'hypertrophy' | 'weight_loss' | 'strength' | 'endurance' | 'mobility' | 'general';

// Same string-matching rules the old GOAL_TEMPLATES selector used — only the
// destination (a conditioning/strength ratio, not a fixed exercise list) changed.
export function classifyGoal(goal: string | null | undefined): GoalCategory {
  const g = (goal ?? '').toLowerCase();
  if (g.includes('hypertrophy')) return 'hypertrophy';
  if (g.includes('weight') || g.includes('loss') || g.includes('perda') || g.includes('emagrecimento')) return 'weight_loss';
  if (g.includes('strength') || g.includes('força') || g.includes('forca')) return 'strength';
  if (g.includes('endurance') || g.includes('conditioning') || g.includes('resistência') || g.includes('condicionamento')) return 'endurance';
  if (g.includes('mobility') || g.includes('mobilidade') || g.includes('flexibility') || g.includes('alongamento')) return 'mobility';
  return 'general';
}

// Share of the over-provisioned "working" budget drawn from conditioning
// (the rest goes to strength). A contingency ratio, not a prescription —
// simple and defensible per the ITIL framing, not a training-science model.
const CONDITIONING_SHARE: Record<GoalCategory, number> = {
  hypertrophy: 0.15,
  strength:    0.10,
  weight_loss: 0.55,
  endurance:   0.70,
  mobility:    0.20,
  general:     0.30,
};

// Deterministic PRNG (mulberry32) — same seed, same sequence, on every
// platform and Node/browser runtime. Needed for "sementes diferentes
// produzem treinos diferentes" while keeping tests reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

interface Candidate extends BudgetExercise {
  libraryExercise: FallbackLibraryExercise;
}

function toCandidate(ex: FallbackLibraryExercise): Candidate {
  return {
    sets:             ex.sets,
    reps:             ex.reps,
    duration_seconds: ex.durationSeconds,
    rest_seconds:     ex.restSeconds,
    phase:            ex.phase,
    libraryExercise:  ex,
  };
}

function eligible(
  block: SessionBlock,
  excludedRegions: ReadonlySet<ContraindicationRegion>,
  fitnessOnly: boolean,
): FallbackLibraryExercise[] {
  return FALLBACK_LIBRARY.filter(ex => {
    if (ex.phase !== block) return false;
    // docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md Fase 2.5: category, not
    // intensity — intensity=high includes plenty of fitness staples (Back
    // Squat, Bench Press, Deadlift...) that api/classify-exercises.ts itself
    // classifies as fitness, not performance.
    if (fitnessOnly && ex.category === 'performance') return false;
    if (ex.contraindications.some(r => excludedRegions.has(r))) return false;
    return true;
  });
}

// A single candidate should never, on its own, already exceed a generous
// slice of the ceiling — fitToBudget only removes/adds whole exercises, it
// cannot resize one, so an outlier (e.g. a low-rep/high-rest competition
// lift) could make a tight budget unreachable. Skipped for a block if it
// would leave nothing eligible, so it never causes the actual "empty block"
// failure it exists to prevent. A survivor can still be individually larger
// than the whole session ceiling (found live, Fase 6, 2026-08-02 — see
// squeezeToCeiling below, which is what actually brings it back in line).
function sizeFiltered(candidates: FallbackLibraryExercise[], capSeconds: number): FallbackLibraryExercise[] {
  const under = candidates.filter(ex => estimateExerciseSeconds(toCandidate(ex)) <= capSeconds);
  return under.length > 0 ? under : candidates;
}

function libraryExerciseName(ex: FallbackLibraryExercise, locale: AppLanguage): string {
  if (locale === 'en') return ex.name;
  return ex.translations[locale as 'pt' | 'es' | 'de'] ?? ex.name;
}

// Last-resort squeeze for tight budgets (achado plan item "orçamentos
// exíguos"): fitToBudget's trim loop only removes whole exercises and never
// empties a block, so it can leave a single candidate that is, on its own,
// larger than the entire ceiling — found live (Fase 6, 2026-08-02): fitnessOnly
// combined with a contraindicated region can shrink the conditioning pool
// down to only long steady-state cardio machines (Elliptical Trainer, Rowing
// Machine, Stationary Bike), every one of them individually bigger than a
// 15-minute session. "Reduzir volume de trabalho primeiro, cortar
// desaquecimento depois" — shrink the single biggest non-warmup exercise
// first (one set at a time, then duration down to a 60s floor); only once
// nothing else can shrink does warmup itself become the lever, and even then
// never below 60s. Never removes an exercise outright.
function squeezeToCeiling(candidates: Candidate[], ceilingSeconds: number): Candidate[] {
  const result = candidates.map(c => ({ ...c }));
  const canShrink = (c: Candidate) =>
    (c.sets ?? 1) > 1 || (c.duration_seconds != null && c.duration_seconds > MIN_WARMUP_SECONDS);

  let guard = 0;
  while (estimateSessionMinutes(result) * 60 > ceilingSeconds && guard++ < 50) {
    const nonWarmup = result.filter(c => c.phase !== WARMUP && canShrink(c));
    const pool = nonWarmup.length > 0 ? nonWarmup : result.filter(canShrink);
    if (pool.length === 0) break; // nothing left to shrink, accept best effort

    const worst = pool.reduce((a, b) => estimateExerciseSeconds(b) > estimateExerciseSeconds(a) ? b : a);
    const idx = result.indexOf(worst);
    const c = result[idx]!;
    result[idx] = (c.sets ?? 1) > 1
      ? { ...c, sets: (c.sets ?? 1) - 1 }
      : { ...c, duration_seconds: Math.max(MIN_WARMUP_SECONDS, (c.duration_seconds ?? MIN_WARMUP_SECONDS) - 60), rest_seconds: c.phase === WARMUP ? 0 : c.rest_seconds };
  }
  return result;
}

export interface FallbackGeneratorOptions {
  goal?:             string | null;
  targetMinutes:     number;
  locale:            AppLanguage;
  excludedRegions?:  readonly ContraindicationRegion[] | undefined;
  maxExercises?:     number | undefined;
  fitnessOnly?:      boolean | undefined;
  seed?:             number | undefined;
  safety:            { aiLedBlocked?: boolean; safetyStatus?: string | null };
}

export type FallbackGeneratorResult =
  | { blocked: true }
  | { blocked: false; exercises: GeneratedWorkoutExercise[] };

// Mirrors the server-side gate in api/generate-smart-workout.ts
// (`body.today.aiLedBlocked || body.today.safetyStatus === 'blocked'`) —
// the contingency path must never be a way to route around it (achado 15b).
export function isSafetyGateActive(safety: { aiLedBlocked?: boolean; safetyStatus?: string | null }): boolean {
  return !!safety.aiLedBlocked || safety.safetyStatus === 'blocked';
}

export function generateFallbackPlan(options: FallbackGeneratorOptions): FallbackGeneratorResult {
  if (isSafetyGateActive(options.safety)) return { blocked: true };

  const targetMinutes    = Math.max(1, options.targetMinutes);
  const targetSeconds    = targetMinutes * 60;
  const ceilingSeconds   = targetSeconds * FILL_CEILING;
  const excludedRegions  = new Set(options.excludedRegions ?? []);
  const fitnessOnly      = options.fitnessOnly ?? false;
  const maxExercises     = options.maxExercises ?? Infinity;
  const rng              = mulberry32(options.seed ?? 1);
  const conditioningShare = CONDITIONING_SHARE[classifyGoal(options.goal)];

  const warmupPool      = seededShuffle(sizeFiltered(eligible(WARMUP, excludedRegions, fitnessOnly), ceilingSeconds), rng);
  const cooldownPool    = seededShuffle(sizeFiltered(eligible(COOLDOWN, excludedRegions, fitnessOnly), ceilingSeconds), rng);
  const strengthPool    = seededShuffle(sizeFiltered(eligible(STRENGTH, excludedRegions, fitnessOnly), ceilingSeconds * 0.6), rng);
  const conditioningPool = seededShuffle(sizeFiltered(eligible(CONDITIONING, excludedRegions, fitnessOnly), ceilingSeconds * 0.6), rng);

  // Never empty a declared block — warmup/cooldown always get their single
  // slot if the library has anything eligible at all for them.
  const picks: Candidate[] = [];
  let capacity = Math.max(0, Math.floor(maxExercises));

  if (warmupPool.length > 0 && capacity > 0) { picks.push(toCandidate(warmupPool[0]!)); capacity--; }
  if (cooldownPool.length > 0 && capacity > 0) { picks.push(toCandidate(cooldownPool[0]!)); capacity--; }

  let strengthIdx = 0, conditioningIdx = 0;
  const takeStrength = () => {
    if (strengthIdx >= strengthPool.length || capacity <= 0) return false;
    picks.push(toCandidate(strengthPool[strengthIdx++]!));
    capacity--;
    return true;
  };
  const takeConditioning = () => {
    if (conditioningIdx >= conditioningPool.length || capacity <= 0) return false;
    picks.push(toCandidate(conditioningPool[conditioningIdx++]!));
    capacity--;
    return true;
  };

  // Baseline: one of each working block, if room allows — the working
  // blocks are still declared blocks and must not end up empty when the
  // library and the plan's exercise cap both have room for them.
  if (conditioningShare >= 0.5) { takeConditioning(); takeStrength(); }
  else { takeStrength(); takeConditioning(); }

  // Over-provision: deliberately assemble above target, then let
  // fitToBudget subtract back down to the 90-110% band.
  const reservedSeconds = picks
    .filter(c => c.phase === WARMUP || c.phase === COOLDOWN)
    .reduce((sum, c) => sum + estimateExerciseSeconds(c), 0);
  const workBudgetSeconds = Math.max(0, targetSeconds * OVERPROVISION_FACTOR - reservedSeconds);
  let workSeconds = picks
    .filter(c => c.phase === STRENGTH || c.phase === CONDITIONING)
    .reduce((sum, c) => sum + estimateExerciseSeconds(c), 0);

  while (workSeconds < workBudgetSeconds && capacity > 0) {
    const wantConditioning = rng() < conditioningShare;
    const added = wantConditioning
      ? (takeConditioning() || takeStrength())
      : (takeStrength() || takeConditioning());
    if (!added) break; // both pools exhausted
    workSeconds = picks
      .filter(c => c.phase === STRENGTH || c.phase === CONDITIONING)
      .reduce((sum, c) => sum + estimateExerciseSeconds(c), 0);
  }

  const { exercises: budgetFitted } = fitToBudget(picks, targetMinutes);

  // fitToBudget's own trim loop removes whole exercises — coarse enough that
  // it can occasionally overshoot below the floor (found live, Fase 6,
  // scanning many seeds: fitToBudget's set-padding alone, capped at
  // MAX_PADDED_SETS, isn't always enough to close the gap it just opened).
  // Top up with fresh exercises from the same pools — continuing past
  // whatever over-provisioning already tried — before accepting the result.
  let fitted = budgetFitted;
  const floorSeconds = targetSeconds * FILL_FLOOR;
  let topUpGuard = 0;
  while (estimateSessionMinutes(fitted) * 60 < floorSeconds && capacity > 0 && topUpGuard++ < 20) {
    const wantConditioning = rng() < conditioningShare;
    let extra: Candidate | null = null;
    if (wantConditioning && conditioningIdx < conditioningPool.length) extra = toCandidate(conditioningPool[conditioningIdx++]!);
    else if (!wantConditioning && strengthIdx < strengthPool.length) extra = toCandidate(strengthPool[strengthIdx++]!);
    else if (conditioningIdx < conditioningPool.length) extra = toCandidate(conditioningPool[conditioningIdx++]!);
    else if (strengthIdx < strengthPool.length) extra = toCandidate(strengthPool[strengthIdx++]!);
    if (!extra) break; // both pools exhausted — accept best effort
    fitted = [...fitted, extra];
    capacity--;
  }

  const overCeiling = estimateSessionMinutes(fitted) > targetSeconds * FILL_CEILING / 60;
  const finalCandidates = overCeiling ? squeezeToCeiling(fitted, ceilingSeconds) : fitted;

  const ordered = sortBySessionBlock(finalCandidates);
  const exercises: GeneratedWorkoutExercise[] = ordered.map(c => {
    const ex = c.libraryExercise;
    return {
      exercise_name:       libraryExerciseName(ex, options.locale),
      muscle_group:        ex.muscleGroup,
      sets:                c.sets ?? ex.sets,
      reps:                c.reps ?? ex.reps,
      duration_seconds:    c.duration_seconds ?? ex.durationSeconds,
      load_kg:             null,
      rest_seconds:        c.rest_seconds ?? ex.restSeconds,
      notes:               null,
      phase:               ex.phase,
      name_source_locale:  options.locale,
    };
  });

  return { blocked: false, exercises };
}
