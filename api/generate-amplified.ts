// POST /api/generate-amplified
// Input:  Partial<UserProfileV2> (WizardData)
// Output: { narrative: string; training_profile: object; risk_level: string }
// Uses DeepSeek to generate an AI-enriched Perfil Ampliado from the completed wizard data.

import {
  authServiceHeaders,
  authSupabaseUrl,
  hasJsonContentType,
  hasPersistedAIAdaptationConsent,
  verifyRequestUser,
} from './_lib/auth.js';
import { emitAIUsageEvent } from './_lib/aiTelemetry.js';

const SYSTEM_PROMPT = `You are an expert sports science AI for a personal training platform called TrAIner.
You receive a structured profile of a fitness client in JSON and must generate:
1. A "narrative" (2-3 sentences in English) summarising the client's trainability, safety considerations, and key opportunities.
2. A "training_profile" object with operational fields for the AI trainer.

Return ONLY valid JSON with this exact shape:
{
  "narrative": "string — 2-3 sentences in English",
  "training_profile": {
    "trainability_tier":   "beginner"|"intermediate"|"advanced",
    "priority_goal":       "string",
    "safety_flags":        ["string"],
    "recommended_modalities": ["string"],
    "session_duration_min": number,
    "intensity_ceiling":   "low"|"moderate"|"high",
    "progression_rate":    "conservative"|"standard"|"accelerated",
    "ai_notes":            "string — internal note for AI workout generation"
  }
}

Rules:
- Use safety flags for: comorbidities, pain restrictions, emotional history, R3/R4 risk
- intensity_ceiling: R0/R1 → "high", R2 → "moderate", R3/R4 → "low"
- progression_rate: R3/R4 or emotional history → "conservative"
- Be concise and clinical. Never mention sensitive data (medications, substance, psychiatric)
- narrative must be in English`;

interface VercelRequest  {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
}
interface VercelResponse {
  setHeader?(name: string, value: string): void;
  status(c: number): VercelResponse;
  json(b: unknown): VercelResponse;
}

declare const process: { env: Record<string, string | undefined> };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function allowedScalars(source: UnknownRecord, keys: readonly string[]): UnknownRecord {
  const result: UnknownRecord = {};
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') result[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if (typeof value === 'string' && value.length <= 80) result[key] = value;
    else if (Array.isArray(value) && value.length <= 20 && value.every(item => typeof item === 'string' && item.length <= 80)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Keeps only structured operational signals required for the AI profile.
 * Free text, voice transcripts, medications, emotional-health detail and raw
 * sensitive/cycle data are intentionally absent, even after valid consent.
 */
export function minimizeAmplifiedProfile(profile: UnknownRecord): UnknownRecord {
  return {
    basic_data:          allowedScalars(asRecord(profile.basic_data), ['age', 'biological_sex']),
    objectives:          allowedScalars(asRecord(profile.objectives), ['primary_goal', 'secondary_goals']),
    movement_history:    allowedScalars(asRecord(profile.movement_history), ['frequency', 'fitness_level', 'weekly_frequency', 'modalities', 'abandoned_before']),
    abandon_history:     allowedScalars(asRecord(profile.abandon_history), ['reasons', 'preferred_intensity', 'had_negative_experience', 'fear_of_injury', 'felt_gym_constraint']),
    declared_health:     allowedScalars(asRecord(profile.declared_health), ['has_condition', 'categories']),
    comorbidities:       allowedScalars(asRecord(profile.comorbidities), ['conditions']),
    functional_capacity: allowedScalars(asRecord(profile.functional_capacity), ['mobility', 'balance', 'autonomy', 'effort_tolerance', 'pain_level', 'access_level', 'support_resources', 'instruction_format']),
    habits:              allowedScalars(asRecord(profile.habits), ['lifestyle_barriers']),
    environment:         allowedScalars(asRecord(profile.environment), ['locations', 'equipment', 'accessibility']),
    availability:        allowedScalars(asRecord(profile.availability), ['days_per_week', 'session_duration_min', 'preferred_time', 'preferred_days', 'adherence_barriers']),
    preferences:         allowedScalars(asRecord(profile.preferences), ['preferred_intensity', 'training_company', 'preferred_language', 'explanation_level', 'focus', 'support_level']),
    risk:                allowedScalars(asRecord(profile.risk), ['level']),
  };
}

async function loadCallerProfile(userId: string): Promise<UnknownRecord | null> {
  const columns = [
    'basic_data', 'objectives', 'movement_history', 'abandon_history',
    'declared_health', 'comorbidities', 'functional_capacity', 'habits',
    'environment', 'availability', 'preferences', 'risk',
  ].join(',');
  try {
    const response = await fetch(
      `${authSupabaseUrl()}/rest/v1/profile_v2?select=${columns}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: authServiceHeaders() },
    );
    if (!response.ok) return null;
    const rows = await response.json() as UnknownRecord[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const caller = await verifyRequestUser(req);
  if (!caller) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!hasJsonContentType(req)) {
    res.status(415).json({ error: 'Content-Type must be application/json' });
    return;
  }

  if (!await hasPersistedAIAdaptationConsent(caller.id)) {
    res.status(403).json({ error: 'AI adaptation consent required' });
    return;
  }

  const profileData = await loadCallerProfile(caller.id);
  if (!profileData) {
    res.status(404).json({ error: 'Persisted profile not found' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
    return;
  }

  const safeProfile = minimizeAmplifiedProfile(profileData);

  const userContent = `Client profile:\n${JSON.stringify(safeProfile, null, 2)}\n\nGenerate the Amplified Profile.`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 22_000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'deepseek-chat',
        max_tokens:  1024,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userContent   },
        ],
      }),
      signal: ctrl.signal,
    });

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
      error?:   { message?: string };
      usage?:   { prompt_tokens?: number; completion_tokens?: number };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? 'DeepSeek request failed');
    }

    const raw = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned unexpected format');

    const result = JSON.parse(match[0]);
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-amplified', outcome: 'succeeded', httpStatus: 200, provider: 'deepseek', model: 'deepseek-chat', inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens });
    res.status(200).json(result);
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[generate-amplified] timed out');
      await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-amplified', outcome: 'provider_failed', httpStatus: 504, provider: 'deepseek', model: 'deepseek-chat' });
      res.status(504).json({ error: 'Generation timed out' });
    } else {
      console.error('[generate-amplified] provider request failed');
      await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-amplified', outcome: 'provider_failed', httpStatus: 500, provider: 'deepseek', model: 'deepseek-chat' });
      res.status(500).json({ error: 'generation failed' });
    }
  } finally {
    clearTimeout(timeout);
  }
}
