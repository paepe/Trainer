// POST /api/classify-exercises
// Classifies a batch of exercises as 'fitness', 'performance', or 'mobility'
// using AI domain knowledge. Results are cached by the caller in exercises.exercise_category.
//
// Design: stateless — no DB writes here. The hook (useExerciseClassification)
// is responsible for persisting the result. This endpoint is pure classification.
//
// Input:  { exercises: Array<{ id: string; name: string; muscle_group: string }> }
// Output: { classifications: Array<{ id: string; category: 'fitness' | 'performance' | 'mobility' }> }
//
// Batch limit: 50 exercises per call (enforced server-side).
// Model: Haiku-equivalent (fast, cheap — simple classification task).

import { hasJsonContentType, isTrainerRole, verifyRequestUser } from './_lib/auth.js';
import { emitAIUsageEvent } from './_lib/aiTelemetry.js';
import { isJsonObject, isJsonValueWithinLimit } from './_lib/requestSize.js';

const SYSTEM_PROMPT = `You are a sports science expert. Classify each exercise into exactly one category:

- fitness: general strength, hypertrophy, endurance, flexibility, mobility, and health-oriented exercises
  (e.g. Squat, Bench Press, Deadlift, Plank, Row, Bicep Curl, Yoga stretch, Swimming laps)

- performance: sport-specific, power, speed, agility, and athletic development exercises
  (e.g. Sprint, Box Jump, Olympic lifts, ATL/CTL training, Plyometrics, Agility ladder, Throw)

- mobility: dedicated range-of-motion, stretching, and joint health exercises
  (e.g. Hip flexor stretch, Foam roll, PNF stretch, Thoracic rotation, Joint circles)

Rules:
- When in doubt between fitness and performance, choose fitness
- Compound movements like Squat or Deadlift are fitness unless explicitly athletic/power-focused
- Return ONLY valid JSON — no markdown, no explanation, no preamble`;

type ExerciseInput = { id: string; name: string; muscle_group: string };
type Category = 'fitness' | 'performance' | 'mobility';
type Classification = { id: string; category: Category };

const VALID_CATEGORIES = new Set<string>(['fitness', 'performance', 'mobility']);
const MAX_BATCH = 50;
const MAX_NAME_CHARS = 200;
const MAX_MUSCLE_GROUP_CHARS = 80;
// Bounds any fields not represented in the classified exercise schema before
// the role lookup or provider request can consume resources.
export const MAX_CLASSIFY_REQUEST_CHARS = 24_000;

export default async function handler(req: any, res: any) {
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await verifyRequestUser(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });
  if (!hasJsonContentType(req)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'rejected', httpStatus: 415, rejectionCode: 'invalid_content_type' });
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  if (!isJsonValueWithinLimit(req.body, MAX_CLASSIFY_REQUEST_CHARS)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'rejected', httpStatus: 413, rejectionCode: 'payload_too_large' });
    return res.status(413).json({ error: 'Request exceeds maximum size' });
  }
  if (!isJsonObject(req.body)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'rejected', httpStatus: 400, rejectionCode: 'invalid_payload' });
    return res.status(400).json({ error: 'JSON object body required' });
  }
  if (!await isTrainerRole(caller.id)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'rejected', httpStatus: 403, rejectionCode: 'role_denied' });
    return res.status(403).json({ error: 'Trainer role required' });
  }

  const { exercises } = req.body || {};
  if (!Array.isArray(exercises) || exercises.length === 0) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'rejected', httpStatus: 400, rejectionCode: 'invalid_payload' });
    return res.status(400).json({ error: 'exercises array required' });
  }
  if (exercises.length > MAX_BATCH) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'rejected', httpStatus: 400, rejectionCode: 'batch_limit_exceeded' });
    return res.status(400).json({ error: `Maximum ${MAX_BATCH} exercises per call` });
  }
  const validExercises = exercises.every((exercise: unknown) => {
    if (!exercise || typeof exercise !== 'object') return false;
    const value = exercise as Partial<ExerciseInput>;
    return typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 128
      && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= MAX_NAME_CHARS
      && typeof value.muscle_group === 'string' && value.muscle_group.length <= MAX_MUSCLE_GROUP_CHARS;
  });
  if (!validExercises) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'rejected', httpStatus: 400, rejectionCode: 'invalid_payload' });
    return res.status(400).json({ error: 'invalid exercise input' });
  }

  const apiKey  = process.env.DEEPSEEK_API_KEY || '';
  if (!apiKey) return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });

  const userPrompt = `Classify these exercises. Return a JSON object with key "classifications" — an array where each item has "id" (string, unchanged from input) and "category" (one of: fitness, performance, mobility).

Exercises:
${(exercises as ExerciseInput[]).map(e => `- id: "${e.id}" | name: "${e.name}" | muscle_group: "${e.muscle_group}"`).join('\n')}

Expected output format:
{"classifications":[{"id":"<id>","category":"<category>"},...]}`  ;

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
        max_tokens:  512,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userPrompt    },
        ],
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '(unreadable)');
      return res.status(502).json({ error: `AI returned non-JSON (${response.status}): ${text.slice(0, 200)}` });
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
      error?:   { message?: string };
      usage?:   { prompt_tokens?: number; completion_tokens?: number };
    };

    if (!response.ok) {
      return res.status(502).json({ error: data.error?.message ?? 'AI request failed' });
    }

    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    // Non-greedy match — stops at first closing brace that completes the object.
    // Falls back to greedy if non-greedy produces invalid JSON (e.g. nested objects).
    const match = raw.match(/\{[\s\S]*?\}(?=\s*$)/) ?? raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(502).json({ error: 'AI response did not contain valid JSON' });
    }

    let parsed: { classifications?: Classification[] };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return res.status(502).json({ error: 'AI response contained malformed JSON' });
    }
    const classifications: Classification[] = (parsed.classifications ?? []).filter(
      (c): c is Classification =>
        typeof c.id === 'string' &&
        typeof c.category === 'string' &&
        VALID_CATEGORIES.has(c.category),
    );

    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'succeeded', httpStatus: 200, provider: 'deepseek', model: 'deepseek-chat', inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens });

    return res.status(200).json({ classifications });

  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = (err as Error)?.name === 'AbortError';
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'classify-exercises', outcome: 'provider_failed', httpStatus: isTimeout ? 504 : 500, provider: 'deepseek', model: 'deepseek-chat' });
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? 'Classification request timed out' : String(err),
    });
  }
}
