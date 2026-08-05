// POST /api/translate-exercise-content
// Input:  { items: { text: string }[], sourceLocale?: 'en'|'pt'|'es'|'de' (default 'pt'), targetLocale: 'en' | 'pt' | 'es' | 'de' }
// Output: { translations: Record<string, string> }  — keyed by the original text
//
// Translates exercise names/notes on demand, for a viewer whose locale (or
// keep-English-names preference — docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md)
// differs from the content's own language. Originally scoped to trainer-typed
// content only (source assumed pt-BR) — Fase 1 of that plan also routes
// English-sourced library/catalog names through this same endpoint on a
// cache miss, so the source language is now an explicit request parameter
// (D7: registered, never inferred) rather than a hardcoded assumption.
// AI-generated plans still don't need this — the generation prompt already
// asks for the client's locale.
//
// Shared cache in exercise_content_translations (source_text, source_locale,
// target_locale) -> translated_text: the same phrase is translated once and
// reused across every trainer and plan. Only this handler touches that
// table, via the service role; it has no RLS policies and no client ever
// queries it directly. `curated` rows (pre-reviewed library terminology) are
// never overwritten by a runtime write — this handler only inserts fresh
// (non-curated) rows and ON CONFLICT DO NOTHING covers the rest.
//
// Uses DeepSeek deepseek-chat, same provider as generate-workout.ts /
// generate-smart-workout.ts (one capability, one contract — §4.5).
// NOTE: self-contained per the api/* convention (Vercel's function builder
// does not trace relative imports outside this file — see
// generate-smart-workout.ts).

const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'de'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

const LOCALE_TO_LANG: Record<SupportedLocale, string> = {
  en: 'English', pt: 'Portuguese (Brazil)', es: 'Spanish', de: 'German',
};

// Defensive caps — an authenticated caller could otherwise spam translation
// calls; these bound cost per request without limiting legitimate use. A
// single plan has nowhere near 50 distinct strings, but the exercise
// library screen (Fase 1) legitimately requests the full catalog in one
// batch — 129-155 items today, so 50 silently truncated it and pushed
// the remainder through cache-miss translation on every load.
const MAX_ITEMS      = 300;
const MAX_TEXT_CHARS = 300;
// Individual translation requests preserve measured translation quality, but
// a cache miss must never turn one user request into hundreds of simultaneous
// paid provider calls.
export const MAX_CONCURRENT_PROVIDER_CALLS = 8;

// Auth helpers moved to api/_lib/auth — Fase 2 of
// docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md. This file's local
// authServiceHeaders() used to bundle 'Content-Type': 'application/json' in
// automatically; _lib/auth's version doesn't (most callers are GET), so the
// one POST call site below (storeTranslations) now sets it explicitly.
import { verifyRequestUser, authSupabaseUrl, authServiceHeaders, hasJsonContentType } from './_lib/auth.js';
import { emitAIUsageEvent } from './_lib/aiTelemetry.js';

interface CacheRow {
  source_text:     string;
  source_locale:   string;
  target_locale:   string;
  translated_text: string;
}

async function fetchCached(
  texts: string[], sourceLocale: string, targetLocale: string,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (texts.length === 0) return result;
  const orList = texts.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',');
  const res = await fetch(
    `${authSupabaseUrl()}/rest/v1/exercise_content_translations` +
    `?select=source_text,translated_text` +
    `&source_locale=eq.${encodeURIComponent(sourceLocale)}` +
    `&target_locale=eq.${encodeURIComponent(targetLocale)}` +
    `&source_text=in.(${encodeURIComponent(orList)})`,
    { headers: authServiceHeaders() },
  );
  if (!res.ok) {
    // Was silent before — a misconfigured/missing SUPABASE_SERVICE_ROLE_KEY
    // (e.g. a local .env.local without it) makes every lookup fail exactly
    // like a genuine cache miss, with no visible signal that the cache was
    // never actually consulted. Logged, not thrown — §6.3, a lookup failure
    // must fall through to live translation, not block the response.
    console.error('[translate-exercise-content] cache read failed:', res.status);
    return result;
  }
  const rows = await res.json() as CacheRow[];
  for (const row of rows) result.set(row.source_text, row.translated_text);
  return result;
}

