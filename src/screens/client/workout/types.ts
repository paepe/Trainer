import type { SessionExerciseStatus } from '../../../types/workout';

export type Phase = 'init' | 'active' | 'set_form' | 'rest' | 'pain_form' | 'skip_form';

export interface ExState {
  id:             string;
  name:           string;
  muscleGroup:    string;
  setsPrescribed: number;
  repsPrescribed: number | null;
  loadPrescribed: number | null;
  restSeconds:    number;
  notes:          string | null;
  status:         SessionExerciseStatus;
  setsLogged:     number;
}
