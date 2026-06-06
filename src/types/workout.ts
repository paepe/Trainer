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
export type LocationType  = 'gym' | 'home' | 'outdoor' | 'studio' | 'park' | 'online' | 'condo';
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

// ── M4 — Real Session Execution ─────────────────────────────────────────────

export type WorkoutSessionStatus  = 'active' | 'paused' | 'completed' | 'abandoned';
export type SessionExerciseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'substituted';

export interface WorkoutSessionRecord {
  id:                 string;
  user_id:            string;
  plan_id:            string | null;
  status:             WorkoutSessionStatus;
  started_at:         string;
  completed_at:       string | null;
  total_duration_min: number | null;
  notes:              string | null;
}

export interface WorkoutSessionExercise {
  id:                  string;
  session_id:          string;
  plan_exercise_id:    string | null;
  exercise_id:         string | null;
  exercise_name:       string;
  muscle_group:        string;
  order_index:         number;
  sets_prescribed:     number | null;
  reps_prescribed:     number | null;
  load_kg_prescribed:  number | null;
  rest_seconds:        number | null;
  notes:               string | null;
  status:              SessionExerciseStatus;
  substituted_from_id: string | null;
  skipped_reason?:     string | null;
}

export interface WorkoutSetLog {
  id:                  string;
  session_exercise_id: string;
  session_id:          string;
  set_number:          number;
  reps_done:           number | null;
  load_kg:             number | null;
  rpe:                 number | null;
  duration_seconds:    number | null;
  completed_at:        string;
}

export interface WorkoutPainEvent {
  id:                  string;
  session_id:          string;
  session_exercise_id: string | null;
  exercise_id:         string | null;
  body_region:         string;
  intensity:           number;
  reported_at:         string;
  trainer_notified:    boolean;
}

export interface PostWorkoutFeedback {
  id:              string;
  session_id:      string;
  user_id:         string;
  overall_feeling: number;
  energy_after:    number | null;
  notes:           string | null;
  submitted_at:    string;
}

// ── Events, Alerts, Operational Tasks (MVP #9) ──────────────────────────────

export type SystemEventType =
  | 'profile_completed'
  | 'checkin_submitted'
  | 'safety_gate_triggered'
  | 'workout_plan_created'
  | 'workout_plan_activated'
  | 'workout_started'
  | 'set_completed'
  | 'pain_reported'
  | 'workout_completed'
  | 'alert_created'
  | 'task_created';

export type AlertType     = 'high_pain' | 'safety_gate_blocked' | 'pain_recurrence' | 'missed_sessions' | 'general';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus   = 'open' | 'acknowledged' | 'resolved';
export type TaskType      = 'review_pain' | 'replan' | 'adjust_load' | 'safety_review' | 'general';
export type TaskPriority  = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus    = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface SystemEvent {
  id:          string;
  user_id:     string;
  event_type:  SystemEventType;
  entity_type: string | null;
  entity_id:   string | null;
  payload:     Record<string, unknown>;
  created_at:  string;
}

export interface TrainerAlert {
  id:            string;
  trainer_id:    string;
  client_id:     string;
  alert_type:    AlertType;
  severity:      AlertSeverity;
  title:         string;
  body:          string | null;
  status:        AlertStatus;
  session_id:    string | null;
  event_id:      string | null;
  template_key:  string | null;
  params:        Record<string, unknown> | null;
  created_at:    string;
  resolved_at:   string | null;
}

export interface OperationalTask {
  id:                 string;
  trainer_id:         string;
  client_id:          string;
  task_type:          TaskType;
  title:              string;
  description:        string | null;
  priority:           TaskPriority;
  status:             TaskStatus;
  due_date:           string | null;
  related_session_id: string | null;
  related_alert_id:   string | null;
  template_key:       string | null;
  params:             Record<string, unknown> | null;
  created_at:         string;
  completed_at:       string | null;
}

export interface ExerciseCatalogItem {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string[];
  level: FitnessLevel;
  short_instruction?: string | null;
  status: 'draft' | 'pending_review' | 'active' | 'restricted' | 'studio_only' | 'ai_allowed' | 'ai_restricted' | 'blocked' | 'archived';
  alternatives: string[];
  restrictions: string[];
  movement_pattern?: string | null;
  relative_risk_regions: string[];
  accessibility_tags: string[];
  created_by?: string | null;
  approved_by?: string | null;
  video_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

