// ── Inlined auth helpers (Vercel's Node.js function builder does not trace
// relative imports outside this file into the deployed bundle — confirmed in
// production; every api/* file must be self-contained, see generate-smart-workout.ts) ──
const TRAINER_ROLES = [
  'trainer', 'studio_trainer', 'studio_admin',
  'internal_trainer', 'technical_coordinator', 'studio_manager',
] as const;

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
  return { apikey: key, Authorization: `Bearer ${key}` };
}

interface AuthedUser { id: string; email: string | null }

async function verifyRequestUser(req: { headers?: Record<string, string | string[] | undefined> }): Promise<AuthedUser | null> {
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header?.startsWith('Bearer ')) return null;
  const jwt = header.slice('Bearer '.length).trim();
  if (!jwt) return null;

  const url = authSupabaseUrl();
  const key = authAnonKey();
  if (!url || !key) {
    console.error('[auth] SUPABASE_URL / SUPABASE_ANON_KEY not set — cannot verify callers');
    return null;
  }

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const user = await res.json() as { id?: string; email?: string };
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? null };
  } catch (err) {
    console.error('[auth] JWT verification failed:', (err as Error)?.message);
    return null;
  }
}

async function isTrainerRole(userId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${authSupabaseUrl()}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: authServiceHeaders() },
    );
    if (!res.ok) return false;
    const rows = await res.json() as { role?: string }[];
    const role = rows[0]?.role;
    return !!role && (TRAINER_ROLES as readonly string[]).includes(role);
  } catch {
    return false;
  }
}

