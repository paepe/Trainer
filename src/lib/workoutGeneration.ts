import type { CheckIn, PhysicalProfile } from '../types';
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
  physicalProfile?: Partial<PhysicalProfile> | Json | null | undefined;
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
  let response: Response;

  try {
    response = await fetch(`${resolveWorkoutApiBase()}/api/generate-workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkin, physicalProfile, cycleContext }),
    });
  } catch (err) {
    console.error('[workout-generation] request failed before response', err);
    throw new Error('Unable to reach workout service.');
  }

  let data: WorkoutGenerationResponse;

  try {
    data = await response.json() as WorkoutGenerationResponse;
  } catch {
    throw new Error('Workout service returned an unreadable response.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate workout');
  }

  if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
    throw new Error('Workout service did not return a valid plan.');
  }

  return data.exercises;
}
