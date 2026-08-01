import { describe, it, expect } from 'vitest';
import { resolveExerciseNameLocale } from './exerciseNameLocale';

describe('resolveExerciseNameLocale', () => {
  it('returns English when the toggle is on, regardless of app language', () => {
    expect(resolveExerciseNameLocale({ keepExerciseNamesInEnglish: true, language: 'pt' })).toBe('en');
    expect(resolveExerciseNameLocale({ keepExerciseNamesInEnglish: true, language: 'de' })).toBe('en');
  });

  it('returns the app language when the toggle is off', () => {
    expect(resolveExerciseNameLocale({ keepExerciseNamesInEnglish: false, language: 'es' })).toBe('es');
    expect(resolveExerciseNameLocale({ keepExerciseNamesInEnglish: false, language: 'de' })).toBe('de');
  });

  it('returns English when the toggle is off but the app language already is English', () => {
    expect(resolveExerciseNameLocale({ keepExerciseNamesInEnglish: false, language: 'en' })).toBe('en');
  });
});
