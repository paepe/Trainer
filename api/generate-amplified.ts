// POST /api/generate-amplified
// Input:  Partial<UserProfileV2> (WizardData)
// Output: { narrative: string; training_profile: object; risk_level: string }
// Uses DeepSeek to generate an AI-enriched Perfil Ampliado from the completed wizard data.

const SYSTEM_PROMPT = `You are an expert sports science AI for a Brazilian personal training platform called TrAIner.
You receive a structured profile of a fitness client in JSON and must generate:
1. A "narrative" (2-3 sentences in Portuguese) summarising the client's trainability, safety considerations, and key opportunities.
2. A "training_profile" object with operational fields for the AI trainer.

Return ONLY valid JSON with this exact shape:
{
  "narrative": "string — 2-3 sentences PT-BR",
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
- narrative must be in Brazilian Portuguese`;

interface VercelRequest  { method?: string; body?: Record<string, unknown> }
interface VercelResponse { status(c: number): VercelResponse; json(b: unknown): VercelResponse }

declare const process: { env: Record<string, string | undefined> };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const profileData = req.body;
  if (!profileData) {
    res.status(400).json({ error: 'profile data required' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
    return;
  }

  // Strip T3/T4 sensitive tiers before sending to AI
  const { sensitive_factors: _sf, body_rhythm: _br, ...safeProfile } = profileData as {
    sensitive_factors?: unknown;
    body_rhythm?:       unknown;
    [key: string]:      unknown;
  };

  const userContent = `Client profile:\n${JSON.stringify(safeProfile, null, 2)}\n\nGenerate the Perfil Ampliado.`;

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
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? 'DeepSeek request failed');
    }

    const raw = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned unexpected format');

    const result = JSON.parse(match[0]);
    res.status(200).json(result);
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[generate-amplified] timed out');
      res.status(504).json({ error: 'Generation timed out' });
    } else {
      console.error('[generate-amplified]', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'generation failed' });
    }
  } finally {
    clearTimeout(timeout);
  }
}
