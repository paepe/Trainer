// POST /api/parse-voice
// Input:  { transcript: string }
// Output: { extracted: Partial<CheckInDetailed> }
// Uses DeepSeek to parse free-form voice check-in into structured fields.

import { hasJsonContentType, verifyRequestUser } from './_lib/auth.js';
import { resolveUserEntitlements } from './_lib/entitlements.js';
import { emitAIUsageEvent } from './_lib/aiTelemetry.js';
import { isJsonObject, isJsonValueWithinLimit } from './_lib/requestSize.js';
import { rejectUnauthenticatedAIBurst } from './_lib/preAuthRateLimit.js';
import { rejectPostAuthAIBurst } from './_lib/postAuthRateLimit.js';

export const MAX_PARSE_VOICE_REQUEST_CHARS = 8_000;

const SYSTEM_PROMPT = `You are a structured data extractor for a fitness app.
The user has spoken a free-form daily check-in. Extract the following fields if mentioned.
Return ONLY valid JSON. No markdown, no explanation, no extra keys.

JSON schema (all fields optional):
{
  "energy":            number 1-10,
  "sleep_quality":     "poor" | "regular" | "good" | "excellent",
  "sleep_hours":       number,
  "pain": {
    "present":  boolean,
    "region":   "cervical"|"shoulder"|"lumbar"|"hip"|"knee"|"ankle"|"wrist"|"elbow"|"other",
    "intensity": number 1-10
  },
  "fatigue":           number 1-10,
  "available_minutes": number,
  "location_today":    "gym"|"home"|"studio"|"park"|"online",
  "emotional_state":   "calm"|"neutral"|"motivated"|"stressed"|"anxious"|"discouraged"
}

Rules:
- energy 1-10: map "excellent"→9, "good"→7, "ok"→5, "poor"→3
- "slept poorly" → sleep_quality: "poor"; "slept well" → "good"
- If no pain mentioned: pain.present = false, omit region/intensity
- If only minutes given (e.g. "30 minutes"): available_minutes = 30
- "at home" → location_today: "home"; "the gym" → "gym"`;

interface VercelRequest  {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: { transcript?: string };
}
interface VercelResponse {
  setHeader?(name: string, value: string): void;
  status(c: number): VercelResponse;
  json(b: unknown): VercelResponse;
}

declare const process: { env: Record<string, string | undefined> };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const caller = await verifyRequestUser(req);
  if (!caller) {
    if (await rejectUnauthenticatedAIBurst(req, res)) return;
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (await rejectPostAuthAIBurst(caller.id, 'parse-voice', res)) return;
  if (!hasJsonContentType(req)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'rejected', httpStatus: 415, rejectionCode: 'invalid_content_type' });
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  if (!isJsonValueWithinLimit(req.body, MAX_PARSE_VOICE_REQUEST_CHARS)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'rejected', httpStatus: 413, rejectionCode: 'payload_too_large' });
    return res.status(413).json({ error: 'Request exceeds maximum size' });
  }
  if (!isJsonObject(req.body)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'rejected', httpStatus: 400, rejectionCode: 'invalid_payload' });
    return res.status(400).json({ error: 'JSON object body required' });
  }

  const entitlements = await resolveUserEntitlements(caller.id);
  if (!entitlements['checkin.voice_input'].allowed || !entitlements['ai.checkin_interpretation'].allowed) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'rejected', httpStatus: 403, rejectionCode: 'entitlement_denied' });
    res.status(403).json({ error: 'Voice check-in interpretation is not available for this account' });
    return;
  }

  const transcript = req.body?.transcript?.trim();
  if (!transcript) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'rejected', httpStatus: 400, rejectionCode: 'invalid_payload' });
    res.status(400).json({ error: 'transcript required' });
    return;
  }
  if (transcript.length > 4_000) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'rejected', httpStatus: 413, rejectionCode: 'payload_too_large' });
    res.status(413).json({ error: 'transcript exceeds maximum length' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
    return;
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15_000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      'deepseek-chat',
        max_tokens: 512,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: `User said: "${transcript}"` },
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
    const extracted = match ? JSON.parse(match[0]) : {};

    if (Object.keys(extracted).length === 0) {
      console.warn('[parse-voice] extracted empty');
      res.status(422).json({ error: 'Could not extract health data from the transcript. Try speaking more clearly.' });
      return;
    }

    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'succeeded', httpStatus: 200, provider: 'deepseek', model: 'deepseek-chat', inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens });
    res.status(200).json({ extracted });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[parse-voice] timed out');
      await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'provider_failed', httpStatus: 504, provider: 'deepseek', model: 'deepseek-chat' });
      res.status(504).json({ error: 'Parsing timed out' });
    } else {
      console.error('[parse-voice] provider request failed');
      await emitAIUsageEvent({ actorId: caller.id, endpoint: 'parse-voice', outcome: 'provider_failed', httpStatus: 500, provider: 'deepseek', model: 'deepseek-chat' });
      res.status(500).json({ error: 'parse failed' });
    }
  } finally {
    clearTimeout(timeout);
  }
}
