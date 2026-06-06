// App-level user preferences, persisted in the Supabase `preferences` table.
// Phase 1: all fields are boolean. Future phases will add typed non-boolean
// fields (language, defaultLocation, preferredIntensity, planExpiryDays, …) —
// the interface is intentionally explicit (no index signature) so those
// additions are type-checked rather than silently accepted as booleans.
import type { AppLanguage } from '../i18n';

export type LightPalette = 'arctic' | 'sand';
export type TrainingLocation = 'home' | 'gym' | 'studio' | 'park' | 'condo' | 'online';
export type SessionDuration  = 30 | 45 | 60 | 75 | 90;
export type TrainingIntensity = 'gradual' | 'moderate' | 'intense';
export type PlanExpiryDays   = 7 | 10 | 14 | 21 | 30;
export type WorkoutReadyExpiryMin = 15 | 30 | 60 | 120;
export type SessionHistoryLimit   = 25 | 50 | 100 | 200;
export type TrainerDashboardLimit = 5 | 10 | 20 | 50;

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

  // Appearance & locale
  lightPalette:           LightPalette;            // client light variant
  language:               AppLanguage;             // UI + AI output language

  // Tier 2 — AI training focus (autonomous clients; 1–10 emphasis)
  aiFocusStrength:        number;
  aiFocusEndurance:       number;
  aiFocusMobility:        number;

  // Tier 3 — power-user data limits (how many rows each list fetches)
  sessionHistoryLimit:    SessionHistoryLimit;     // client history list
  trainerDashboardLimit:  TrainerDashboardLimit;   // trainer client-detail lists
}

// Keys whose value is a boolean — used by the Settings toggle list for
// type-safe dynamic access (prefs[key]). Narrows to only the boolean subset
// now that non-boolean (Tier 1) prefs exist.
export type BooleanPrefKey = {
  [K in keyof AppPreferences]: AppPreferences[K] extends boolean ? K : never;
}[keyof AppPreferences];
