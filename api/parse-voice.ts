// POST /api/parse-voice
// Input:  { transcript: string }
// Output: { extracted: Partial<CheckInDetailed> }
// Uses DeepSeek to parse free-form Portuguese voice check-in into structured fields.

const SYSTEM_PROMPT = `You are a structured data extractor for a Brazilian Portuguese fitness app.
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
- energia/energy 1-10: map "ótimo"→9, "bom"→7, "ok"→5, "ruim"→3
- "dormiu mal" → sleep_quality: "poor"; "dormiu bem" → "good"
- If no pain mentioned: pain.present = false, omit region/intensity
- If only minutes given (e.g. "30 minutos"): available_minutes = 30
- "em casa" → location_today: "home"; "academia" → "gym"`;

interface VercelRequest  { method?: string; body?: { transcript?: string } }
interface VercelResponse { status(c: number): VercelResponse; json(b: unknown): VercelResponse }

declare const process: { env: Record<string, string | undefined> };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const transcript = req.body?.transcript?.trim();
  if (!transcript) {
    res.status(400).json({ error: 'transcript required' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
    return;
  }

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
    const extracted = match ? JSON.parse(match[0]) : {};

    res.status(200).json({ extracted });
  } catch (err: unknown) {
    console.error('[parse-voice]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'parse failed' });
  }
}
