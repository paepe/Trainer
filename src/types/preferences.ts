// App-level user preferences, persisted in the Supabase `preferences` table.
// Phase 1: all fields are boolean. Future phases will add typed non-boolean
// fields (language, defaultLocation, preferredIntensity, planExpiryDays, …) —
// the interface is intentionally explicit (no index signature) so those
// additions are type-checked rather than silently accepted as booleans.
export interface AppPreferences {
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
}

// Keys whose value is a boolean — used by the Settings toggle list for
// type-safe dynamic access (prefs[key]). Once non-boolean prefs are added,
// this narrows to only the boolean subset.
export type BooleanPrefKey = {
  [K in keyof AppPreferences]: AppPreferences[K] extends boolean ? K : never;
}[keyof AppPreferences];
