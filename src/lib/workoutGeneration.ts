import type { CheckIn } from '../types';
import type { Json } from '../types/supabase';
import type { SmartWorkoutRequest, SmartWorkoutResponse, WorkoutExercise } from '../ai/types';

export interface CycleContext {
  phase: string;
  day: number;
  cycleLength: number;
}

export interface GeneratedWorkoutExercise {
  exercise_name: string;
  muscle_group:  string;
  sets:          number | null;
  reps:          number | null;
  load_kg:       number | null;
  rest_seconds:  number | null;
  notes?:        string | null;
}

// Result from smart workout — includes safety context alongside exercises
export interface SmartWorkoutResult {
  exercises:      GeneratedWorkoutExercise[];
  blocked:        boolean;
  safetyMessage?: string;
  safetyTitle?:   string;
  readinessScore: number;
  safetyStatus:   string;
  adaptations:    string[];
}

interface WorkoutGenerationResponse {
  error?: string;
  exercises?: GeneratedWorkoutExercise[];
}

interface RequestWorkoutPlanInput {
  checkin?:         Partial<CheckIn> | null | undefined;
  physicalProfile?: Json | null | undefined;
  cycleContext?:    CycleContext | null | undefined;
  locale?:          string;
}

export function resolveWorkoutApiBase(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_API_URL || '';
  }
  return (
    import.meta.env.VITE_API_URL
    || (window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : window.location.origin)
  );
}

// ── Legacy endpoint (kept as fallback) ────────────────────────────────────────

export async function requestWorkoutPlan({
  checkin,
  physicalProfile,
  cycleContext,
  locale,
}: RequestWorkoutPlanInput): Promise<GeneratedWorkoutExercise[]> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);
  let response: Response;
  try {
    response = await fetch(`${resolveWorkoutApiBase()}/api/generate-workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkin, physicalProfile, cycleContext, locale }),
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error)?.name === 'AbortError') throw new Error('Workout generation timed out.', { cause: err });
    throw new Error('Unable to reach workout service.', { cause: err });
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    const preview = await response.text().catch(() => '');
    throw new Error(`Workout API returned non-JSON (${response.status}): ${preview.slice(0, 150)}`);
  }
  const data = await response.json() as WorkoutGenerationResponse;
  clearTimeout(timeout);
  if (!response.ok) throw new Error(data.error || 'Failed to generate workout');
  if (!Array.isArray(data.exercises) || data.exercises.length === 0)
    throw new Error('Workout service did not return a valid plan.');
  return data.exercises;
}

// ── Smart endpoint — full safety context ──────────────────────────────────────

// Map WorkoutExercise (smart format) → GeneratedWorkoutExercise (DB/UI format)
function mapExercise(ex: WorkoutExercise): GeneratedWorkoutExercise {
  // Parse reps: "12" → 12 | "8-12" → 10 (mid) | "30 sec" → null
  let reps: number | null = null;
  const repsStr = ex.reps?.trim() ?? '';
  if (/^\d+$/.test(repsStr)) {
    reps = parseInt(repsStr, 10);
  } else {
    const range = repsStr.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) reps = Math.round((parseInt(range[1]!, 10) + parseInt(range[2]!, 10)) / 2);
  }

  // Parse load: "10 kg" → 10 | "10.5 kg" → 10.5 | "Bodyweight"|"BW"|other → null
  let load_kg: number | null = null;
  const loadStr = ex.load?.trim() ?? '';
  const loadMatch = loadStr.match(/^([\d.]+)\s*kg/i);
  if (loadMatch) load_kg = parseFloat(loadMatch[1]!);

  const notes = [ex.cue, ex.safetyNote].filter(Boolean).join(' · ') || null;

  return {
    exercise_name: ex.name,
    muscle_group:  ex.muscleGroup,
    sets:          ex.sets ?? null,
    reps,
    load_kg,
    rest_seconds:  ex.restSeconds ?? null,
    notes,
  };
}

export async function requestSmartWorkout(
  request: SmartWorkoutRequest,
): Promise<SmartWorkoutResult> {
  const ctrl    = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 28_000);

  try {
    const response = await fetch(`${resolveWorkoutApiBase()}/api/generate-smart-workout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(request),
      signal:  ctrl.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const preview = await response.text().catch(() => '');
      throw new Error(`Smart workout API returned non-JSON (${response.status}): ${preview.slice(0, 150)}`);
    }

    const data = await response.json() as SmartWorkoutResponse & { error?: string };
    clearTimeout(timeout);

    if (!response.ok) throw new Error(data.error ?? 'Smart workout generation failed');

    const snapshot = data.context_snapshot;

    // Safety gate triggered — return blocked result with message
    if (data.insight && !data.workout) {
      return {
        exercises:      [],
        blocked:        true,
        safetyTitle:    data.insight.title,
        safetyMessage:  data.insight.body,
        readinessScore: snapshot.readinessScore,
        safetyStatus:   snapshot.safetyStatus,
        adaptations:    snapshot.adaptations,
      };
    }

    // Flatten phases → flat exercise list
    const exercises = (data.workout?.phases ?? [])
      .flatMap(p => p.exercises ?? [])
      .map(mapExercise)
      .filter(e => e.exercise_name);

    return {
      exercises,
      blocked:        false,
      readinessScore: snapshot.readinessScore,
      safetyStatus:   snapshot.safetyStatus,
      adaptations:    snapshot.adaptations,
    };

  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error)?.name === 'AbortError') throw new Error('Smart workout timed out.', { cause: err });
    throw err;
  }
}
