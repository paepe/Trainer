import { describe, it, expect } from 'vitest';
import { estimateExerciseSeconds, estimateSessionMinutes, fitToBudget, FILL_FLOOR, FILL_CEILING, MAX_PADDED_SETS } from './sessionBudget';

describe('estimateExerciseSeconds', () => {
  it('uses duration_seconds as active time when set', () => {
    expect(estimateExerciseSeconds({ sets: 2, duration_seconds: 30, rest_seconds: 15 })).toBe(2 * (30 + 15));
  });

  it('assumes 40s of active time when duration_seconds is absent (rep-based)', () => {
    expect(estimateExerciseSeconds({ sets: 3, rest_seconds: 30 })).toBe(3 * (40 + 30));
  });

  it('defaults rest to 30s only when absent — 0 is a real rest, not a missing one', () => {
    expect(estimateExerciseSeconds({ sets: 1, duration_seconds: 20, rest_seconds: 0 })).toBe(1 * (20 + 0));
  });

  it('treats a null/absent sets as 1', () => {
    expect(estimateExerciseSeconds({ duration_seconds: 20, rest_seconds: 10 })).toBe(1 * (20 + 10));
    expect(estimateExerciseSeconds({ sets: null, duration_seconds: 20, rest_seconds: 10 })).toBe(1 * (20 + 10));
  });
});

describe('estimateSessionMinutes', () => {
  it('sums every exercise and converts to minutes', () => {
    const exercises = [
      { sets: 2, duration_seconds: 30, rest_seconds: 30 }, // 120s
      { sets: 1, rest_seconds: 30 },                        // 70s
    ];
    expect(estimateSessionMinutes(exercises)).toBeCloseTo(190 / 60);
  });

  it('returns 0 for an empty list', () => {
    expect(estimateSessionMinutes([])).toBe(0);
  });
});

describe('fitToBudget — trimming', () => {
  it('trims from the trimmable blocks until the session fits the ceiling', () => {
    const exercises = Array.from({ length: 6 }, (_, i) => ({
      id: i, sets: 3, rest_seconds: 30, phase: 'strength',
    }));
    // Each costs 3*(40+30)=210s=3.5min -> 6 of them = 21min. Target 10min -> ceiling 11min.
    const { exercises: fitted, trimmed } = fitToBudget(exercises, 10);
    expect(estimateSessionMinutes(fitted)).toBeLessThanOrEqual(10 * FILL_CEILING);
    expect(trimmed).toBeGreaterThan(0);
    expect(fitted.length).toBeLessThan(exercises.length);
  });

  it('never trims warmup or cooldown, even when they are the only content and overrun', () => {
    const exercises = [
      { sets: 5, duration_seconds: 120, rest_seconds: 30, phase: 'warmup' },
      { sets: 5, duration_seconds: 120, rest_seconds: 30, phase: 'cooldown' },
    ];
    const { exercises: fitted, trimmed } = fitToBudget(exercises, 5);
    expect(fitted).toHaveLength(2);
    expect(trimmed).toBe(0);
  });

  it('never empties a block entirely — shortens it, stops at 1 exercise', () => {
    const exercises = [
      { id: 'w', sets: 1, rest_seconds: 10, phase: 'warmup' },
      { id: 's1', sets: 5, duration_seconds: 200, rest_seconds: 60, phase: 'strength' },
      { id: 's2', sets: 5, duration_seconds: 200, rest_seconds: 60, phase: 'strength' },
      { id: 'c', sets: 1, rest_seconds: 10, phase: 'cooldown' },
    ];
    const { exercises: fitted } = fitToBudget(exercises, 1); // absurdly tight target
    const strengthLeft = fitted.filter(e => e.phase === 'strength');
    expect(strengthLeft.length).toBeGreaterThanOrEqual(1);
  });
});

describe('fitToBudget — padding', () => {
  it('adds sets to trimmable exercises until the session reaches the floor', () => {
    // 3 exercises so round-robin padding has room to reach the floor without
    // any single one crossing MAX_PADDED_SETS (5).
    const exercises = [
      { sets: 1, rest_seconds: 30, phase: 'strength' },
      { sets: 1, rest_seconds: 30, phase: 'strength' },
      { sets: 1, rest_seconds: 30, phase: 'conditioning' },
    ]; // 3 * 70s = 3.5min
    const { exercises: fitted, paddedSets } = fitToBudget(exercises, 10); // floor 9min
    expect(paddedSets).toBeGreaterThan(0);
    expect(fitted.some(e => (e.sets ?? 1) > 1)).toBe(true);
    expect(estimateSessionMinutes(fitted)).toBeGreaterThanOrEqual(10 * FILL_FLOOR * 0.95); // tolerance for the last increment
  });

  it('never pads past MAX_PADDED_SETS for a single exercise', () => {
    const exercises = [{ sets: 1, rest_seconds: 5, phase: 'strength' }];
    const { exercises: fitted } = fitToBudget(exercises, 1000); // absurd target, forces max padding
    expect(fitted[0]!.sets).toBeLessThanOrEqual(MAX_PADDED_SETS);
  });

  it('never pads warmup or cooldown — a short session stays short rather than inflate prescriptive blocks', () => {
    const exercises = [{ sets: 1, rest_seconds: 10, phase: 'warmup' }];
    const { exercises: fitted, paddedSets } = fitToBudget(exercises, 30);
    expect(paddedSets).toBe(0);
    expect(fitted[0]!.sets).toBe(1);
  });
});

describe('fitToBudget — session with no working block (pure mobility)', () => {
  it('widens the trimmable set to everything but warmup/cooldown, so a mobility-only session can still fit', () => {
    const exercises = Array.from({ length: 6 }, (_, i) => ({
      id: i, sets: 2, duration_seconds: 60, rest_seconds: 20, phase: 'mobility',
    }));
    // Each costs 2*(60+20)=160s; 6 of them = 16min. Target 5min -> ceiling 5.5min.
    const { exercises: fitted, trimmed } = fitToBudget(exercises, 5);
    expect(trimmed).toBeGreaterThan(0);
    expect(estimateSessionMinutes(fitted)).toBeLessThanOrEqual(5 * FILL_CEILING);
  });

  it('still never empties the mobility block down to zero', () => {
    const exercises = Array.from({ length: 3 }, () => ({
      sets: 3, duration_seconds: 90, rest_seconds: 30, phase: 'mobility',
    }));
    const { exercises: fitted } = fitToBudget(exercises, 1);
    expect(fitted.length).toBeGreaterThanOrEqual(1);
  });
});

describe('fitToBudget — edge cases', () => {
  it('returns an empty result for empty input, without throwing', () => {
    const { exercises, trimmed, paddedSets } = fitToBudget([], 30);
    expect(exercises).toEqual([]);
    expect(trimmed).toBe(0);
    expect(paddedSets).toBe(0);
  });

  it('does not mutate the input array or its objects', () => {
    const original = [{ sets: 1, rest_seconds: 30, phase: 'strength' }];
    const snapshot = JSON.parse(JSON.stringify(original));
    fitToBudget(original, 1); // tight target, would trigger trimming/padding
    expect(original).toEqual(snapshot);
  });

  it('leaves an already-in-band session untouched', () => {
    const exercises = [{ sets: 3, rest_seconds: 30, phase: 'strength' }]; // 3*70=210s=3.5min
    const { exercises: fitted, trimmed, paddedSets } = fitToBudget(exercises, 3.5);
    expect(trimmed).toBe(0);
    expect(paddedSets).toBe(0);
    expect(fitted).toEqual(exercises);
  });
});
