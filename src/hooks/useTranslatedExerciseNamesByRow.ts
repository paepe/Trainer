// A list of exercise names can mix rows from different sources — AI-generated
// (tagged with the recipient's locale, Fase 2), catalog (tagged 'en'), and
// hand-typed (tagged with the trainer's own locale, Fase 3) — each with its
// own name_source_locale. useTranslatedExerciseContent only accepts one
// sourceLocale per call, so this groups rows into one bucket per possible
// AppLanguage value (4 hook calls, fixed — rules of hooks) and returns a
// single per-row lookup.
//
// Rows without a recorded source (legacy, pre-Fase-3 data not yet backfilled)
// fall back to 'pt' — the assumption this endpoint always made before
// name_source_locale existed, so unclassified rows keep behaving exactly as
// they did before this hook existed (docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md,
// A2 backfill).
import React from 'react';
import { useTranslatedExerciseContent } from './useTranslatedExerciseContent';
import type { AppLanguage } from '../i18n';

// Duplicated from i18n/index.ts's SUPPORTED_LANGS (not imported as a value)
// deliberately — importing that module triggers its top-level i18next.init()
// side effect, which this hook doesn't otherwise need and which complicates
// unit testing this hook in isolation. The 4-locale set is stable.
const SUPPORTED_LANGS: readonly [AppLanguage, AppLanguage, AppLanguage, AppLanguage] = ['en', 'pt', 'es', 'de'];

const LEGACY_DEFAULT_SOURCE_LOCALE: AppLanguage = 'pt';

export interface NamedRow {
  name:              string | null | undefined;
  name_source_locale: string | null | undefined;
}

export function useTranslatedExerciseNamesByRow(
  rows: NamedRow[],
  targetLocale: AppLanguage,
): (row: NamedRow) => string {
  const resolvedSource = (row: NamedRow): AppLanguage =>
    (SUPPORTED_LANGS as readonly string[]).includes(row.name_source_locale ?? '')
      ? row.name_source_locale as AppLanguage
      : LEGACY_DEFAULT_SOURCE_LOCALE;

  // Same-locale rows need no translation at all — excluded from every
  // bucket so no network call is made for them (Fase 3 checklist:
  // "curto-circuito: origem igual ao alvo → nenhuma chamada").
  const bucketTexts = (locale: AppLanguage) =>
    locale === targetLocale
      ? []
      : rows.filter(r => resolvedSource(r) === locale).map(r => r.name);

  // Fixed 4 calls — SUPPORTED_LANGS is a stable, unchanging tuple.
  const [en, pt, es, de] = SUPPORTED_LANGS;
  const translateEn = useTranslatedExerciseContent(bucketTexts(en), targetLocale, en);
  const translatePt = useTranslatedExerciseContent(bucketTexts(pt), targetLocale, pt);
  const translateEs = useTranslatedExerciseContent(bucketTexts(es), targetLocale, es);
  const translateDe = useTranslatedExerciseContent(bucketTexts(de), targetLocale, de);

  const byLocale: Record<AppLanguage, (text: string | null | undefined) => string> = {
    en: translateEn, pt: translatePt, es: translateEs, de: translateDe,
  };

  return React.useCallback((row: NamedRow) => {
    const locale = resolvedSource(row);
    return byLocale[locale](row.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- byLocale/resolvedSource are recreated each render from the same 4 translate fns + targetLocale, already in deps below
  }, [translateEn, translatePt, translateEs, translateDe, targetLocale]);
}
