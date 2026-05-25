// ── Primitive unions ──────────────────────────────────────────────────────────

export type BiologicalSex = 'female' | 'male' | 'intersex' | 'prefer_not_to_say';

export type PrimaryGoal =
  | 'hypertrophy'
  | 'weight_loss'
  | 'strength_gain'
  | 'conditioning'
  | 'mobility'
  | 'longevity'
  | 'return_to_training'
  | 'emotional_wellbeing';

export type SecondaryGoal =
  | PrimaryGoal
  | 'daily_autonomy'
  | 'body_composition'
  | 'sports_performance'
  | 'balance'
  | 'consistency';

export type TrainingFrequency = 'irregular' | 'sometimes' | 'not_training';
export type FitnessLevelV2    = 'beginner' | 'intermediate' | 'advanced';

export type TrainingModality =
  | 'weight_training' | 'running'       | 'walking'     | 'yoga'
  | 'pilates'         | 'cycling'        | 'swimming'    | 'functional'
  | 'martial_arts'    | 'dance'          | 'crossfit'    | 'other';

export type AbandonReason =
  | 'lack_of_time'    | 'injury'         | 'lack_of_results' | 'demotivation'
  | 'cost'            | 'routine_change' | 'discomfort'      | 'other';

export type PreferredIntensity = 'gradual' | 'moderate' | 'intense';

export type HealthCategory =
  | 'cardiovascular' | 'metabolic'     | 'renal'               | 'respiratory'
  | 'musculoskeletal'| 'neurological'  | 'chronic_pain'        | 'emotional_health'
  | 'pregnancy_postpartum' | 'post_operative' | 'physical_disability' | 'other';

export type Comorbidity =
  | 'hypertension'     | 'type1_diabetes'    | 'asthma'                 | 'obesity'
  | 'osteoporosis'     | 'osteopenia'        | 'fibromyalgia'           | 'chronic_pain'
  | 'cardiovascular'   | 'renal_condition'   | 'post_operative'         | 'pregnancy'
  | 'postpartum'       | 'other'             | 'prefer_not_to_say';

export type MobilityLevel    = 'low' | 'moderate' | 'good';
export type BalanceLevel     = 'unstable' | 'assisted' | 'stable';
export type AutonomyLevel    = 'assisted' | 'partial' | 'independent';
export type EffortTolerance  = 'low' | 'moderate' | 'good';

export type SupportResource =
  | 'wheelchair' | 'cane' | 'walker' | 'prosthesis' | 'nearby_support' | 'none';

export type InstructionFormat = 'visual' | 'auditory' | 'simplified_text' | 'vibration' | 'standard';

export type LifestyleBarrier =
  | 'sedentary_prolonged' | 'low_hydration'   | 'executive_routine' | 'chronic_stress'
  | 'irregular_meals'     | 'frequent_travel' | 'caregiver_duty'    | 'smoking'
  | 'regular_alcohol'     | 'transport_barriers';

export type BodyRhythmAdaptation =
  | 'maintain_normal'   | 'reduce_intensity' | 'reduce_impact'  | 'increase_rest'
  | 'shorten_session'   | 'prioritize_mobility' | 'postpone_training' | 'regenerative';

export type TrainingLocation = 'home' | 'gym' | 'studio' | 'park' | 'condo' | 'online';

export type Equipment =
  | 'dumbbells' | 'resistance_bands' | 'barbell'     | 'bench'
  | 'treadmill' | 'bike'             | 'machines'    | 'kettlebell'
  | 'cable_pulley' | 'none';

export type AccessibilityCondition =
  | 'wheelchair_accessible' | 'support_bars'       | 'safe_floor'
  | 'private_space'         | 'companion_available' | 'adapted_equipment';

export type PreferredTime     = 'morning' | 'afternoon' | 'evening' | 'variable';

export type AdherenceBarrier =
  | 'night_shift'    | 'family_care'      | 'frequent_travel' | 'treatment_radiation'
  | 'transport'      | 'cost'             | 'emotional'       | 'time_constraint';

export type PreferredLanguage = 'direct' | 'explanatory' | 'technical';
export type ExplanationLevel  = 'simple' | 'detailed' | 'technical';
export type TrainingFocus     = 'performance' | 'health' | 'aesthetics' | 'consistency';
export type SupportLevel      = 'autonomous' | 'guided';
export type TrainingCompany   = 'solo' | 'accompanied' | 'indifferent';

export type ConsentValue = 'share' | 'summary' | 'authorized_only' | 'hidden';

export type RiskLevel = 'R0' | 'R1' | 'R2' | 'R3' | 'R4';

export type ProfileV2Step =
  | 'welcome'            | 'basic_data'       | 'objectives'        | 'movement_history'
  | 'abandon_history'    | 'declared_health'  | 'comorbidities'     | 'functional_capacity'
  | 'habits'             | 'sensitive_factors'| 'body_rhythm'       | 'environment'
  | 'availability'       | 'preferences'      | 'consent'           | 'risk_classification'
  | 'completed';

