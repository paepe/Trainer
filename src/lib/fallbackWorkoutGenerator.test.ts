import { describe, it, expect } from 'vitest';
import { generateFallbackPlan, isSafetyGateActive, classifyGoal, type FallbackGeneratorOptions } from './fallbackWorkoutGenerator';
import { estimateSessionMinutes, FILL_FLOOR, FILL_CEILING } from './sessionBudget';
import { FALLBACK_LIBRARY } from '../data/fallbackExerciseLibrary';
import type { ContraindicationRegion } from '../data/fallbackExerciseLibrary';

const GOALS = ['hypertrophy', 'weight_loss', 'strength', 'endurance', 'mobility', 'general'] as const;
const BUDGETS = [15, 30, 45, 60] as const;

function base(overrides: Partial<FallbackGeneratorOptions> = {}): FallbackGeneratorOptions {
  return {
    goal:          'general',
    targetMinutes: 30,
    locale:        'pt',
    seed:          42,
    safety:        {},
    ...overrides,
  };
}

describe('isSafetyGateActive', () => {
  it('is active when aiLedBlocked is true', () => {
    expect(isSafetyGateActive({ aiLedBlocked: true })).toBe(true);
  });
  it('is active when safetyStatus is "blocked"', () => {
    expect(isSafetyGateActive({ safetyStatus: 'blocked' })).toBe(true);
  });
  it('is inactive otherwise', () => {
    expect(isSafetyGateActive({})).toBe(false);
    expect(isSafetyGateActive({ aiLedBlocked: false, safetyStatus: 'ok' })).toBe(false);
  });
});

describe('classifyGoal', () => {
  it('maps known goal strings to categories', () => {
    expect(classifyGoal('Hypertrophy')).toBe('hypertrophy');
    expect(classifyGoal('perda de peso')).toBe('weight_loss');
    expect(classifyGoal('força')).toBe('strength');
    expect(classifyGoal('condicionamento')).toBe('endurance');
    expect(classifyGoal('mobilidade')).toBe('mobility');
    expect(classifyGoal(undefined)).toBe('general');
    expect(classifyGoal('something else entirely')).toBe('general');
  });
});

describe('generateFallbackPlan — safety gate (achado 15b)', () => {
  it('blocks generation when the safety gate is active — no exercises returned', () => {
    const result = generateFallbackPlan(base({ safety: { safetyStatus: 'blocked' } }));
    expect(result.blocked).toBe(true);
    if (!result.blocked) throw new Error('unreachable');
  });

  it('blocks generation when aiLedBlocked is true, independent of safetyStatus', () => {
    const result = generateFallbackPlan(base({ safety: { aiLedBlocked: true, safetyStatus: 'ok' } }));
    expect(result.blocked).toBe(true);
  });
});

describe('generateFallbackPlan — deterministic band (achado 12, aceitação da Fase 4)', () => {
  for (const goal of GOALS) {
    for (const minutes of BUDGETS) {
      it(`goal=${goal} target=${minutes}min lands in 90-110% with a fixed seed`, () => {
        const result = generateFallbackPlan(base({ goal, targetMinutes: minutes, seed: 7 }));
        expect(result.blocked).toBe(false);
        if (result.blocked) return;
        const actualMinutes = estimateSessionMinutes(
          result.exercises.map(e => ({ sets: e.sets, reps: e.reps, duration_seconds: e.duration_seconds, rest_seconds: e.rest_seconds, phase: e.phase }))
        );
        expect(actualMinutes).toBeGreaterThanOrEqual(minutes * FILL_FLOOR);
        expect(actualMinutes).toBeLessThanOrEqual(minutes * FILL_CEILING);
      });
    }
  }

  it('always includes a warmup exercise, including the tightest 15-minute budget', () => {
    for (const goal of GOALS) {
      const result = generateFallbackPlan(base({ goal, targetMinutes: 15, seed: 7 }));
      expect(result.blocked).toBe(false);
      if (result.blocked) continue;
      expect(result.exercises.some(e => e.phase === 'warmup')).toBe(true);
    }
  });

  it('never leaves a declared block empty (warmup, strength, conditioning, cooldown)', () => {
    for (const goal of GOALS) {
      for (const minutes of BUDGETS) {
        const result = generateFallbackPlan(base({ goal, targetMinutes: minutes, seed: 7 }));
        expect(result.blocked).toBe(false);
        if (result.blocked) continue;
        for (const block of ['warmup', 'strength', 'conditioning', 'cooldown']) {
          expect(result.exercises.some(e => e.phase === block), `${goal}/${minutes}min missing ${block}`).toBe(true);
        }
      }
    }
  });
});

