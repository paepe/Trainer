import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cached system prompt — stable across all requests, Anthropic caches this block
const SYSTEM_PROMPT = `You are an expert personal trainer AI assistant built into the TrAIner platform.
Your job is to generate safe, effective, personalised workout plans based on the client's profile and daily check-in data.

Core rules:
- NEVER prescribe exercises that load a body part the client reported as sore, unless it is very light mobility work
- Match intensity to energy level: 1-3 = recovery/mobility only, 4-6 = moderate compound + isolation, 7-10 = normal to high intensity
- Fit all exercises within the available time window (estimate 3-4 minutes per set including rest)
- Choose exercises appropriate to the reported location and available equipment
- Consider the client's primary goal (weight loss, hypertrophy, endurance, mobility) when selecting exercises and rep ranges

Output format:
Return ONLY a valid JSON array of 4-6 exercises. No markdown fences, no explanation, no preamble.
Each object must have exactly these keys:
{
  "exercise_name": "string",
  "muscle_group": "string — must be one of: Chest | Back | Shoulders | Arms | Core | Legs | Full body | Cardio",
  "sets": integer,
  "reps": integer,
  "load_kg": number or null (null for bodyweight exercises),
  "rest_seconds": integer,
  "notes": "one sentence — brief rationale for why this exercise fits today"
}`;

export default async function handler(req, res) {
  // CORS — required for Capacitor WebView
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { checkin, physicalProfile } = req.body || {};

  // Build client context
  const lines = [];

  if (physicalProfile) {
    lines.push('CLIENT PROFILE');
    lines.push(`Goal: ${physicalProfile.primary_goal || 'General fitness'}`);
    lines.push(`Fitness level: ${physicalProfile.fitness_level || 'intermediate'}`);
    lines.push(`Usual session length: ${physicalProfile.available_minutes || 45} min`);
    if (physicalProfile.equipment?.length) lines.push(`Equipment: ${physicalProfile.equipment.join(', ')}`);
    if (physicalProfile.restrictions?.length) lines.push(`Physical restrictions: ${physicalProfile.restrictions.join(', ')}`);
  }

  if (checkin) {
    lines.push('');
    lines.push("TODAY'S CHECK-IN");
    lines.push(`Energy: ${checkin.energy}/10`);
    const sore = (checkin.soreness || []).filter(s => s !== 'None');
    lines.push(`Soreness: ${sore.length ? sore.join(', ') : 'none'}`);
    lines.push(`Available today: ${checkin.minutes || 45} min`);
    lines.push(`Session goal: ${checkin.goal || 'general'}`);
    if (checkin.location) lines.push(`Location: ${checkin.location}`);
    if (checkin.sleep_quality) lines.push(`Sleep: ${checkin.sleep_quality}`);
  }

  const userContent = lines.length
    ? `Generate a workout plan for this client:\n\n${lines.join('\n')}\n\nReturn 4-6 exercises as a JSON array.`
    : 'Generate a balanced 45-minute intermediate full-body workout. Return 5 exercises as a JSON array.';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }, // cache stable system prompt
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';

    // Extract JSON array even if model adds surrounding text
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
    }

    const exercises = JSON.parse(match[0]);

    return res.status(200).json({
      exercises,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        cache_read: message.usage.cache_read_input_tokens ?? 0,
        cache_write: message.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    console.error('[generate-workout]', err);
    return res.status(500).json({ error: err.message || 'Failed to generate workout' });
  }
}
