// ── Primitive unions ──────────────────────────────────────────────────────────

export type CheckInVariant = 'voice' | 'quick' | 'detailed';

export type SleepQualityV2 = 'poor' | 'regular' | 'good' | 'excellent';

export type PainRegion =
  | 'neck'       | 'shoulder'  | 'elbow'  | 'wrist'
  | 'upper_back' | 'lower_back'| 'hip'    | 'knee'
  | 'ankle'      | 'other';

export type FatigueType = 'physical' | 'mental' | 'both';

export type EmotionalState =
  | 'calm' | 'neutral' | 'motivated' | 'stressed' | 'anxious' | 'discouraged';

export type SafetySignal =
  | 'severe_pain'     | 'dizziness'      | 'shortness_of_breath'
  | 'chest_pain'      | 'malaise'        | 'loss_of_balance'
  | 'fainting_sensation';

import type { BodyRhythmAdaptation } from './profile-v2';

export type AdaptationPreference = BodyRhythmAdaptation;

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

// ── Unified check-in record (DB row) ─────────────────────────────────────────

export interface CheckInProntidao {
  id:           string;
  user_id:      string;
  variant:      CheckInVariant;
  input_source: 'voice' | 'form';
  occurred_at:  string;
  created_at:   string;

  // Denormalised columns — queryable without JSONB extraction
  readiness_score:   number | null;
  energy_level:      number | null;
  sleep_quality:     SleepQualityV2 | null;
  fatigue_level:     number | null;
  pain_present:      boolean | null;
  pain_intensity:    number | null;
  available_minutes: number | null;
  training_location: string | null;
  ai_led_blocked:    boolean | null;

  // Full variant blobs (populated on detailed reads)
  quick_data?:        CheckInQuick        | null;
  detailed_data?:     CheckInDetailed     | null;
  voice_data?:        CheckInVoice        | null;
  safety_gate?:       SafetyGateResult    | null;
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
