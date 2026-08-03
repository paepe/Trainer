// requestSmartWorkout flattens the AI's phases[] into a flat exercise list for
// the DB/UI shape (GeneratedWorkoutExercise[]). Phase 3 needs the block each
// exercise came from to survive that flattening — previously dropped, since
// mapExercise never read it. See docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));

import { requestSmartWorkout } from './workoutGeneration';
import type { SmartWorkoutRequest } from '../ai/types';

function smartWorkoutResponse(phases: Array<{ phase: string; exercises: Array<{ name: string; category?: string }> }>) {
  return {
    workout: {
      title: 'Test', format: 'Circuit', totalDurationMin: 40,
      coachNote: '', adaptations: [],
      phases: phases.map(p => ({
        phase: p.phase, label: p.phase, durationMin: 10,
        exercises: p.exercises.map(e => ({
          name: e.name, muscleGroup: 'Legs', sets: 3, reps: '10',
          durationSeconds: null, load: 'bodyweight', restSeconds: 30, cue: 'go',
          category: e.category,
        })),
      })),
    },
    usage: { input_tokens: 1, output_tokens: 1 },
    context_snapshot: { readinessScore: 70, safetyStatus: 'clear', adaptations: [] },
  };
}

const MINIMAL_REQUEST = {} as SmartWorkoutRequest;

describe('requestSmartWorkout — phase survives the phases[] → flat-list flattening', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });

  it('tags each exercise with the block of the phase it came from', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => smartWorkoutResponse([
        { phase: 'warmup',   exercises: [{ name: 'Jog' }] },
        { phase: 'strength', exercises: [{ name: 'Squat' }, { name: 'Row' }] },
      ]),
    });

    const result = await requestSmartWorkout(MINIMAL_REQUEST);

    expect(result.exercises.map(e => [e.exercise_name, e.phase])).toEqual([
      ['Jog', 'warmup'],
      ['Squat', 'strength'],
      ['Row', 'strength'],
    ]);
  });

  it('sets phase to null when the model omits the phase key entirely', async () => {
    const response = smartWorkoutResponse([{ phase: 'warmup', exercises: [{ name: 'Plank' }] }]);
    delete (response.workout.phases[0] as { phase?: string }).phase;
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => response,
    });

    const result = await requestSmartWorkout(MINIMAL_REQUEST);
    expect(result.exercises[0]?.phase).toBeNull();
  });
});

// docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md Fase 4: category propagated
// through mapExercise into GeneratedWorkoutExercise, same shape persisted by
// StartWorkoutScreen.tsx's persistGeneratedPlan.
describe('requestSmartWorkout — category propagation (Fase 4)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });

  it('carries the model-declared category through to the flattened result', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => smartWorkoutResponse([
        { phase: 'strength', exercises: [{ name: 'Back Squat', category: 'fitness' }, { name: 'Box Jump', category: 'performance' }] },
      ]),
    });

    const result = await requestSmartWorkout(MINIMAL_REQUEST);

    expect(result.exercises.map(e => [e.exercise_name, e.category])).toEqual([
      ['Back Squat', 'fitness'],
      ['Box Jump', 'performance'],
    ]);
  });

  it('sets category to null, not undefined, when the model omits it (unclassified rows keep working with useExerciseClassification)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => smartWorkoutResponse([
        { phase: 'strength', exercises: [{ name: 'Mystery Move' /* no category */ }] },
      ]),
    });

    const result = await requestSmartWorkout(MINIMAL_REQUEST);
    expect(result.exercises[0]?.category).toBeNull();
  });
});
