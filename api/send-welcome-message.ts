// POST /api/send-welcome-message
// Fired once when a student accepts a trainer's invitation.
// Builds a short, localized welcome message (in the student's profile language) that contains:
//   1. A short greeting
//   2. The trainer's "motto" (lema), if filled in
//   3. The trainer's free-text "philosophy.prompt" (PROMPT LIVRE), if it actually talks about
//      their coaching profile — otherwise an AI-written summary of the trainer's qualifications,
//      sized to fit the same character budget as the free-text box.
// The final text is generated server-side (DeepSeek) because only the server knows the
// recipient's stored language (profiles.language) — the canonical-template/client-render
// pattern used by notify() doesn't fit free-form, AI-authored content.
// Delivered directly into notification_log / InboxScreen as pre-rendered text
// (no templateKey/params). This avoids an unauthenticated server-to-server
// call to the user-scoped send-notification endpoint.
// Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY in env.

import { authServiceHeaders, authSupabaseUrl, hasActiveLink, verifyRequestUser } from './_lib/auth.js';
import {
  claimAIOperation,
  completeAIOperation,
  releaseAIOperation,
} from './_lib/aiOperationIdempotency.js';
import { emitAIUsageEvent } from './_lib/aiTelemetry.js';

const PROMPT_CHAR_BUDGET = 600; // mirrors the Step12 free-text textarea max length

interface VercelRequest  {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: { trainerId?: string };
}
interface VercelResponse {
  setHeader?(name: string, value: string): void;
  status(c: number): VercelResponse;
  json(b: unknown): VercelResponse;
}

declare const process: { env: Record<string, string | undefined> };

interface ProfileRow {
  id:    string;
  name?: string | null;
}

interface PreferencesRow {
  user_id:  string;
  language?: string | null;
}

interface CoachDnaRow {
  identity?:   { name?: string } | null;
  background?: { years?: number; certs?: string[] } | null;
  philosophy?: { motto?: string; prompt?: string } | null;
  archetype?:  string | null;
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', pt: 'Portuguese', es: 'Spanish', de: 'German',
};

