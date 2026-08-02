export type FeatureKey =
  | 'scores.basic'
  | 'scores.advanced'
  | 'ai.workout_generation'   // gates whether AI generates the workout at all (creation)
  | 'ai.checkin_adjustment'   // gates daily calibration by energy/sleep/fatigue only — never gates safety signals (pain, Safety Gate)
  | 'ai.advanced_analysis'
  | 'coach_dna'
  | 'clients.limit'
  | 'studio.branding'
  | 'marketplace.listing'
  | 'marketplace.revenue_share'
  // Client plan gates (v2)
  | 'workout.sessions_per_week'      // limit_value = max sessions/week (null = unlimited)
  | 'workout.exercises_per_session'  // limit_value = max exercises (null = unlimited)
  | 'workout.exercise_type'          // limit_value: 0 = fitness only, null = all
  | 'checkin.full'                   // full check-in form (vs. quick only)
  | 'trainer_plan.days_per_week'     // limit_value = max trainer plan days (null = all)
  | 'progress.fitness_advanced'      // advanced fitness metrics in progress tab
  | 'progress.performance';          // performance metrics (ATL/CTL/TSB etc.)

export interface FeaturePermission {
  feature_key:  FeatureKey;
  plan_key:     string;
  allowed:      boolean;
  limit_value:  number | null;
}

export interface FeatureAccess {
  allowed:     boolean;
  limitValue:  number | null;
  loading:     boolean;
}
