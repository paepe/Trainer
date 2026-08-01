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

const cache = new Map<string, string>(); // key: `${locale}::${text}`

export function useTranslatedExerciseContent(
  texts: Array<string | null | undefined>,
): (text: string | null | undefined) => string {
  const { i18n } = useTranslation();
  const locale = i18n.language;

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
    const missing = uniqueTexts.filter(t => !cache.has(`${locale}::${t}`));
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${resolveWorkoutApiBase()}/api/translate-exercise-content`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ items: missing.map(text => ({ text })), targetLocale: locale }),
        });
        if (!res.ok) return;
        const { translations } = await res.json() as { translations: Record<string, string> };
        for (const [original, translated] of Object.entries(translations)) {
          cache.set(`${locale}::${original}`, translated);
        }
        if (!cancelled) forceRerender();
      } catch {
        // Never block rendering on a translation failure — the raw text is
        // still a valid, readable fallback (§6.3).
      }
    })();

    return () => { cancelled = true; };
  }, [uniqueTexts, locale]);

  return React.useCallback((text: string | null | undefined) => {
    if (!text?.trim()) return text ?? '';
    return cache.get(`${locale}::${text}`) ?? text;
  }, [locale]);
}