describe('generateFallbackPlan — contraindication deny-list', () => {
  const REGIONS: ContraindicationRegion[] = ['knee', 'lower_back', 'shoulder', 'wrist'];

  for (const region of REGIONS) {
    it(`excludes every exercise tagged "${region}" when that region is flagged`, () => {
      const namesWithRegion = new Set(
        FALLBACK_LIBRARY.filter(e => e.contraindications.includes(region)).map(e => e.name)
      );
      for (const minutes of BUDGETS) {
        const result = generateFallbackPlan(base({ targetMinutes: minutes, excludedRegions: [region], seed: 7, locale: 'en' }));
        expect(result.blocked).toBe(false);
        if (result.blocked) continue;
        for (const ex of result.exercises) {
          expect(namesWithRegion.has(ex.exercise_name), `${ex.exercise_name} is tagged "${region}" but was returned`).toBe(false);
        }
      }
    });
  }

  it('excludes every flagged region simultaneously without emptying a block', () => {
    const result = generateFallbackPlan(base({ targetMinutes: 15, excludedRegions: REGIONS, seed: 7, locale: 'en' }));
    expect(result.blocked).toBe(false);
    if (result.blocked) return;
    for (const block of ['warmup', 'strength', 'conditioning', 'cooldown']) {
      expect(result.exercises.some(e => e.phase === block)).toBe(true);
    }
  });
});

describe('generateFallbackPlan — fitnessOnly (plan gate)', () => {
  it('excludes every high-intensity (performance) exercise when fitnessOnly is set', () => {
    const highIntensityNames = new Set(FALLBACK_LIBRARY.filter(e => e.intensity === 'high').map(e => e.name));
    const result = generateFallbackPlan(base({ targetMinutes: 45, fitnessOnly: true, seed: 7, locale: 'en' }));
    expect(result.blocked).toBe(false);
    if (result.blocked) return;
    for (const ex of result.exercises) {
      expect(highIntensityNames.has(ex.exercise_name)).toBe(false);
    }
  });
});

describe('generateFallbackPlan — maxExercises (plan gate, Fase 0)', () => {
  it('never returns more exercises than the plan limit', () => {
    const result = generateFallbackPlan(base({ targetMinutes: 60, maxExercises: 6, seed: 7 }));
    expect(result.blocked).toBe(false);
    if (result.blocked) return;
    expect(result.exercises.length).toBeLessThanOrEqual(6);
  });
});

describe('generateFallbackPlan — locale and offline guarantee', () => {
  it('emits the exercise name already translated, with no network call involved (pure function)', () => {
    const resultPt = generateFallbackPlan(base({ locale: 'pt', seed: 7 }));
    const resultEn = generateFallbackPlan(base({ locale: 'en', seed: 7 }));
    expect(resultPt.blocked).toBe(false);
    expect(resultEn.blocked).toBe(false);
    if (resultPt.blocked || resultEn.blocked) return;
    // same seed -> same exercises selected, different language rendered
    const ptNames = resultPt.exercises.map(e => e.exercise_name);
    const enNames = resultEn.exercises.map(e => e.exercise_name);
    expect(ptNames).not.toEqual(enNames);
    expect(resultPt.exercises.every(e => e.name_source_locale === 'pt')).toBe(true);
    expect(resultEn.exercises.every(e => e.name_source_locale === 'en')).toBe(true);
  });

  it('every exercise carries a non-null phase', () => {
    const result = generateFallbackPlan(base());
    expect(result.blocked).toBe(false);
    if (result.blocked) return;
    expect(result.exercises.every(e => !!e.phase)).toBe(true);
  });
});

