import { supabase } from '../supabase';
import type {
  PhysicalProfile,
  CheckIn,
  CycleConfig,
  Preferences,
} from '../types';
import type { UserProfileV2 } from '../types/profile-v2';
import type { CheckInVariant, CheckInQuick, CheckInDetailed, CheckInVoice, CheckInPostWorkout, SafetyGateResult } from '../types/checkin-v2';
import type { Json } from '../types/supabase';

interface DataResult<T>  { data: T | null;  error: unknown }
interface MutateResult   { error: unknown }

export function useData(userId: string | undefined) {

  async function savePhysicalProfile(
    data: Partial<Omit<PhysicalProfile, 'user_id'>>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('physical_profiles')
      .upsert(
        { user_id: userId, ...data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[useData] savePhysicalProfile error:', error);
    return { error };
  }

  async function saveCheckin(
    data: Omit<CheckIn, never>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from('checkins')
      .upsert(
        { user_id: userId, date: today, ...data },
        { onConflict: 'user_id,date' }
      );
    if (error) console.error('[useData] saveCheckin error:', error);
    return { error };
  }

  async function logWorkoutSession(
    data: Record<string, unknown>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, ...data });
    if (error) console.error('[useData] logWorkoutSession error:', error);
    return { error };
  }

  async function fetchPhysicalProfile(): Promise<DataResult<PhysicalProfile>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('physical_profiles')
      .select('weight_kg, height_cm, fitness_level, primary_goal, restrictions')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useData] fetchPhysicalProfile error:', error);
    return { data: data as PhysicalProfile | null, error };
  }

  // ── Cycle config ─────────────────────────────────────────────────────────

  async function saveCycleConfig(payload: {
    cycleLength:   number;
    periodLength:  number;
    lastStartDate: string;
  }): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('cycle_config')
      .upsert(
        {
          user_id:         userId,
          cycle_length:    payload.cycleLength,
          period_length:   payload.periodLength,
          last_start_date: payload.lastStartDate,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[useData] saveCycleConfig error:', error);
    return { error };
  }

  async function fetchCycleConfig(): Promise<DataResult<CycleConfig>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('cycle_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useData] fetchCycleConfig error:', error);
    return { data: data as CycleConfig | null, error };
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  async function savePreferences(
    prefs: Partial<Omit<Preferences, 'user_id' | 'updated_at'>>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('preferences')
      .upsert(
        { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[useData] savePreferences error:', error);
    return { error };
  }

  async function fetchPreferences(): Promise<DataResult<Preferences>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useData] fetchPreferences error:', error);
    return { data: data as Preferences | null, error };
  }

  // ── Profile v2 ─────────────────────────────────────────────────────────────

  const toJson = (v: unknown): Json | null => v != null ? v as unknown as Json : null;

  async function saveProfileV2(
    data: Partial<UserProfileV2>,
    step: string = 'completed'
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('profile_v2')
      .upsert(
        {
          user_id:            userId,
          current_step:       step,
          completed_at:       step === 'completed' ? new Date().toISOString() : null,
          basic_data:          toJson(data.basic_data),
          objectives:          toJson(data.objectives),
          movement_history:    toJson(data.movement_history),
          functional_capacity: toJson(data.functional_capacity),
          environment:         toJson(data.environment),
          availability:        toJson(data.availability),
          preferences:         toJson(data.preferences),
          habits:              toJson(data.habits),
          comorbidities:       toJson(data.comorbidities),
          declared_health:     toJson(data.declared_health),
          sensitive_factors:   toJson(data.sensitive_factors),
          body_rhythm:         toJson(data.body_rhythm),
          consent:             toJson(data.consent),
          risk:                toJson(data.risk),
          updated_at:         new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[useData] saveProfileV2 error:', error);
    return { error };
  }

  // ── Check-in v2 ────────────────────────────────────────────────────────────

  async function saveCheckinV2(data: {
    variant:            CheckInVariant;
    quick_data?:        CheckInQuick;
    detailed_data?:     CheckInDetailed;
    voice_data?:        CheckInVoice;
    post_workout_data?: CheckInPostWorkout;
    safety_gate?:       SafetyGateResult;
  }): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('checkin_prontidao')
      .insert({
        user_id:           userId,
        variant:           data.variant,
        occurred_at:       new Date().toISOString(),
        quick_data:        toJson(data.quick_data),
        detailed_data:     toJson(data.detailed_data),
        voice_data:        toJson(data.voice_data),
        post_workout_data: toJson(data.post_workout_data),
        safety_gate:       toJson(data.safety_gate),
        readiness_score:   data.safety_gate?.readiness_score ?? null,
        ai_led_blocked:    data.safety_gate?.ai_led_blocked  ?? false,
      });
    if (error) console.error('[useData] saveCheckinV2 error:', error);
    return { error };
  }

  // ── Pain Recurrence Engine ─────────────────────────────────────────────────
  // Increments occurrence_count for the given region; sets alert_triggered when >= 3.

  async function updatePainRecurrence(region: string): Promise<MutateResult> {
    if (!userId) return { error: null };

    const { data: existing } = await supabase
      .from('pain_recurrence_signals')
      .select('occurrence_count')
      .eq('user_id', userId)
      .eq('pain_region', region)
      .maybeSingle();

    const newCount = (existing?.occurrence_count ?? 0) + 1;

    const { error } = await supabase
      .from('pain_recurrence_signals')
      .upsert(
        {
          user_id:           userId,
          pain_region:       region,
          occurrence_count:  newCount,
          window_days:       14,
          alert_triggered:   newCount >= 3,
          last_occurrence_at: new Date().toISOString(),
          updated_at:         new Date().toISOString(),
        },
        { onConflict: 'user_id,pain_region' }
      );

    if (error) console.error('[useData] updatePainRecurrence error:', error);
    return { error };
  }

  return {
    savePhysicalProfile,
    fetchPhysicalProfile,
    saveCheckin,
    logWorkoutSession,
    saveCycleConfig,
    fetchCycleConfig,
    savePreferences,
    fetchPreferences,
    saveProfileV2,
    saveCheckinV2,
    updatePainRecurrence,
  };
}