async function storeTranslations(rows: CacheRow[]): Promise<void> {
  if (rows.length === 0) return;
  const res = await fetch(
    `${authSupabaseUrl()}/rest/v1/exercise_content_translations` +
    `?on_conflict=source_text,source_locale,target_locale`,
    {
      method: 'POST',
      headers: { ...authServiceHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) {
    console.error('[translate-exercise-content] cache write failed:', res.status);
  }
}

interface TranslationResult {
  translations: Map<string, string>;
  providerFailures: number;
}

async function translateMissing(
  texts: string[], sourceLocale: SupportedLocale, targetLocale: SupportedLocale,
): Promise<TranslationResult> {
  const result = new Map<string, string>();
  if (texts.length === 0) return { translations: result, providerFailures: 0 };

  // Same locale on both sides — identity, no model call needed (docs/
  // EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md, Fase 3 checklist).
  if (sourceLocale === targetLocale) {
    for (const t of texts) result.set(t, t);
    return { translations: result, providerFailures: 0 };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('[translate-exercise-content] DEEPSEEK_API_KEY not set — returning source text unchanged');
    for (const t of texts) result.set(t, t);
    return { translations: result, providerFailures: 1 };
  }

  const sourceLang = LOCALE_TO_LANG[sourceLocale];
  const targetLang = LOCALE_TO_LANG[targetLocale];
  // Declaring the source language explicitly, rather than leaving the model
  // to infer one, is what actually fixes the failure below — an unqualified
  // "translate to {lang}, or return unchanged if already {lang}" leaves the
  // model to guess the source, and it guesses wrong often enough to matter
  // for lexically-similar language pairs. The source is a caller-declared
  // parameter (not hardcoded to Portuguese) because this endpoint now serves
  // two genuinely different sources: trainer-typed content (source_locale
  // reflects whatever the trainer typed in) and the canonical English
  // exercise library (source_locale = 'en') — see docs/
  // EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md and docs/
  // SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md, Open Finding.
  const system = `A personal trainer wrote the following short fitness exercise
name or coaching note in an app, in ${sourceLang}. Translate it from ${sourceLang} into ${targetLang}, using the natural,
idiomatic term a ${targetLang}-speaking trainer would actually use — not a literal word-for-word rendering.
Preserve the exact meaning — do not add explanation, commentary, or extra words.
Respond with ONLY the result, nothing else — no quotes, no markdown.`;

  // One call per item, not one batched call for the whole list — batching was
  // measured live to make the model misjudge a short, lexically-similar item
  // (e.g. Portuguese "Remada Curvada" against a Spanish target) as already
  // translated when other items in the same batch genuinely were, even with
  // explicit "judge each item independently" instructions. Isolated calls
  // never showed this failure in the same testing (docs/
  // SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md, Open Finding). The shared cache
  // means this only costs N calls the first time each phrase is seen, ever.
  // The bounded worker pool preserves that isolation while limiting the real
  // provider fan-out of a single cache miss.
  let nextIndex = 0;
  let providerFailures = 0;
  const worker = async () => {
    while (nextIndex < texts.length) {
      const original = texts[nextIndex++];
      if (!original) continue;
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: original },
            ],
          // 0, not a small positive value — measured live to matter for this
          // failure mode: identical requests at temperature 0.2 sometimes
          // returned the source text completely untranslated for a short
          // Portuguese/Spanish-ambiguous phrase, inconsistently across
          // otherwise-identical calls. 0 minimises that residual variance;
          // it does not fully eliminate it (10 live runs of the worst case
          // found: 0/10 fully untranslated, but translation quality still
          // varies run to run) — see docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md,
          // Open Finding.
            temperature: 0,
            max_tokens: 120,
          }),
        });

        if (!response.ok) throw new Error(`DeepSeek ${response.status}`);
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const translated = data.choices?.[0]?.message?.content?.trim();
        result.set(original, translated || original);
      } catch (err) {
        // Resilient fallback (§6.3) — a translation failure must never block
        // the client from seeing their workout; fall back to the raw source
        // text for this item only, not the whole request.
        console.error('[translate-exercise-content] DeepSeek call failed');
        providerFailures += 1;
        result.set(original, original);
      }
    }
  };
  await Promise.all(Array.from(
    { length: Math.min(MAX_CONCURRENT_PROVIDER_CALLS, texts.length) },
    () => worker(),
  ));

  return { translations: result, providerFailures };
}

