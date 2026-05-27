import type { CheckIn } from '../types';
import type { Json } from '../types/supabase';

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

interface WorkoutGenerationResponse {
  error?: string;
  exercises?: GeneratedWorkoutExercise[];
}

interface RequestWorkoutPlanInput {
  checkin?:         Partial<CheckIn> | null | undefined;
  physicalProfile?: Json | null | undefined;
  cycleContext?:    CycleContext | null | undefined;
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

export async function requestWorkoutPlan({
  checkin,
  physicalProfile,
  cycleContext,
}: RequestWorkoutPlanInput): Promise<GeneratedWorkoutExercise[]> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);
  let response: Response;

  try {
    response = await fetch(`${resolveWorkoutApiBase()}/api/generate-workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkin, physicalProfile, cycleContext }),
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error)?.name === 'AbortError') {
      throw new Error('Workout generation timed out. Please try again.');
    }
    console.error('[workout-generation] request failed before response', err);
    throw new Error('Unable to reach workout service.');
  }

  let data: WorkoutGenerationResponse;

  try {
    data = await response.json() as WorkoutGenerationResponse;
  } catch {
    clearTimeout(timeout);
    throw new Error('Workout service returned an unreadable response.');
  }

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate workout');
  }

  if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
    throw new Error('Workout service did not return a valid plan.');
  }

  return data.exercises;
}
