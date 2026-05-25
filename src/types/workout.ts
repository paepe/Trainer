export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'legs'
  | 'glutes'
  | 'full_body'
  | 'cardio';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type LocationType  = 'gym' | 'home' | 'outdoor';
export type SleepQuality  = 'poor' | 'fair' | 'good';

export interface CheckIn {
  energy:        number;
  soreness:      string[];
  minutes:       number;
  goal:          string;
  location:      LocationType;
  sleep_quality: SleepQuality;
  equipment:     string[];
}

export interface Exercise {
  exercise_name: string;
  muscle_group:  MuscleGroup;
  sets:          number;
  reps:          number;
  load_kg:       number | null;
  rest_seconds:  number;
  notes?:        string;
}

export interface WorkoutSession {
  id?:           string;
  user_id:       string;
  completed_at?: string | null;
  exercises?:    Exercise[];
  duration_min?: number;
  created_at?:   string;
}

export interface WorkoutPlan {
  id:          string;
  created_by:  string;
  user_id:     string;
  status:      'sent' | 'active' | 'completed';
  exercises:   Exercise[];
  created_at:  string;
}

export interface PhysicalProfile {
  user_id:              string;
  weight_kg:            number | null;
  height_cm:            number | null;
  fitness_level:        FitnessLevel | null;
  primary_goal:         string | null;
  restrictions:         string[] | null;
  available_minutes?:   number | null;
  location_preference?: LocationType | null;
}

export interface CycleConfig {
  user_id:         string;
  cycle_length:    number;
  period_length:   number;
  last_start_date: string;
  updated_at:      string;
}

export interface Preferences {
  user_id:    string;
  dark_mode?: boolean;
  updated_at: string;
  [key: string]: unknown;
}
