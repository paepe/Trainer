import type { AppPreferences } from '../types/preferences';
import type { AppLanguage } from '../i18n';

// Single source of truth for which locale an exercise name should render in
// (docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md, D2/D3) — every surface that
// displays an exercise name (library, editor, workout screens, AI generation)
// must derive its target locale from this, not re-implement the toggle logic.
export function resolveExerciseNameLocale(
  prefs: Pick<AppPreferences, 'keepExerciseNamesInEnglish' | 'language'>,
): AppLanguage {
  return prefs.keepExerciseNamesInEnglish ? 'en' : prefs.language;
}
