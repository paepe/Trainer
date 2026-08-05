// POST /api/cleanup-voice-note
// Input:  { transcript: string, locale?: string }
// Output: { cleaned: string }
// Some on-device speech engines (notably mobile) re-emit overlapping/rephrased
// segments for the same utterance, producing "stutter echo" transcripts like
// "meu objetivo é perdermeu objetivo é perder pesomeu objetivo é perder peso".
// This endpoint asks DeepSeek to collapse that into the coherent sentence the
// speaker actually meant — without inventing content. Used as a pre-save pass
// for free-text voice notes (client onboarding wizard, coach-dna free prompt).

import { hasPersistedAIAdaptationConsent, isTrainerRole, verifyRequestUser } from './_lib/auth.js';
import { resolveUserEntitlements } from './_lib/entitlements.js';

const SYSTEM_PROMPT = `You clean up raw speech-to-text transcripts that contain "stutter echo" —
repeated/overlapping fragments from an on-device recognizer re-emitting the same phrase
multiple times mid-sentence (e.g. "meu objetivo é perdermeu objetivo é perder pesomeu
objetivo é perder peso" -> "meu objetivo é perder peso").

Rules:
- Collapse repeated/overlapping fragments into the single coherent sentence(s) the speaker meant.
- Preserve the speaker's own words, language, and meaning — do not paraphrase, summarize,
  translate, or add any information that wasn't said.
- If the transcript has no echo and is already coherent, return it unchanged (only trim whitespace).
- If the transcript is too garbled to confidently reconstruct, return your best-effort
  cleaned version rather than inventing content.
- Output STRICT JSON only: {"cleaned": string}. No markdown, no commentary, no extra keys.`;

type CleanupPurpose = 'checkin' | 'coach_dna' | 'trainer_workout_note' | 'onboarding';

interface VercelRequest  {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: { transcript?: string; locale?: string; purpose?: CleanupPurpose };
}
interface VercelResponse { status(c: number): VercelResponse; json(b: unknown): VercelResponse }

declare const process: { env: Record<string, string | undefined> };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await verifyRequestUser(req);
  if (!caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const transcript = req.body?.transcript?.trim();
  if (!transcript) {
    return res.status(400).json({ error: 'transcript required' });
  }

  const purpose = req.body?.purpose;
  if (!purpose || !['checkin', 'coach_dna', 'trainer_workout_note', 'onboarding'].includes(purpose)) {
    return res.status(400).json({ error: 'valid cleanup purpose required' });
  }
  if (transcript.length > 4_000) {
    return res.status(413).json({ error: 'transcript exceeds maximum length' });
  }

  // Onboarding can contain health, medication, and other sensitive free text.
  // The server verifies persisted consent rather than trusting the client state.
  if (purpose === 'onboarding' && !await hasPersistedAIAdaptationConsent(caller.id)) {
    return res.status(403).json({ error: 'AI adaptation consent required' });
  }
  if (purpose === 'checkin') {
    const entitlements = await resolveUserEntitlements(caller.id);
    if (!entitlements['checkin.voice_input'].allowed) {
      return res.status(403).json({ error: 'Voice check-in is not available for this account' });
    }
  }
  if (purpose === 'coach_dna' || purpose === 'trainer_workout_note') {
    if (!await isTrainerRole(caller.id)) {
      return res.status(403).json({ error: 'Trainer role required' });
    }
    if (purpose === 'coach_dna') {
      const entitlements = await resolveUserEntitlements(caller.id);
      if (!entitlements.coach_dna.allowed) {
        return res.status(403).json({ error: 'Coach DNA is not available for this account' });
      }
    }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
  }

  const ctrl    = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'deepseek-chat',
        max_tokens:  Math.min(2048, Math.ceil(transcript.length * 1.5)),
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: `Raw transcript: "${transcript}"` },
        ],
      }),
      signal: ctrl.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '(unreadable body)');
      throw new Error(`DeepSeek returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
      error?:   { message?: string };
    };
    if (!response.ok) {
      throw new Error(data.error?.message ?? 'DeepSeek request failed');
    }

    const raw   = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned unexpected format');

    const parsed  = JSON.parse(match[0]) as { cleaned?: string };
    const cleaned = parsed.cleaned?.trim();

    return res.status(200).json({ cleaned: cleaned || transcript });

  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[cleanup-voice-note] timed out');
      return res.status(504).json({ error: 'Cleanup timed out' });
    }
    console.error('[cleanup-voice-note]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'cleanup failed' });
  } finally {
    clearTimeout(timeout);
  }
}
