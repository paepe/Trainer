// POST /api/translate-exercise-content
// Input:  { items: { text: string }[], targetLocale: 'en' | 'pt' | 'es' | 'de' }
// Output: { translations: Record<string, string> }  — keyed by the original text
//
// Translates trainer-authored free text (exercise names, per-exercise notes)
// on demand, for a client whose profile locale differs from whatever
// language the trainer typed in. AI-generated plans don't need this — the
// generation prompt already asks for the client's locale — this covers only
// manually-entered content (docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md,
// "Open Finding — Manually-Entered Exercise Names Are Never Translated").
//
// Shared cache in exercise_content_translations (source_text, target_locale)
// -> translated_text: the same phrase — "Agachamento Livre" to en — is
// translated once and reused across every trainer and plan. Only this
// handler touches that table, via the service role; it has no RLS policies
// and no client ever queries it directly.
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
// calls; these bound cost per request without limiting legitimate use (no
// real workout has anywhere near 50 distinct exercise/note strings).
const MAX_ITEMS      = 50;
const MAX_TEXT_CHARS = 300;

// ── Inlined auth helpers — see generate-smart-workout.ts for why these are
// duplicated instead of imported ──
function authSupabaseUrl(): string {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
}
function authServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}
function authAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
}
function authServiceHeaders(): Record<string, string> {
  const key = authServiceKey();
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function verifyRequestUser(req: { headers?: Record<string, string | string[] | undefined> }): Promise<boolean> {
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header?.startsWith('Bearer ')) return false;
  const jwt = header.slice('Bearer '.length).trim();
  if (!jwt) return false;

  const url = authSupabaseUrl();
  const key = authAnonKey();
  if (!url || !key) {
    console.error('[auth] SUPABASE_URL / SUPABASE_ANON_KEY not set — cannot verify callers');
    return false;
  }

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${jwt}` },
    });
    return res.ok;
  } catch (err) {
    console.error('[auth] JWT verification failed:', (err as Error)?.message);
    return false;
  }
}

interface CacheRow { source_text: string; target_locale: string; translated_text: string }

async function fetchCached(texts: string[], targetLocale: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (texts.length === 0) return result;
  const orList = texts.map(t => `"${t.replace(/"/g, '\\"')}"`).join(',');
  const res = await fetch(
    `${authSupabaseUrl()}/rest/v1/exercise_content_translations` +
    `?select=source_text,target_locale,translated_text` +
    `&target_locale=eq.${encodeURIComponent(targetLocale)}` +
    `&source_text=in.(${encodeURIComponent(orList)})`,
    { headers: authServiceHeaders() },
  );
  if (!res.ok) return result;
  const rows = await res.json() as CacheRow[];
  for (const row of rows) result.set(row.source_text, row.translated_text);
  return result;
}

async function storeTranslations(rows: CacheRow[]): Promise<void> {
  if (rows.length === 0) return;
  const res = await fetch(
    `${authSupabaseUrl()}/rest/v1/exercise_content_translations?on_conflict=source_text,target_locale`,
    {
      method: 'POST',
      headers: { ...authServiceHeaders(), Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) {
    console.error('[translate-exercise-content] cache write failed:', await res.text().catch(() => ''));
  }
}

async function translateMissing(texts: string[], targetLocale: SupportedLocale): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (texts.length === 0) return result;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('[translate-exercise-content] DEEPSEEK_API_KEY not set — returning source text unchanged');
    for (const t of texts) result.set(t, t);
    return result;
  }

  const lang = LOCALE_TO_LANG[targetLocale];
  const system = `You translate short fitness exercise names and coaching notes for a workout app.
Translate each item in the input JSON array to ${lang}. If an item is already in ${lang}, return it unchanged.
Preserve the exact meaning — do not add explanation, commentary, or extra words.
Respond with ONLY a JSON array of strings, same length and order as the input. No markdown fences, no commentary.`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(texts) },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) throw new Error(`DeepSeek ${response.status}`);
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = match ? JSON.parse(match[0]) as unknown[] : [];

    texts.forEach((original, i) => {
      const translated = typeof parsed[i] === 'string' ? parsed[i] as string : original;
      result.set(original, translated);
    });
  } catch (err) {
    // Resilient fallback (§6.3) — a translation failure must never block the
    // client from seeing their workout; fall back to the raw source text.
    console.error('[translate-exercise-content] DeepSeek call failed:', (err as Error)?.message);
    for (const t of texts) result.set(t, t);
  }

  return result;
}

interface VercelRequest  { method?: string; body?: { items?: { text?: string }[]; targetLocale?: string }; headers?: Record<string, string | string[] | undefined> }
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

  const targetLocale = req.body?.targetLocale;
  if (!targetLocale || !(SUPPORTED_LOCALES as readonly string[]).includes(targetLocale)) {
    return res.status(400).json({ error: `targetLocale must be one of ${SUPPORTED_LOCALES.join(', ')}` });
  }

  const rawItems = req.body?.items ?? [];
  const texts = Array.from(new Set(
    rawItems
      .map(i => i?.text?.trim())
      .filter((t): t is string => !!t && t.length <= MAX_TEXT_CHARS)
      .slice(0, MAX_ITEMS),
  ));

  if (texts.length === 0) return res.status(200).json({ translations: {} });

  const cached = await fetchCached(texts, targetLocale);
  const missing = texts.filter(t => !cached.has(t));
  const fresh = await translateMissing(missing, targetLocale as SupportedLocale);

  // Awaited, not fire-and-forget: a serverless function's process can be
  // frozen right after the response is sent, so a detached write here would
  // not reliably complete.
  await storeTranslations(
    Array.from(fresh.entries()).map(([source_text, translated_text]) => ({
      source_text, target_locale: targetLocale, translated_text,
    })),
  );

  const translations: Record<string, string> = {};
  for (const [k, v] of cached) translations[k] = v;
  for (const [k, v] of fresh)  translations[k] = v;

  return res.status(200).json({ translations });
}
