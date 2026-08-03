import { describe, it, expect } from 'vitest';
import { FALLBACK_LIBRARY } from './fallbackExerciseLibrary';
import { SESSION_BLOCKS } from '../lib/sessionStructure';

describe('FALLBACK_LIBRARY', () => {
  it('has exactly 129 entries, matching the source library size', () => {
    expect(FALLBACK_LIBRARY).toHaveLength(129);
  });

  it('has no duplicate exercise names', () => {
    const names = FALLBACK_LIBRARY.map(e => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has no empty session block', () => {
    for (const block of SESSION_BLOCKS) {
      expect(FALLBACK_LIBRARY.some(e => e.phase === block)).toBe(true);
    }
  });

  it('every entry carries all three curated translations (pt/es/de)', () => {
    for (const e of FALLBACK_LIBRARY) {
      expect(e.translations.pt, `${e.name} missing pt`).toBeTruthy();
      expect(e.translations.es, `${e.name} missing es`).toBeTruthy();
      expect(e.translations.de, `${e.name} missing de`).toBeTruthy();
    }
  });

  it('every entry has either reps or durationSeconds, never neither', () => {
    for (const e of FALLBACK_LIBRARY) {
      expect(e.reps !== null || e.durationSeconds !== null, `${e.name} has neither reps nor durationSeconds`).toBe(true);
    }
  });

  it('every entry has a positive sets count', () => {
    for (const e of FALLBACK_LIBRARY) {
      expect(e.sets, e.name).toBeGreaterThan(0);
    }
  });

  // docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md Fase 2.5
  it('every entry has a valid category', () => {
    const valid = new Set(['fitness', 'performance', 'mobility']);
    for (const e of FALLBACK_LIBRARY) {
      expect(valid.has(e.category), `${e.name} has invalid category "${e.category}"`).toBe(true);
    }
  });

  it('no session block is left with zero non-performance exercises (fitnessOnly would empty it)', () => {
    for (const block of SESSION_BLOCKS) {
      const nonPerformance = FALLBACK_LIBRARY.filter(e => e.phase === block && e.category !== 'performance');
      expect(nonPerformance.length, block).toBeGreaterThan(0);
    }
  });
});
