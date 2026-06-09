// Single source of truth for extracting normalised fields from a checkin_prontidao row.
// Used by useLatestCheckin (client) and TrainerClientDetailScreen (trainer list).

export interface ParsedCheckin {
  energy?:               number;
  sleep_quality?:        string;
  sleep_hours?:          number;
  fatigue?:              number;
  fatigue_type?:         string;
  available_minutes?:    number;
  location_today?:       string;
  equipment_today?:      string[];
  body_rhythm_active?:   boolean;
  adaptation_preference?: string;
  emotional_state?:      string;
  pain_present?:         boolean;
  pain_region?:          string;
  pain_intensity?:       number;
  safety_signals?:          string[];
  readiness_score?:         number;
  input_source?:            string;
  can_do_floor_exercises?:  boolean;
  movement_trigger?:        string;
}

type RawRow = {
  energy_level?:      number | null;
  sleep_quality?:     string | null;
  fatigue_level?:     number | null;
  available_minutes?: number | null;
  training_location?: string | null;
  pain_present?:      boolean | null;
  pain_intensity?:    number | null;
  readiness_score?:   number | null;
  input_source?:      string | null;
  quick_data?:        unknown;
  detailed_data?:     unknown;
};

export function parseCheckinData(row: RawRow): ParsedCheckin {
  const dd = (row.detailed_data && typeof row.detailed_data === 'object' && !Array.isArray(row.detailed_data))
    ? row.detailed_data as Record<string, unknown> : null;
  const qd = (row.quick_data && typeof row.quick_data === 'object' && !Array.isArray(row.quick_data))
    ? row.quick_data as Record<string, unknown> : null;

  const painSrc = (dd?.pain ?? qd?.pain) as
    { present?: boolean; region?: string; intensity?: number; movement_trigger?: string } | null;

  const result: ParsedCheckin = {};

  const energy = row.energy_level ?? (dd?.energy ?? qd?.energy) as number | undefined ?? null;
  const sleepQ = row.sleep_quality ?? (dd?.sleep_quality ?? qd?.sleep_quality) as string | undefined ?? null;
  const fatigue = row.fatigue_level ?? (dd?.fatigue ?? qd?.fatigue) as number | undefined ?? null;
  const avail = row.available_minutes ?? (dd?.available_minutes ?? qd?.available_minutes) as number | undefined ?? null;
  const loc = row.training_location ?? (dd?.location_today) as string | undefined ?? null;

  if (energy   != null) result.energy            = energy;
  if (sleepQ)           result.sleep_quality     = sleepQ;
  if (fatigue  != null) result.fatigue           = fatigue;
  if (avail    != null) result.available_minutes = avail;
  if (loc)              result.location_today    = loc;
  if (row.readiness_score    != null) result.readiness_score   = row.readiness_score;
  if (row.input_source)               result.input_source      = row.input_source!;

  // pain — prefer direct column, fall back to JSONB
  const painPresent = row.pain_present ?? painSrc?.present;
  if (painPresent != null)            result.pain_present  = painPresent;
  if (painSrc?.region)                result.pain_region   = painSrc.region;
  const painIntensity = row.pain_intensity ?? painSrc?.intensity;
  if (painIntensity != null)          result.pain_intensity = painIntensity;

  // detailed_data JSONB fields
  if (dd?.sleep_hours        != null) result.sleep_hours          = dd.sleep_hours as number;
  if (dd?.fatigue_type)               result.fatigue_type         = dd.fatigue_type as string;
  if (dd?.emotional_state)            result.emotional_state      = dd.emotional_state as string;
  if (dd?.location_today)             result.location_today       = dd.location_today as string;
  if ((dd?.equipment_today as string[])?.length)
                                      result.equipment_today      = dd!.equipment_today as string[];
  if (dd?.body_rhythm_active != null) result.body_rhythm_active   = dd.body_rhythm_active as boolean;
  if (dd?.adaptation_preference)      result.adaptation_preference = dd.adaptation_preference as string;

  const signals = (dd?.safety_signals ?? qd?.safety_signals) as string[] | null;
  if (signals?.length)                result.safety_signals          = signals;

  if (painSrc?.movement_trigger)      result.movement_trigger        = painSrc.movement_trigger;

  const floorSrc = dd?.can_do_floor_exercises ?? qd?.can_do_floor_exercises;
  if (floorSrc != null)               result.can_do_floor_exercises  = floorSrc as boolean;

  return result;
}