interface VercelRequest  { method?: string; body?: { items?: { text?: string }[]; sourceLocale?: string; targetLocale?: string }; headers?: Record<string, string | string[] | undefined> }
interface VercelResponse {
  status(c: number): VercelResponse;
  json(b: unknown): VercelResponse;
  end(): void;
  setHeader(name: string, value: string): void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authed = await verifyRequestUser(req);
  if (!authed) return res.status(401).json({ error: 'Unauthorized' });
  if (!hasJsonContentType(req)) return res.status(415).json({ error: 'Content-Type must be application/json' });

  const targetLocale = req.body?.targetLocale;
  if (!targetLocale || !(SUPPORTED_LOCALES as readonly string[]).includes(targetLocale)) {
    return res.status(400).json({ error: `targetLocale must be one of ${SUPPORTED_LOCALES.join(', ')}` });
  }
  // Default 'pt' preserves the original assumption for callers that predate
  // this parameter (trainer-typed content) — see docs/
  // EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md, D7.
  const rawSourceLocale = req.body?.sourceLocale;
  const sourceLocale = (rawSourceLocale && (SUPPORTED_LOCALES as readonly string[]).includes(rawSourceLocale))
    ? rawSourceLocale as SupportedLocale
    : 'pt';

  const rawItems = req.body?.items;
  if (!Array.isArray(rawItems)) {
    return res.status(400).json({ error: 'items array required' });
  }
  if (rawItems.length > MAX_ITEMS) {
    return res.status(413).json({ error: `Maximum ${MAX_ITEMS} items per call` });
  }
  const texts = Array.from(new Set(
    rawItems
      .map(i => i?.text?.trim())
      .filter((t): t is string => !!t && t.length <= MAX_TEXT_CHARS),
  ));

  if (texts.length === 0) return res.status(200).json({ translations: {} });

  const cached = await fetchCached(texts, sourceLocale, targetLocale);
  const missing = texts.filter(t => !cached.has(t));
  const translation = await translateMissing(missing, sourceLocale, targetLocale as SupportedLocale);
  const fresh = translation.translations;

  if (missing.length > 0) {
    await emitAIUsageEvent({
      actorId: authed.id,
      endpoint: 'translate-exercise-content',
      outcome: translation.providerFailures > 0 ? 'degraded' : 'succeeded',
      httpStatus: 200,
      rejectionCode: translation.providerFailures > 0 ? 'provider_partial_failure' : undefined,
      provider: 'deepseek',
      model: 'deepseek-chat',
    });
  }

  // Awaited, not fire-and-forget: a serverless function's process can be
  // frozen right after the response is sent, so a detached write here would
  // not reliably complete.
  await storeTranslations(
    Array.from(fresh.entries()).map(([source_text, translated_text]) => ({
      source_text, source_locale: sourceLocale, target_locale: targetLocale, translated_text,
    })),
  );

  const translations: Record<string, string> = {};
  for (const [k, v] of cached) translations[k] = v;
  for (const [k, v] of fresh)  translations[k] = v;

  return res.status(200).json({ translations });
}