function langName(code: string | null | undefined): string {
  return LANG_NAMES[(code ?? 'en').slice(0, 2)] ?? 'English';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await verifyRequestUser(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const trainerId = req.body?.trainerId;
  if (!trainerId || trainerId.length > 128) {
    return res.status(400).json({ error: 'trainerId required' });
  }
  const studentId = caller.id;
  if (!await hasActiveLink(studentId, trainerId)) {
    return res.status(403).json({ error: 'No active trainer/client link' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL         || authSupabaseUrl();
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const apiKey      = process.env.DEEPSEEK_API_KEY          || '';
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });
  if (!apiKey)     return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });

  const restHeaders = {
    'Content-Type': 'application/json',
    apikey:         serviceKey,
    Authorization:  `Bearer ${serviceKey}`,
  };
  let operationKey: string | undefined;

  try {
    // Avoid an expensive generation for the normal retry path. The remaining
    // concurrent-retry race is tracked for the transactional unique-key work.
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/notification_log?select=id&to_user_id=eq.${encodeURIComponent(studentId)}&from_user_id=eq.${encodeURIComponent(trainerId)}&type=eq.trainer_welcome_message&entity_type=eq.trainer_welcome_message&entity_id=eq.${encodeURIComponent(trainerId)}&limit=1`,
      { headers: authServiceHeaders() },
    );
    if (existingRes.ok) {
      const rows = await existingRes.json() as { id: string }[];
      if (rows.length > 0) return res.status(200).json({ ok: true, duplicate: true });
    } else {
      return res.status(503).json({ error: 'Welcome delivery status unavailable' });
    }

    const claim = await claimAIOperation('trainer_welcome_message', [studentId, trainerId]);
    if (claim.state === 'unavailable') {
      return res.status(503).json({ error: 'Welcome delivery protection unavailable' });
    }
    if (claim.state === 'duplicate') {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    operationKey = claim.key;

    const [studentRes, prefsRes, trainerRes, dnaRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/profiles?select=id,name&id=eq.${studentId}`,           { headers: restHeaders }),
      fetch(`${supabaseUrl}/rest/v1/preferences?select=user_id,language&user_id=eq.${studentId}`, { headers: restHeaders }),
      fetch(`${supabaseUrl}/rest/v1/profiles?select=id,name&id=eq.${trainerId}`,            { headers: restHeaders }),
      fetch(`${supabaseUrl}/rest/v1/coach_dna?select=identity,background,philosophy,archetype&trainer_id=eq.${trainerId}`, { headers: restHeaders }),
    ]);

    const [studentRows, prefsRows, trainerRows, dnaRows] = await Promise.all([
      studentRes.ok ? (studentRes.json() as Promise<ProfileRow[]>)     : Promise.resolve([]),
      prefsRes.ok   ? (prefsRes.json()   as Promise<PreferencesRow[]>) : Promise.resolve([]),
      trainerRes.ok ? (trainerRes.json() as Promise<ProfileRow[]>)     : Promise.resolve([]),
      dnaRes.ok     ? (dnaRes.json()     as Promise<CoachDnaRow[]>)    : Promise.resolve([]),
    ]);

    const student = studentRows[0];
    const trainer = trainerRows[0];
    const dna     = dnaRows[0];
    if (!student) return res.status(404).json({ error: 'student not found' });

    const studentName = student.name ?? '';
    const trainerName = dna?.identity?.name || trainer?.name || '';
    const language    = langName(prefsRows[0]?.language);
    const motto       = dna?.philosophy?.motto?.trim()  ?? '';
    const freeText    = dna?.philosophy?.prompt?.trim() ?? '';
    const years       = dna?.background?.years ?? null;
    const certs       = dna?.background?.certs ?? [];
    const archetype   = dna?.archetype ?? '';

    const system = [
      `You write short, warm welcome messages from a personal trainer to a brand-new client, on behalf of the trainer.`,
      `Respond in ${language} only — translate every part of the message into ${language}, including the trainer's own words if needed.`,
      `Output strict JSON only: {"message": string}. No markdown, no extra keys, no commentary.`,
      `The "message" must read as ONE cohesive, natural welcome note — not a bullet list of facts.`,
      `Keep the whole message concise: a short greeting, the trainer's motto if provided (woven in naturally, e.g. quoted), then either the trainer's own words or, if those are missing/off-topic, a brief elegant summary of the trainer's qualifications — and end with a warm, elegant closing line.`,
      `Hard limit: the portion covering the trainer's own words OR the qualifications summary must not exceed ${PROMPT_CHAR_BUDGET} characters.`,
    ].join(' ');

    const promptRelevanceNote = freeText
      ? `The trainer wrote this free text about themselves for new clients: "${freeText}"\nFirst judge whether it genuinely talks about the trainer's coaching profile, philosophy, or qualifications (not empty, not off-topic, not gibberish). If it does, translate/adapt it into ${language} and use it (trimmed to fit the character budget if needed). If it does NOT, ignore it and instead write a short elegant summary of the trainer's qualifications in ${language}, within the same character budget.`
      : `The trainer left their personal welcome text empty. Write a short, elegant summary of the trainer's qualifications in ${language}, within the character budget, to stand in for it.`;

    const user = [
      `New client name: ${studentName || '(unknown)'}`,
      `Trainer name: ${trainerName || '(unknown)'}`,
      `Trainer motto/slogan ("lema"): ${motto || '(none provided — omit it from the message)'}`,
      `Trainer coaching archetype: ${archetype || '(unspecified)'}`,
      `Trainer experience: ${years !== null ? `${years} years` : '(unspecified)'}`,
      `Trainer certifications: ${certs.length ? certs.join(', ') : '(none listed)'}`,
      ``,
      promptRelevanceNote,
      ``,
      `Write the final welcome message now, in ${language}, as JSON: {"message": "..."}`,
    ].join('\n');

    const ctrl    = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 28_000);

    let messageText = '';
    try {
      const aiRes = await fetch('https://api.deepseek.com/chat/completions', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:       'deepseek-chat',
          max_tokens:  700,
          temperature: 0.6,
          messages: [
            { role: 'system', content: system },
            { role: 'user',   content: user   },
          ],
        }),
        signal: ctrl.signal,
      });

      const contentType = aiRes.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await aiRes.text().catch(() => '(unreadable body)');
        throw new Error(`DeepSeek returned non-JSON (${aiRes.status}): ${text.slice(0, 200)}`);
      }

      const data = await aiRes.json() as {
        choices?: { message?: { content?: string } }[];
        error?:   { message?: string };
      };
      if (!aiRes.ok) throw new Error(data.error?.message ?? 'DeepSeek request failed');

      const raw   = data.choices?.[0]?.message?.content?.trim() ?? '{}';
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI returned unexpected format');

      const parsed = JSON.parse(match[0]) as { message?: string };
      messageText = parsed.message?.trim() ?? '';
    } finally {
      clearTimeout(timeout);
    }

    if (!messageText) {
      await releaseAIOperation(operationKey);
      return res.status(502).json({ error: 'AI returned an empty welcome message' });
    }

    // ── Persist before acknowledging success ───────────────────────────────────
    const title = trainerName
      ? `${trainerName}`
      : 'Welcome to TrAIner';

    const logRes = await fetch(`${supabaseUrl}/rest/v1/notification_log`, {
      method:  'POST',
      headers: { ...restHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        to_user_id: studentId,
        from_user_id: trainerId,
        title,
        body:       messageText,
        type:       'trainer_welcome_message',
        entity_type: 'trainer_welcome_message',
        entity_id: trainerId,
      }),
    });
    if (!logRes.ok) {
      console.error('[send-welcome-message] notification_log insert failed:', logRes.status);
      await releaseAIOperation(operationKey);
      return res.status(502).json({ error: 'Welcome delivery could not be persisted' });
    }

    await completeAIOperation(operationKey);
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'send-welcome-message', outcome: 'succeeded', httpStatus: 200, provider: 'deepseek', model: 'deepseek-chat' });

    return res.status(200).json({ ok: true });

  } catch (err: unknown) {
    await releaseAIOperation(operationKey);
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[send-welcome-message] timed out');
      return res.status(504).json({ error: 'Generation timed out' });
    }
    console.error('[send-welcome-message]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'failed to send welcome message' });
  }
}