// ── Block interfaces ──────────────────────────────────────────────────────────

export interface EmergencyContact {
  name:  string;
  phone: string;
}

export interface ProfileBasicData {
  name:              string;
  age:               number;
  language:          string;
  height_cm:         number;
  weight_kg:         number;
  biological_sex:    BiologicalSex;
  emergency_contact?: EmergencyContact;
}

export interface ProfileObjectives {
  primary_goal:    PrimaryGoal;
  secondary_goals: SecondaryGoal[];
}

export interface ProfileMovementHistory {
  frequency:       TrainingFrequency;
  fitness_level:   FitnessLevelV2;
  weekly_frequency: number;
  modalities:      TrainingModality[];
  abandoned_before: boolean;
}

export interface ProfileAbandonHistory {
  reasons:             AbandonReason[];
  preferred_intensity: PreferredIntensity;
  churn_risk_signals:  string[];   // internal, masked in operational context
}

export interface ProfileDeclaredHealth {
  has_condition: boolean | null;   // null = prefer_not_to_say
  categories:    HealthCategory[];
  free_text?:    string;
}

export interface ProfileComorbidities {
  conditions: Comorbidity[];
}

export interface ProfileFunctionalCapacity {
  mobility:          MobilityLevel;
  balance:           BalanceLevel;
  autonomy:          AutonomyLevel;
  effort_tolerance:  EffortTolerance;
  support_resources: SupportResource[];
  instruction_format: InstructionFormat[];
}

export interface ProfileHabits {
  lifestyle_barriers: LifestyleBarrier[];
}

export interface ProfileSensitiveFactors {
  regular_medications?:             string;   // opt-in, masked operationally
  declares_emotional_history:       boolean;
  declares_recreational_substance:  boolean;
}

export interface ProfileBodyRhythm {
  enabled:               boolean;
  cycle_current_day?:    number;
  cycle_duration_days?:  number;
  adaptation_preference?: BodyRhythmAdaptation[];
}

export interface ProfileEnvironment {
  locations:      TrainingLocation[];
  equipment:      Equipment[];
  accessibility:  AccessibilityCondition[];
}

export interface ProfileAvailability {
  days_per_week:        number;
  session_duration_min: number;
  preferred_time:       PreferredTime;
  preferred_days:       number[];         // 0=Mon … 6=Sun
  adherence_barriers:   AdherenceBarrier[];
}

export interface ProfilePreferences {
  preferred_intensity: PreferredIntensity;
  training_company:    TrainingCompany;
  preferred_language:  PreferredLanguage;
  explanation_level:   ExplanationLevel;
  focus:               TrainingFocus;
  support_level:       SupportLevel;
}

// ── LGPD consent matrix ───────────────────────────────────────────────────────

export interface ConsentCategory {
  training_objective:            ConsentValue;
  training_history:              ConsentValue;
  pain_operational_restriction:  ConsentValue;
  relevant_comorbidity:          ConsentValue;
  sensitive_medication:          ConsentValue;
  emotional_psychiatric_health:  ConsentValue;
  body_rhythm:                   ConsentValue;
}

export interface ConsentMatrix {
  personal:             ConsentCategory;  // visibility for trainer
  studio:               ConsentCategory;  // visibility for studio
  allow_ai_adaptation:  boolean;
  maintain_access_log:  boolean;
}

// ── Operational risk classification ──────────────────────────────────────────

export interface OperationalRiskFlags {
  active_allowed:              boolean;
  human_validation_required:   boolean;
  ai_privacy_masking_required: boolean;
  safety_gate_required:        boolean;
}

export interface RiskClassification {
  level:       RiskLevel;
  flags:       OperationalRiskFlags;
  computed_at: string;
}

// ── Root v2 profile ───────────────────────────────────────────────────────────

export interface UserProfileV2 {
  user_id:      string;
  current_step: ProfileV2Step;
  completed_at?: string;

  basic_data?:         ProfileBasicData;
  objectives?:         ProfileObjectives;
  movement_history?:   ProfileMovementHistory;
  abandon_history?:    ProfileAbandonHistory;
  declared_health?:    ProfileDeclaredHealth;
  comorbidities?:      ProfileComorbidities;
  functional_capacity?: ProfileFunctionalCapacity;
  habits?:             ProfileHabits;
  sensitive_factors?:  ProfileSensitiveFactors;
  body_rhythm?:        ProfileBodyRhythm;
  environment?:        ProfileEnvironment;
  availability?:       ProfileAvailability;
  preferences?:        ProfilePreferences;
  consent?:            ConsentMatrix;
  risk?:               RiskClassification;

  created_at: string;
  updated_at: string;
}

// ── Churn Risk Engine signal (internal) ──────────────────────────────────────

export interface ChurnRiskSignal {
  user_id:     string;
  reasons:     AbandonReason[];
  risk_score:  number;       // 0–100
  computed_at: string;
}