async function hasActiveLink(userA: string, userB: string): Promise<boolean> {
  const a = encodeURIComponent(userA);
  const b = encodeURIComponent(userB);
  try {
    const res = await fetch(
      `${authSupabaseUrl()}/rest/v1/trainer_clients?select=id&status=eq.active&or=(and(trainer_id.eq.${a},client_id.eq.${b}),and(trainer_id.eq.${b},client_id.eq.${a}))&limit=1`,
      { headers: authServiceHeaders() },
    );
    if (!res.ok) return false;
    const rows = await res.json() as { id: string }[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

const SYSTEM_PROMPT = `You are an expert personal trainer AI assistant built into the TrAIner platform.
Your job is to generate safe, effective, personalised workout plans based on the client's profile and daily check-in data.

Core rules:
- NEVER prescribe exercises that load a body part the client reported as sore, unless it is very light mobility work
- Match intensity to energy level: 1-3 = recovery/mobility only, 4-6 = moderate compound + isolation, 7-10 = normal to high intensity
- Fit all exercises within the available time window (estimate 3-4 minutes per set including rest)
- Choose exercises appropriate to the reported location and available equipment
- Consider the client's primary goal (weight loss, hypertrophy, endurance, mobility) when selecting exercises and rep ranges

Language:
- CRITICAL: You MUST write every field in {lang}. This session is in {lang}. Never write in English when {lang} is requested.
- If the user prompt asks for Spanish, ALL text must be in Spanish.
- If the user prompt asks for German, ALL text must be in German.
- Default to English only if no language is specified.

Output format:
Return ONLY a valid JSON array of exercises (2-4 when complementing an existing plan, 4-6 otherwise). No markdown fences, no explanation, no preamble.
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

interface CheckInBody {
  energy?:        number;
  soreness?:      string[];
  minutes?:       number;
  goal?:          string;
  location?:      string;
  sleep_quality?: string;
  equipment?:     string[];
}

interface PhysicalProfileBody {
  primary_goal?:       string;
  fitness_level?:      string;
  available_minutes?:  number;
  equipment?:          string[];
  restrictions?:       string[];
}

interface ExistingExercise {
  exercise_name: string;
  muscle_group:  string;
  sets:          number;
  reps:          number;
}

interface RequestBody {
  checkin?:            CheckInBody;
  physicalProfile?:    PhysicalProfileBody;
  cycleContext?:       { phase: string; day: number; cycleLength: number };
  locale?:             string;
  existing_exercises?: ExistingExercise[];
  remaining_minutes?:  number;
}

interface VercelRequest {
  method?: string;
  body?: RequestBody;
  headers?: Record<string, string | string[] | undefined>;
}

declare const process: {
  env: Record<string, string | undefined>;
};


interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  end(): void;
  setHeader(name: string, value: string): void;
}

interface PhaseGuidance {
  Menstrual: string;
  Follicular: string;
  Ovulatory: string;
  Luteal: string;
  [key: string]: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — required for Capacitor WebView
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Generation costs money — only authenticated users may invoke the LLM.
  const caller = await verifyRequestUser(req);
  if (!caller) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI service not configured.' });
    return;
  }

  const { checkin, physicalProfile, cycleContext, existing_exercises, remaining_minutes } = req.body || {};
  const locale = req.body?.locale ?? 'en';

  // Build client context
  const lines: string[] = [];

  if (physicalProfile) {
    lines.push('CLIENT PROFILE');
    lines.push(`Goal: ${physicalProfile.primary_goal || 'General fitness'}`);
    lines.push(`Fitness level: ${physicalProfile.fitness_level || 'intermediate'}`);
    lines.push(`Usual session length: ${physicalProfile.available_minutes || 45} min`);
    if (physicalProfile.equipment?.length) {
      lines.push(`Equipment: ${physicalProfile.equipment.join(', ')}`);
    }
    if (physicalProfile.restrictions?.length) {
      lines.push(`Physical restrictions: ${physicalProfile.restrictions.join(', ')}`);
    }
  }

  if (checkin) {
    lines.push('');
    lines.push("TODAY'S CHECK-IN");
    lines.push(`Energy: ${checkin.energy}/10`);
    const sore = (checkin.soreness || []).filter((s: string) => s !== 'None');
    lines.push(`Soreness: ${sore.length ? sore.join(', ') : 'none'}`);
    lines.push(`Available today: ${checkin.minutes || 45} min`);
    lines.push(`Session goal: ${checkin.goal || 'general'}`);
    if (checkin.location) {
      lines.push(`Location: ${checkin.location}`);
    }
    if (checkin.sleep_quality) {
      lines.push(`Sleep quality: ${checkin.sleep_quality}`);
    }
    if (checkin.equipment?.length) {
      lines.push(`Available equipment: ${checkin.equipment.join(', ')}`);
    }
  }

  if (existing_exercises?.length) {
    lines.push('');
    lines.push('EXERCISES ALREADY IN PLAN (DO NOT REPEAT)');
    const musclesUsed = [...new Set(existing_exercises.map(e => e.muscle_group).filter(Boolean))];
    existing_exercises.forEach(e => {
      lines.push(`- ${e.exercise_name} (${e.muscle_group}) ${e.sets}×${e.reps}`);
    });
    if (musclesUsed.length) {
      lines.push(`Muscle groups already covered: ${musclesUsed.join(', ')}`);
    }
    lines.push(`Time already accounted for: ${existing_exercises.reduce((acc, e) => acc + e.sets * 3, 0)} min (estimated)`);
    if (remaining_minutes != null) {
      lines.push(`Remaining time budget: ${remaining_minutes} min`);
      lines.push(`IMPORTANT: Generate only exercises that fit within the ${remaining_minutes}-minute remaining budget. Prioritise muscle groups NOT yet covered.`);
    }
  }

  if (cycleContext?.phase) {
    lines.push('');
    lines.push('CYCLE CONTEXT');
    lines.push(`Current phase: ${cycleContext.phase} (day ${cycleContext.day} of ${cycleContext.cycleLength})`);
    lines.push('Phase-specific guidance:');
    const phaseGuidance: PhaseGuidance = {
      Menstrual:  'Lower intensity preferred. Prioritise mobility, gentle yoga, light walking. Avoid heavy compound lifts.',
      Follicular: 'Rising energy. Good for strength training and progressive overload. Introduce new movements.',
      Ovulatory:  'Peak energy and strength. Push intensity. High-power exercises, HIIT, and PRs are appropriate.',
      Luteal:     'Moderate and consistent. Steady-state cardio and moderate weights. Avoid maximal efforts late in phase.',
    };
    lines.push(phaseGuidance[cycleContext.phase] || 'Adapt to current energy reported in check-in.');
  }

  const userContent = lines.length
    ? `LANGUAGE: Generate ALL content in ${locale === 'pt' || locale === 'pt-BR' ? 'Portuguese (Brazil)' : locale === 'es' || locale === 'es-ES' ? 'Spanish' : locale === 'de' || locale === 'de-DE' ? 'German' : 'English'}. No English text at all.

Generate a workout plan for this client:\n\n${lines.join('\n')}\n\nReturn 4-6 exercises as a JSON array.`
    : `Generate a balanced 45-minute intermediate full-body workout. Return 5 exercises as a JSON array.`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 25_000);

  const langName = locale === 'pt' || locale === 'pt-BR' ? 'Portuguese (Brazil)' : locale === 'es' || locale === 'es-ES' ? 'Spanish' : locale === 'de' || locale === 'de-DE' ? 'German' : 'English';

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT.replace(/{lang}/g, langName) },
          { role: 'user',   content: userContent   },
        ],
      }),
      signal: ctrl.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '(unreadable body)');
      throw new Error(`DeepSeek returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'DeepSeek request failed');
    }

    const text = data.choices?.[0]?.message?.content?.trim() ?? '';

    // Extract JSON array even if model adds surrounding text
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
      return;
    }

    const exercises = JSON.parse(match[0]);

    res.status(200).json({
      exercises,
      usage: {
        input_tokens:  data.usage?.prompt_tokens     ?? 0,
        output_tokens: data.usage?.completion_tokens ?? 0,
      },
    });
    return;
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[generate-workout] timed out');
      res.status(504).json({ error: 'Workout generation timed out' });
    } else {
      console.error('[generate-workout]', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate workout' });
    }
  } finally {
    clearTimeout(timeout);
  }
}
