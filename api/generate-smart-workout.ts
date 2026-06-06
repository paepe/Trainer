// POST /api/generate-smart-workout
// Input:  SmartWorkoutRequest  (trainer + client + today + stats + library + task)
// Output: SmartWorkoutResponse (workout | objectives | insight + usage + context_snapshot)
// Uses DeepSeek deepseek-chat. No Supabase calls — client pre-fetches and sends data.
// LGPD: sensitive_factors and body_rhythm raw data must be stripped client-side before sending.

import type { SmartWorkoutRequest, SmartWorkoutResponse } from '../src/ai/types';
import { buildPrompt } from '../src/ai/buildPrompt';

interface VercelRequest  { method?: string; body?: SmartWorkoutRequest }
interface VercelResponse { status(c: number): VercelResponse; json(b: unknown): VercelResponse }

declare const process: { env: Record<string, string | undefined> };

const MAX_TOKENS: Record<string, number> = {
  generate_workout:   2048,
  suggest_objectives: 1536,
  daily_insight:       512,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  if (!body?.trainer || !body?.client || !body?.today || !body?.task) {
    return res.status(400).json({ error: 'trainer, client, today, and task are required' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
  }

  // Safety gate: if AI-led session is blocked, return early
  if (body.today.aiLedBlocked || body.today.safetyStatus === 'blocked') {
    const snapshot = {
      readinessScore: body.today.readinessScore,
      safetyStatus:   body.today.safetyStatus,
      adaptations:    ['AI-led session blocked by safety gate'],
    };
    const blockResponse: SmartWorkoutResponse = {
      insight: {
        title:  'Safety Gate Active',
        body:   'Your check-in data indicates this is not a safe moment for an AI-led session. Please consult your trainer before proceeding.',
        action: 'Contact your trainer for guidance.',
        tone:   'empathetic',
      },
      usage: { input_tokens: 0, output_tokens: 0 },
      context_snapshot: snapshot,
    };
    return res.status(200).json(blockResponse);
  }

  const ctx = {
    ...body,
    contextVersion: '1.0' as const,
    builtAt: new Date().toISOString(),
  };

  const { system, user } = buildPrompt(ctx);
  const maxTokens = MAX_TOKENS[body.task.type] ?? 1024;

  const ctrl    = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 28_000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'deepseek-chat',
        max_tokens:  maxTokens,
        temperature: 0.45,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user   },
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
      usage?:   { prompt_tokens?: number; completion_tokens?: number };
      error?:   { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? 'DeepSeek request failed');
    }

    const raw   = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned unexpected format');

    const parsed = JSON.parse(match[0]) as Partial<SmartWorkoutResponse>;

    // Inject real token counts
    const usage = {
      input_tokens:  data.usage?.prompt_tokens     ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    };
    const context_snapshot = parsed.context_snapshot ?? {
      readinessScore: body.today.readinessScore,
      safetyStatus:   body.today.safetyStatus,
      adaptations:    [],
    };

    return res.status(200).json({ ...parsed, usage, context_snapshot });

  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[generate-smart-workout] timed out');
      return res.status(504).json({ error: 'Generation timed out' });
    }
    console.error('[generate-smart-workout]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'generation failed' });
  } finally {
    clearTimeout(timeout);
  }
}
