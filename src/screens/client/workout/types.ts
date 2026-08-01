import type { SessionExerciseStatus } from '../../../types/workout';

export type Phase = 'init' | 'active' | 'set_form' | 'rest' | 'pain_form' | 'skip_form';

export interface LocalSetLog {
  set_number:       number;
  reps_done:        number | null;
  load_kg:          number | null;
  rpe:              number | null;
  duration_seconds: number | null;
  completed_at:     string;
}

export interface ExState {
  id:                       string;
  name:                     string;
  muscleGroup:              string;
  setsPrescribed:           number;
  repsPrescribed:           number | null;
  durationSecondsPrescribed: number | null;
  loadPrescribed:           number | null;
  restSeconds:              number;
  notes:                    string | null;
  status:                   SessionExerciseStatus;
  setsLogged:               number;
  // Local source of truth for executed sets — survives network failures and
  // feeds the offline full-session replay (see lib/workoutSyncQueue.ts).
  setLogs:                  LocalSetLog[];
  skippedReason:            string | null;
  // Session block this exercise belongs to (see src/lib/sessionStructure.ts).
  // Carried through so the live session's data model is complete — grouped
  // display here is a separate, deferred track (Decision #3, 2026-07-31).
  phase:                     string | null;
}
