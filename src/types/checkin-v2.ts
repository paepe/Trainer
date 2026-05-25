// ── Primitive unions ──────────────────────────────────────────────────────────

export type CheckInVariant = 'voice' | 'quick' | 'detailed' | 'post_workout';

export type SleepQualityV2 = 'poor' | 'regular' | 'good' | 'excellent';

export type PainRegion =
  | 'cervical' | 'shoulder' | 'lumbar'  | 'hip'
  | 'knee'     | 'ankle'    | 'wrist'   | 'elbow' | 'other';

export type FatigueType = 'physical' | 'mental' | 'both';

export type EmotionalState =
  | 'calm' | 'neutral' | 'motivated' | 'stressed' | 'anxious' | 'discouraged';

export type SafetySignal =
  | 'severe_pain'     | 'dizziness'      | 'shortness_of_breath'
  | 'chest_pain'      | 'malaise'        | 'loss_of_balance'
  | 'fainting_sensation';

export type AdaptationPreference =
  | 'maintain_normal'    | 'reduce_intensity' | 'reduce_impact'
  | 'increase_rest'      | 'shorten_session'  | 'prioritize_mobility'
  | 'postpone_training'  | 'regenerative';

export type WorkoutCompletionStatus = 'yes' | 'partially' | 'no';

export type SensationRating = 'excellent' | 'good' | 'ok' | 'hard' | 'very_hard';

export type SafetyGateStatus = 'clear' | 'caution' | 'blocked';

// ── Pain detail ───────────────────────────────────────────────────────────────

export interface PainData {
  present:           boolean;
  region?:           PainRegion;
  intensity?:        number;        // 0–10
  movement_trigger?: string;
}

// ── Quick check-in (~40s, 5 questions) ───────────────────────────────────────

export interface CheckInQuick {
  energy:            number;        // 0–10
  sleep_quality:     SleepQualityV2;
  pain:              PainData;
  fatigue:           number;        // 0–10 perceived fatigue
  available_minutes: number;
}

// ── Detailed check-in (~5min, 12 blocks) ─────────────────────────────────────

export interface CheckInDetailed extends CheckInQuick {
  sleep_hours?:             number;
  fatigue_type?:            FatigueType;
  emotional_state?:         EmotionalState;
  location_today?:          string;    // TrainingLocation value
  equipment_today?:         string[];
  can_do_floor_exercises?:  boolean;
  safety_signals?:          SafetySignal[];
  body_rhythm_active?:      boolean;
  adaptation_preference?:   AdaptationPreference;
}

// ── Voice check-in (~30s) ─────────────────────────────────────────────────────

export interface CheckInVoice {
  transcript:    string;
  ai_extracted?: Partial<CheckInDetailed>;  // AI parses free-form speech into structured fields
}

// ── Post-workout check-in ─────────────────────────────────────────────────────

export interface CheckInPostWorkout {
  session_id:              string;
  sensation:               SensationRating;
  completion_status:       WorkoutCompletionStatus;
  perceived_effort:        number;    // RPE 0–10
  pain_during_or_after:    boolean;
  pain_detail?:            PainData;
  notes_for_ai?:           string;
  pain_recurrence_alert?:  boolean;  // computed: ≥3 occurrences in 14 days
}

// ── Safety Gate result ────────────────────────────────────────────────────────

export interface SafetyGateResult {
  status:                 SafetyGateStatus;
  triggered_signals:      SafetySignal[];
  readiness_score:        number;   // 0–100
  recommended_action?:    string;
  session_completion_pct?: number;
  passage_risk_pct?:      number;
  pain_alert_level?:      'low' | 'moderate' | 'high';
  recovery_status?:       'stable' | 'recovering' | 'at_risk';
  ai_led_blocked:         boolean;
  human_review_required:  boolean;
  computed_at:            string;
}

// ── Unified check-in record ───────────────────────────────────────────────────

export interface CheckInProntidao {
  id:           string;
  user_id:      string;
  variant:      CheckInVariant;
  occurred_at:  string;

  quick?:        CheckInQuick;
  detailed?:     CheckInDetailed;
  voice?:        CheckInVoice;
  post_workout?: CheckInPostWorkout;

  safety_gate?: SafetyGateResult;
  created_at:   string;
}

// ── Pain Recurrence Engine signal ─────────────────────────────────────────────

export interface PainRecurrenceSignal {
  user_id:            string;
  pain_region:        PainRegion;
  occurrence_count:   number;
  window_days:        number;     // always 14 per spec
  alert_triggered:    boolean;
  last_occurrence_at: string;
}
