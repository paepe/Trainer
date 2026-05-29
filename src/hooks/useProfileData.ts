import { supabase } from '../supabase';
import type { CycleConfig, Preferences } from '../types';
import type { UserProfileV2 } from '../types/profile-v2';
import type { Json } from '../types/supabase';

interface DataResult<T>  { data: T | null; error: unknown }
interface MutateResult   { error: unknown }

const toJson = (v: unknown): Json | null => v != null ? v as unknown as Json : null;

export function useProfileData(userId: string | undefined) {

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
    if (error) console.error('[useProfileData] saveCycleConfig:', error);
    return { error };
  }

  async function fetchCycleConfig(): Promise<DataResult<CycleConfig>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('cycle_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useProfileData] fetchCycleConfig:', error);
    return { data: data as CycleConfig | null, error };
  }

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
    if (error) console.error('[useProfileData] savePreferences:', error);
    return { error };
  }

  async function fetchPreferences(): Promise<DataResult<Preferences>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useProfileData] fetchPreferences:', error);
    return { data: data as Preferences | null, error };
  }

  async function saveProfileV2(
    data: Partial<UserProfileV2>,
    step: string = 'completed'
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    try {
      const { error } = await supabase
        .from('profile_v2')
        .upsert(
          {
            user_id:             userId,
            current_step:        step,
            completed_at:        step === 'completed' ? new Date().toISOString() : null,
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
            updated_at:          new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      if (error) {
        console.error('[useProfileData] saveProfileV2:', error);
        return { error: error.message || error };
      }
      return { error: null };
    } catch (err) {
      console.error('[useProfileData] saveProfileV2 exception:', err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  async function fetchProfileV2(columns: string | null = null): Promise<DataResult<Partial<UserProfileV2> & { current_step?: string; completed_at?: string | null }>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('profile_v2')
      .select(columns ?? '*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useProfileData] fetchProfileV2:', error);
    return { data: data as (Partial<UserProfileV2> & { current_step?: string; completed_at?: string | null }) | null, error };
  }

  return { saveCycleConfig, fetchCycleConfig, savePreferences, fetchPreferences, saveProfileV2, fetchProfileV2 };
}
