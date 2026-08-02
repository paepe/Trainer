// Single time-and-fit model for client-side session estimation — the
// counterpart to fitToBudget in api/generate-workout.ts (duplicated there
// per the api/* self-contained rule; this file is the one shared copy for
// everything that runs in the browser). Built for
// docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md Fase 2, closing achado 16: the
// client had two independent, silently-diverging estimators (the trainer's
// plan editor and the client's own pre-session banner), one of them
// defaulting a reps-less, duration-less exercise to 30s of work instead of
// 40s, and neither guarding against a null `sets`.
import { SESSION_BLOCKS, ADJUSTABLE_BLOCKS, normalizeBlock, type SessionBlock } from './sessionStructure';

// Budget band and the ceiling on sets a short batch may be padded to —
// identical constants to the remote fitToBudget, so a client-side estimate
// and a server-side one never quietly disagree.
export const FILL_FLOOR      = 0.9;
export const FILL_CEILING    = 1.1;
export const MAX_PADDED_SETS = 5;

export interface BudgetExercise {
  sets?:             number | null;
  reps?:             number | null;
  duration_seconds?: number | null;
  rest_seconds?:     number | null;
  phase?:            string | null;
}

/**
 * Active time is the hold duration when set, otherwise an assumed 40s per
 * rep-based set; rest defaults to 30s only when the field is absent (0 is a
 * valid rest). Same model as api/generate-workout.ts's estimateExerciseMinutes
 * and the (now-retired) local copies in WorkoutPlanEditorScreen and
 * StartWorkoutScreen.
 */
export function estimateExerciseSeconds(ex: BudgetExercise): number {
  const sets   = ex.sets ?? 1;
  const active = ex.duration_seconds ?? 40;
  const rest   = ex.rest_seconds     ?? 30;
  return sets * (active + rest);
}

export function estimateSessionMinutes(exercises: readonly BudgetExercise[]): number {
  return exercises.reduce((sum, ex) => sum + estimateExerciseSeconds(ex), 0) / 60;
}

/**
 * Which blocks absorb time fitting for this specific batch. Mirrors the
 * remote rule (only strength/conditioning are adjustable, warmup/cooldown
 * are prescriptive) with one deliberate widening: if the batch has no
 * working block at all — a pure-mobility session, which the remote
 * generator never produces but a trainer-composed or fallback-template
 * session can — nothing would ever be trimmable under the remote rule, and
 * a too-long mobility session could never be fit to a short window. In that
 * case every block except warmup/cooldown becomes trimmable. Divergence
 * documented in docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md, "Decisões de
 * desenho — Regra de corte — uma só, explícita".
 */
function trimmableBlocks(exercises: readonly BudgetExercise[]): Set<SessionBlock> {
  const present = new Set(exercises.map(e => normalizeBlock(e.phase)));
  const adjustablePresent = ADJUSTABLE_BLOCKS.filter(b => present.has(b));
  if (adjustablePresent.length > 0) return new Set(adjustablePresent);
  return new Set(SESSION_BLOCKS.filter(b => b !== 'warmup' && b !== 'cooldown'));
}

export interface BudgetFitResult<T extends BudgetExercise> {
  exercises:  T[];
  trimmed:    number;
  paddedSets: number;
}

/**
 * Makes a batch actually occupy its time budget instead of trusting whatever
 * it was handed. Over the ceiling: drop trimmable exercises from the end,
 * one at a time, never emptying a block entirely. Under the floor: add sets
 * round-robin over trimmable exercises, capped at MAX_PADDED_SETS and never
 * crossing the ceiling. Order is preserved, so a warm-up stays first and a
 * cool-down stays last. If still short after that (e.g. everything already
 * at the set cap), returned as-is — the caller's own time-fit banner
 * surfaces the shortfall.
 */
export function fitToBudget<T extends BudgetExercise>(
  parsed: readonly T[],
  targetMinutes: number,
): BudgetFitResult<T> {
  const ceiling = targetMinutes * FILL_CEILING;
  const floor   = targetMinutes * FILL_FLOOR;

  const exercises: T[] = parsed.map(e => ({ ...e }));
  const trimmable = trimmableBlocks(exercises);
  const isTrimmable = (e: T) => trimmable.has(normalizeBlock(e.phase));

  let trimmed = 0;
  while (estimateSessionMinutes(exercises) > ceiling) {
    const perBlock = new Map<SessionBlock, number>();
    for (const e of exercises) {
      const b = normalizeBlock(e.phase);
      perBlock.set(b, (perBlock.get(b) ?? 0) + 1);
    }
    let victim = -1;
    for (let i = exercises.length - 1; i >= 0; i--) {
      const ex = exercises[i]!;
      if (!isTrimmable(ex)) continue;
      if ((perBlock.get(normalizeBlock(ex.phase)) ?? 0) <= 1) continue;
      victim = i;
      break;
    }
    if (victim < 0) break;
    exercises.splice(victim, 1);
    trimmed++;
  }

  let paddedSets = 0;
  let progressed = true;
  while (estimateSessionMinutes(exercises) < floor && progressed) {
    progressed = false;
    for (const ex of exercises) {
      if (!isTrimmable(ex)) continue;
      if (estimateSessionMinutes(exercises) >= floor) break;
      if ((ex.sets ?? 1) >= MAX_PADDED_SETS) continue;
      const oneMoreSetSeconds = estimateExerciseSeconds({ ...ex, sets: 1 });
      if (estimateSessionMinutes(exercises) + oneMoreSetSeconds / 60 > ceiling) continue;
      ex.sets = (ex.sets ?? 1) + 1;
      paddedSets++;
      progressed = true;
    }
  }

  return { exercises, trimmed, paddedSets };
}