describe('generateFallbackPlan — variety across seeds', () => {
  it('different seeds produce different, equally valid workouts', () => {
    const a = generateFallbackPlan(base({ seed: 1 }));
    const b = generateFallbackPlan(base({ seed: 2 }));
    expect(a.blocked).toBe(false);
    expect(b.blocked).toBe(false);
    if (a.blocked || b.blocked) return;
    expect(a.exercises.map(e => e.exercise_name)).not.toEqual(b.exercises.map(e => e.exercise_name));
    for (const result of [a, b]) {
      const minutes = estimateSessionMinutes(
        result.exercises.map(e => ({ sets: e.sets, reps: e.reps, duration_seconds: e.duration_seconds, rest_seconds: e.rest_seconds, phase: e.phase }))
      );
      expect(minutes).toBeGreaterThan(0);
    }
  });

  it('the same seed is fully reproducible', () => {
    const a = generateFallbackPlan(base({ seed: 99 }));
    const b = generateFallbackPlan(base({ seed: 99 }));
    expect(a).toEqual(b);
  });
});

describe('generateFallbackPlan — offline guarantee (no network call)', () => {
  it('generates a full plan with fetch entirely unavailable — the real contingency condition', () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error — simulating the real offline condition this generator exists for
    delete globalThis.fetch;
    try {
      const result = generateFallbackPlan(base({ locale: 'de', seed: 3 }));
      expect(result.blocked).toBe(false);
      if (result.blocked) return;
      expect(result.exercises.length).toBeGreaterThan(0);
      expect(result.exercises.every(e => e.name_source_locale === 'de')).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('generateFallbackPlan — planMayOverrun never fires on a local plan', () => {
  // StartWorkoutScreen's soft banner (planMayOverrun) fires at
  // estimatedMinutes > availableMinutes * 1.2. fitToBudget's own ceiling is
  // 1.1x — strictly tighter — so a correctly time-fit local plan can never
  // cross 1.2x. This is an assertion by construction, not a runtime
  // measurement (docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md Fase 4
  // aceitação) — proved here across every goal x budget combination.
  const PLAN_MAY_OVERRUN_THRESHOLD = 1.2;

  it('FILL_CEILING is strictly below the banner threshold', () => {
    expect(FILL_CEILING).toBeLessThan(PLAN_MAY_OVERRUN_THRESHOLD);
  });

  for (const goal of GOALS) {
    for (const minutes of BUDGETS) {
      it(`goal=${goal} target=${minutes}min never reaches the 1.2x banner threshold`, () => {
        const result = generateFallbackPlan(base({ goal, targetMinutes: minutes, seed: 11 }));
        expect(result.blocked).toBe(false);
        if (result.blocked) return;
        const actualMinutes = estimateSessionMinutes(
          result.exercises.map(e => ({ sets: e.sets, reps: e.reps, duration_seconds: e.duration_seconds, rest_seconds: e.rest_seconds, phase: e.phase }))
        );
        expect(actualMinutes).toBeLessThanOrEqual(minutes * PLAN_MAY_OVERRUN_THRESHOLD);
      });
    }
  }
});

describe('generateFallbackPlan — ordering', () => {
  it('output is ordered warmup -> strength -> conditioning -> cooldown', () => {
    const result = generateFallbackPlan(base({ targetMinutes: 45, seed: 7 }));
    expect(result.blocked).toBe(false);
    if (result.blocked) return;
    const order = ['warmup', 'strength', 'conditioning', 'cooldown'];
    const ranks = result.exercises.map(e => order.indexOf(e.phase!));
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1]!);
    }
  });
});
