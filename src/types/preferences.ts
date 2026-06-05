// App-level user preferences, persisted in the Supabase `preferences` table.
// Phase 1: all fields are boolean. Future phases will add typed non-boolean
// fields (language, defaultLocation, preferredIntensity, planExpiryDays, …) —
// the interface is intentionally explicit (no index signature) so those
// additions are type-checked rather than silently accepted as booleans.
export type LightPalette = 'arctic' | 'sand';
export type TrainingLocation = 'gym' | 'home' | 'outdoor';
export type SessionDuration  = 30 | 45 | 60 | 75 | 90;
export type TrainingIntensity = 'light' | 'moderate' | 'hard';
export type PlanExpiryDays   = 7 | 10 | 14 | 21 | 30;
export type WorkoutReadyExpiryMin = 15 | 30 | 60 | 120;

export interface AppPreferences {
  // Boolean toggles
  notifications:     boolean;
  goals:             boolean;
  alerts:            boolean;
  analysis:          boolean;
  behaviour:         boolean;
  sounds:            boolean;
  cycle:             boolean;
  aiPersonalization: boolean;
  whiteLabel:        boolean;
  darkMode:          boolean;

  // Tier 1 — typed value preferences
  defaultLocation:        TrainingLocation;
  defaultDurationMin:     SessionDuration;
  preferredIntensity:     TrainingIntensity;
  planExpiryDays:         PlanExpiryDays;          // trainer
  workoutReadyExpiryMin:  WorkoutReadyExpiryMin;   // client-with-trainer

  // Appearance
  lightPalette:           LightPalette;            // client light variant

  // Tier 2 — AI training focus (autonomous clients; 1–10 emphasis)
  aiFocusStrength:        number;
  aiFocusEndurance:       number;
  aiFocusMobility:        number;
}

// Keys whose value is a boolean — used by the Settings toggle list for
// type-safe dynamic access (prefs[key]). Narrows to only the boolean subset
// now that non-boolean (Tier 1) prefs exist.
export type BooleanPrefKey = {
  [K in keyof AppPreferences]: AppPreferences[K] extends boolean ? K : never;
}[keyof AppPreferences];
