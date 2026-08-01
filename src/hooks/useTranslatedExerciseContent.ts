// Translates trainer-authored free text (exercise names, per-exercise notes)
// to the client's own active UI locale, on demand. AI-generated content
// doesn't need this — the generation prompt already asks for the client's
// locale — this covers only manually-entered content (see
// docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md, "Open Finding — Manually-
// Entered Exercise Names Are Never Translated").
//
// Module-level cache (survives remounts within the session) sits in front of
// the server's own shared cache (exercise_content_translations) — most
// renders never hit the network at all once a phrase has been seen once,
// by this client or any other.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { authHeaders } from '../lib/authHeaders';
import { resolveWorkoutApiBase } from '../lib/workoutGeneration';
import type { AppLanguage } from '../i18n';

const cache = new Map<string, string>(); // key: `${sourceLocale ?? ''}::${locale}::${text}`

export function useTranslatedExerciseContent(
  texts: Array<string | null | undefined>,
  // Defaults to the viewer's own UI language (existing behaviour, for
  // manually-typed names/notes). Exercise-name display sites pass
  // resolveExerciseNameLocale(prefs) instead, which can diverge from the UI
  // language when the keep-English-names toggle is on (docs/
  // EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md, D2/D3).
  targetLocale?: AppLanguage,
  // Declares what language `texts` is actually written in — omit for
  // trainer-typed content (server defaults to 'pt', the original
  // assumption); pass 'en' for canonical library/catalog names, whose
  // source language is known and fixed, not the trainer's typing habit.
  sourceLocale?: AppLanguage,
): (text: string | null | undefined) => string {
  const { i18n } = useTranslation();
  const locale = targetLocale ?? (i18n.language as AppLanguage);
  const cacheKeyPrefix = `${sourceLocale ?? ''}::${locale}::`;

  // Stable string derived from `texts` so the memo below only recomputes when
  // the actual set of strings changes, not on every render (callers typically
  // rebuild `texts` as a fresh array each render). JSON round-trip avoids any
  // delimiter-collision risk a joined string would carry.
  const textsKey = JSON.stringify(texts.filter((t): t is string => !!t?.trim()));
  const uniqueTexts = React.useMemo(
    () => Array.from(new Set(JSON.parse(textsKey) as string[])),
    [textsKey],
  );
  const [, forceRerender] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    const missing = uniqueTexts.filter(t => !cache.has(`${cacheKeyPrefix}${t}`));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${resolveWorkoutApiBase()}/api/translate-exercise-content`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items: missing.map(text => ({ text })),
            ...(sourceLocale ? { sourceLocale } : {}),
            targetLocale: locale,
          }),
        });
        if (!res.ok) return;
        const { translations } = await res.json() as { translations: Record<string, string> };
        for (const [original, translated] of Object.entries(translations)) {
          cache.set(`${cacheKeyPrefix}${original}`, translated);
        }
        if (!cancelled) forceRerender();
      } catch {
        // Never block rendering on a translation failure — the raw text is
        // still a valid, readable fallback (§6.3).
      }
    })();

    return () => { cancelled = true; };
  }, [uniqueTexts, cacheKeyPrefix, sourceLocale]);

  return React.useCallback((text: string | null | undefined) => {
    if (!text?.trim()) return text ?? '';
    return cache.get(`${cacheKeyPrefix}${text}`) ?? text;
  }, [cacheKeyPrefix]);
}
