// Auth helpers moved to api/_lib/auth — Fase 2 of
// docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md. Cross-file relative
// imports inside api/ are traced into the deployed bundle by Vercel's
// function builder (confirmed via build-output inspection, Fase 0/2 of the
// same plan); the "self-contained" premise this file used to carry is
// disproven.
import { hasJsonContentType, verifyRequestUser } from './_lib/auth.js';
import { countSessionsThisWeek, isSessionsPerWeekCapReached, resolveUserEntitlements } from './_lib/entitlements.js';
import { emitAIUsageEvent } from './_lib/aiTelemetry.js';
import { isJsonObject } from './_lib/requestSize.js';
import { rejectUnauthenticatedAIBurst } from './_lib/preAuthRateLimit.js';
import { rejectPostAuthAIBurst } from './_lib/postAuthRateLimit.js';

const SYSTEM_PROMPT = `You are an expert personal trainer AI assistant built into the TrAIner platform.
Your job is to generate safe, effective, personalised workout plans based on the client's profile and daily check-in data.

Core rules:
- NEVER prescribe exercises that load a body part the client reported as sore, unless it is very light mobility work
- Match intensity to energy level: 1-3 = recovery/mobility only, 4-6 = moderate compound + isolation, 7-10 = normal to high intensity
- TIME MODEL (use exactly this arithmetic — the app scores your plan with the same formula):
  one set costs (active_seconds + rest_seconds), where active_seconds is 40 for a rep-based set
  and duration_seconds for a hold/duration-based set. An exercise costs sets x (active_seconds + rest_seconds).
  The plan total is the sum over all exercises. Use the rest_seconds YOU assign to each exercise
  in this calculation, and make the total land inside the requested time window
- Choose exercises appropriate to the reported location and available equipment
- Consider the client's primary goal (weight loss, hypertrophy, endurance, mobility) when selecting exercises and rep ranges
- For isometric, breathing, or hold-based exercises (e.g. plank, neck rotations, diaphragmatic breathing) with no meaningful rep count, set "reps" to null and "duration_seconds" to the hold/execution time in seconds. Every exercise MUST have either "reps" or "duration_seconds" set — never both null
- SESSION STRUCTURE: a workout is a complete session, not a list of lifts. The user message states
  the exact block sequence for this trainer — follow it, in that order, and tag every exercise with
  the block it belongs to in "phase". Block meanings:
    mobility     — joint preparation and range of motion
    warmup       — raising temperature and heart rate, progressive activation
    technique    — motor pattern work at low load, before the heavy sets
    strength     — the main resistance block
    conditioning — metabolic or endurance work
    cooldown     — recovery, stretching, breathing, low-intensity return
  Every declared block must be represented by at least one exercise. Preparation and recovery
  blocks belong to the time budget like any other exercise, so account for them in the arithmetic
  above. As a default split, allow roughly 15-25% of the session for the preparation blocks
  (mobility/warmup/technique) and 10-15% for the cool-down, adjusted to goal, energy and soreness.

Language:
- CRITICAL: You MUST write every field in {lang}. This session is in {lang}. Never write in English when {lang} is requested.
- If the user prompt asks for Spanish, ALL text must be in Spanish.
- If the user prompt asks for German, ALL text must be in German.
- Default to English only if no language is specified.

Output format:
Return ONLY a valid JSON array of exercises. No markdown fences, no explanation, no preamble.
The array length is not fixed — it must be whatever it takes to use close to the client's full
available time window (see the exact target and suggested count in the user message). Do not
stop early just to keep the list short, and do not pad it past the time budget either.
Each object must have exactly these keys:
{
  "exercise_name": "string",
  "muscle_group": "string — must be one of: Chest | Back | Shoulders | Arms | Core | Legs | Full body | Cardio",
  "phase": "string — must be one of the blocks listed in the SESSION STRUCTURE line of the user message, spelled exactly as given there",
  "sets": integer,
  "reps": integer or null (null for hold/duration-based exercises),
  "duration_seconds": integer or null (hold/execution time in seconds; null when reps is set),
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
  exercise_name:     string;
  muscle_group:      string;
  sets:              number;
  reps:              number | null;
  duration_seconds?: number | null;
  rest_seconds?:     number;
}

interface TimedExercise {
  sets?:             number | null;
  reps?:             number | null;
  duration_seconds?: number | null;
  rest_seconds?:     number | null;
  phase?:            string | null;
}

// Single time model, shared verbatim with the client (estimateExerciseSeconds
// in WorkoutPlanEditorScreen) and with the TIME MODEL rule in SYSTEM_PROMPT:
// active time is the hold duration when set, otherwise 40s per rep-based set;
// rest defaults to 30s only when the field is absent (0 is a valid rest).
function estimateExerciseMinutes(e: TimedExercise): number {
  const sets   = e.sets ?? 1;
  const active = e.duration_seconds ?? 40;
  const rest   = e.rest_seconds ?? 30;
  return (sets * (active + rest)) / 60;
}

// Budget band and the ceiling on sets a short batch may be padded to.
// (Duplicated in generate-smart-workout.ts — api/* files must stay
// self-contained, see the header note.)
const FILL_FLOOR      = 0.9;
const FILL_CEILING    = 1.1;
const MAX_PADDED_SETS = 5;

// ── Session structure ─────────────────────────────────────────────────────────
// Mirrors src/lib/sessionStructure.ts, which in turn mirrors the Coach DNA
// wizard blocks the trainer actually configures (coach_dna.structure.order).
// Duplicated here because api/* handlers must stay self-contained.
const SESSION_BLOCKS = ['mobility', 'warmup', 'technique', 'strength', 'conditioning', 'cooldown'] as const;
const DEFAULT_SESSION_ORDER = ['warmup', 'strength', 'conditioning', 'cooldown'];
// Only the working blocks absorb time fitting; the rest are prescriptive.
const ADJUSTABLE_BLOCKS = new Set<string>(['strength', 'conditioning']);
// v1 emitted warmup | main | cooldown. Bumped with the prompt that replaced it
// (directive §6.3 — response schemas are versioned alongside prompt changes).
const PHASE_SCHEMA_VERSION = 2;

const KNOWN_BLOCKS = new Set<string>(SESSION_BLOCKS);

/** Maps any phase value onto the canonical vocabulary; v1's `main` degrades to `strength`. */
function normalizeBlock(phase: string | null | undefined): string {
  if (!phase) return 'strength';
  const key = String(phase).toLowerCase().trim();
  if (key === 'main') return 'strength';
  return KNOWN_BLOCKS.has(key) ? key : 'strength';
}

/** Keeps only known blocks, preserving the trainer's declared order. */
function sanitizeSessionOrder(order: string[] | undefined): string[] {
  if (!order?.length) return DEFAULT_SESSION_ORDER;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of order) {
    const key = String(raw ?? '').toLowerCase().trim();
    if (KNOWN_BLOCKS.has(key) && !seen.has(key)) { seen.add(key); cleaned.push(key); }
  }
  return cleaned.length ? cleaned : DEFAULT_SESSION_ORDER;
}

const totalMinutesOf = (list: TimedExercise[]): number =>
  list.reduce((acc, e) => acc + estimateExerciseMinutes(e), 0);

// Warm-up and cool-down are prescriptive: they are never dropped to make room,
// nor inflated to fill time. Only the main block absorbs the fitting.
const isAdjustable = (e: TimedExercise): boolean => ADJUSTABLE_BLOCKS.has(normalizeBlock(e.phase));

/**
 * Makes the returned batch actually occupy its time budget, rather than hoping
 * the LLM's arithmetic lands there. Measured live, the model runs 86-146% of
 * the budget, so neither direction can be left to the prompt:
 *   - over the ceiling -> drop main-block exercises from the end;
 *   - under the floor  -> add sets round-robin over the main block, capped at
 *     MAX_PADDED_SETS and never crossing the ceiling.
 * Session order is preserved, so a warm-up stays first and a cool-down last.
 * If the batch is still short after that (e.g. a single exercise already at the
 * set cap), it is returned as-is and the client's time-fit banner surfaces it.
 */
function fitToBudget(parsed: TimedExercise[], targetMinutes: number) {
  const ceiling = targetMinutes * FILL_CEILING;
  const floor   = targetMinutes * FILL_FLOOR;

  const exercises: TimedExercise[] = parsed.map(e => ({ ...e }));

  // Trim from the working blocks until the session fits, taking the last
  // eligible exercise each pass. A block is never emptied: fitting may shorten
  // a block, never delete one the trainer declared — observed live on
  // 2026-07-31, where trimming 4 exercises removed `conditioning` entirely.
  let trimmed = 0;
  while (totalMinutesOf(exercises) > ceiling) {
    const perBlock = new Map<string, number>();
    for (const e of exercises) {
      const b = normalizeBlock(e.phase);
      perBlock.set(b, (perBlock.get(b) ?? 0) + 1);
    }
    let victim = -1;
    for (let i = exercises.length - 1; i >= 0; i--) {
      const ex = exercises[i]!;
      if (!isAdjustable(ex)) continue;
      if ((perBlock.get(normalizeBlock(ex.phase)) ?? 0) <= 1) continue;
      victim = i;
      break;
    }
    if (victim < 0) break;
    exercises.splice(victim, 1);
    trimmed++;
  }

  let paddedSets = 0;
  let progressed = true;
  while (totalMinutesOf(exercises) < floor && progressed) {
    progressed = false;
    for (const ex of exercises) {
      if (!isAdjustable(ex)) continue;
      if (totalMinutesOf(exercises) >= floor) break;
      if ((ex.sets ?? 1) >= MAX_PADDED_SETS) continue;
      const oneMoreSet = estimateExerciseMinutes({ ...ex, sets: 1 });
      if (totalMinutesOf(exercises) + oneMoreSet > ceiling) continue;
      ex.sets = (ex.sets ?? 1) + 1;
      paddedSets++;
      progressed = true;
    }
  }

  return { exercises, trimmed, paddedSets };
}

interface RequestBody {
  checkin?:            CheckInBody;
  physicalProfile?:    PhysicalProfileBody;
  // NB: cycleContext.phase is the menstrual cycle phase — unrelated to the
  // session blocks in `session_order`, which describe how a session is composed.
  cycleContext?:       { phase: string; day: number; cycleLength: number };
  locale?:             string;
  existing_exercises?: ExistingExercise[];
  remaining_minutes?:  number;
  /** The trainer's declared block sequence (coach_dna.structure.order). */
  session_order?:      string[];
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

// Legacy generation receives a smaller context than the smart endpoint, but
// it still must be bounded before constructing the prompt or querying any
// backend authority. This is deliberately below the platform parser limit.
export const MAX_WORKOUT_REQUEST_CHARS = 128_000;
export function isWorkoutRequestWithinLimit(value: unknown): boolean {
  try {
    return JSON.stringify(value).length <= MAX_WORKOUT_REQUEST_CHARS;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — required for Capacitor WebView
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    if (await rejectUnauthenticatedAIBurst(req, res)) return;
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (await rejectPostAuthAIBurst(caller.id, 'generate-workout', res)) return;
  if (!hasJsonContentType(req)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-workout', outcome: 'rejected', httpStatus: 415, rejectionCode: 'invalid_content_type' });
    res.status(415).json({ error: 'Content-Type must be application/json' });
    return;
  }
  if (!isWorkoutRequestWithinLimit(req.body)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-workout', outcome: 'rejected', httpStatus: 413, rejectionCode: 'payload_too_large' });
    return res.status(413).json({ error: 'Request exceeds maximum size' });
  }
  if (!isJsonObject(req.body)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-workout', outcome: 'rejected', httpStatus: 400, rejectionCode: 'invalid_payload' });
    return res.status(400).json({ error: 'JSON object body required' });
  }

  const entitlements = await resolveUserEntitlements(caller.id);
  if (!entitlements['ai.workout_generation'].allowed) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-workout', outcome: 'rejected', httpStatus: 403, rejectionCode: 'entitlement_denied' });
    res.status(403).json({ error: 'AI workout generation is not available for this account' });
    return;
  }

  // This legacy endpoint remains reachable for an incomplete profile. It must
  // enforce the same weekly autonomous-generation guard as the smart endpoint,
  // otherwise a degraded client path becomes an entitlement bypass.
  const sessionsThisWeek = await countSessionsThisWeek(caller.id);
  if (isSessionsPerWeekCapReached(entitlements, sessionsThisWeek)) {
    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-workout', outcome: 'rejected', httpStatus: 403, rejectionCode: 'sessions_cap_reached', planKey: entitlements.planKey });
    res.status(403).json({
      error: 'sessions_per_week_limit_reached',
      limit: entitlements['workout.sessions_per_week'].limitValue,
    });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI service not configured.' });
    return;
  }

  const { checkin, physicalProfile, cycleContext, existing_exercises, remaining_minutes, session_order } = req.body as RequestBody;
  const sessionOrder    = sanitizeSessionOrder(session_order);
  // Complementing appends to a plan the trainer already structured, so the
  // preparation and recovery blocks are already theirs — this batch only fills
  // the working blocks, and only with blocks the trainer actually declared.
  const workingBlocks   = sessionOrder.filter(b => ADJUSTABLE_BLOCKS.has(b));
  const complementBlocks = workingBlocks.length ? workingBlocks : ['strength'];
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
      const qty = e.duration_seconds != null ? `${e.duration_seconds}s hold` : `${e.reps} reps`;
      lines.push(`- ${e.exercise_name} (${e.muscle_group}) ${e.sets}×${qty}`);
    });
    if (musclesUsed.length) {
      lines.push(`Muscle groups already covered: ${musclesUsed.join(', ')}`);
    }
    const usedMinutes = Math.round(existing_exercises.reduce((acc, e) => acc + estimateExerciseMinutes(e), 0));
    lines.push(`Time already accounted for: ${usedMinutes} min (estimated)`);
    if (remaining_minutes != null) {
      lines.push(`Remaining time budget: ${remaining_minutes} min`);
    }
    lines.push('Prioritise muscle groups NOT yet covered.');
    // Complement mode: the editor appends the result to what the trainer already
    // built, so a warm-up returned here would land in the middle of their plan.
    lines.push(`COMPLEMENTING an existing plan: return working-block exercises only — no preparation and no cool-down, the trainer already owns those. Use "phase" values from: ${complementBlocks.join(' | ')}.`);
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

  // Target minutes for THIS batch: the remaining budget when complementing an
  // existing plan (`!= null` so a legitimate 0 is respected, not swallowed by
  // ??), otherwise the client's full stated availability. Floored at 5 min so
  // the prompt never asks the model to fill a zero-length window — the client
  // is expected to skip the call entirely in that case.
  const rawTarget      = remaining_minutes != null ? remaining_minutes : (checkin?.minutes ?? physicalProfile?.available_minutes ?? 45);
  const targetMinutes  = Math.max(5, rawTarget);
  // Minutes are the only target. An exercise-count hint was tried and removed:
  // the model anchored on the number and blew the budget whenever it chose long
  // rests. Anything over the ceiling is trimmed server-side after parsing.
  const isComplement   = !!existing_exercises?.length;
  const structureLine  = isComplement
    ? `SESSION STRUCTURE — working blocks only for this batch: ${complementBlocks.join(' → ')}. The preparation and cool-down blocks already belong to the trainer's plan.`
    : `SESSION STRUCTURE — this trainer's declared block sequence, to be followed in this order: ${sessionOrder.join(' → ')}. Every one of those blocks must appear, and their time counts towards the total below.`;
  const timeTargetLine = `${structureLine}\n\nTIME TARGET\nThe session must total ~90-110% of a ${targetMinutes}-minute window. Before answering, compute the total with the TIME MODEL above — sum sets x (active_seconds + rest_seconds) across every exercise you return, using the rest_seconds you assigned — and add or drop exercises until that sum lands in range. Long rests (90-120s) mean FEWER exercises, not more. Anything beyond the window will be discarded, so do not overshoot; and do not stop early either.`;

  const userContent = lines.length
    ? `LANGUAGE: Generate ALL content in ${locale === 'pt' || locale === 'pt-BR' ? 'Portuguese (Brazil)' : locale === 'es' || locale === 'es-ES' ? 'Spanish' : locale === 'de' || locale === 'de-DE' ? 'German' : 'English'}. No English text at all.

Generate a workout plan for this client:\n\n${lines.join('\n')}\n\n${timeTargetLine}\n\nReturn the exercises as a JSON array.`
    : `Generate a balanced intermediate full-body workout.\n\n${timeTargetLine}\n\nReturn the exercises as a JSON array.`;

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
        // A complete session (warm-up + main + cool-down) runs to ~12 exercises;
        // at 1024 the JSON was truncated mid-array and failed to parse, surfacing
        // as "AI returned an unexpected format" on roughly every other request.
        max_tokens: 4096,
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

    const data = await response.json() as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      error?: { message?: string };
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    if (!response.ok) {
      throw new Error(data.error?.message || 'DeepSeek request failed');
    }

    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    // A truncated response is indistinguishable from a malformed one once the
    // JSON fails to parse, and the generic "unexpected format" error sent the
    // 2026-07-31 investigation looking at the prompt instead of the token cap.
    const truncated = data.choices?.[0]?.finish_reason === 'length';

    // Extract JSON array even if model adds surrounding text
    const match = text.match(/\[[\s\S]*\]/);
    if (!match || truncated) {
      if (truncated) {
        console.error(
          `[generate-workout] response truncated at max_tokens ` +
          `(${data.usage?.completion_tokens} completion tokens) — raise the cap`,
        );
      }
      res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
      return;
    }

    // Normalise the phase before anything downstream reads it: the model may
    // answer with an unlisted block, or omit it entirely. Unknown values land on
    // the working block rather than failing the request (§6.3).
    const parsed = (JSON.parse(match[0]) as TimedExercise[])
      .map(ex => ({ ...ex, phase: normalizeBlock(ex.phase) }));
    const { exercises: budgetFitted, trimmed, paddedSets } = fitToBudget(parsed, targetMinutes);
    // Same content cap as the smart path. The legacy response is a flat list,
    // so preserving its original order is the least-surprising safe trim.
    const maxExercises = entitlements['workout.exercises_per_session'].limitValue;
    const exercises = maxExercises == null ? budgetFitted : budgetFitted.slice(0, maxExercises);

    if (trimmed || paddedSets || exercises.length !== budgetFitted.length) {
      console.warn(
        `[generate-workout] fitted to budget: model returned ` +
        `~${Math.round(totalMinutesOf(parsed))} min for ${targetMinutes} min ` +
        `(trimmed ${trimmed}, padded ${paddedSets} set(s), capped ${budgetFitted.length - exercises.length} exercise(s)) -> ` +
        `~${Math.round(totalMinutesOf(exercises))} min`,
      );
    }

    await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-workout', outcome: 'succeeded', httpStatus: 200, provider: 'deepseek', model: 'deepseek-chat', inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens });

    res.status(200).json({
      exercises,
      // Declared so a client can tell which phase vocabulary it received (§6.3).
      schema_version: PHASE_SCHEMA_VERSION,
      session_order:  isComplement ? complementBlocks : sessionOrder,
      usage: {
        input_tokens:  data.usage?.prompt_tokens     ?? 0,
        output_tokens: data.usage?.completion_tokens ?? 0,
      },
    });
    return;
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[generate-workout] timed out');
      await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-workout', outcome: 'provider_failed', httpStatus: 504, provider: 'deepseek', model: 'deepseek-chat' });
      res.status(504).json({ error: 'Workout generation timed out' });
    } else {
      console.error('[generate-workout] provider request failed');
      await emitAIUsageEvent({ actorId: caller.id, endpoint: 'generate-workout', outcome: 'provider_failed', httpStatus: 500, provider: 'deepseek', model: 'deepseek-chat' });
      res.status(500).json({ error: 'Failed to generate workout' });
    }
  } finally {
    clearTimeout(timeout);
  }
}
