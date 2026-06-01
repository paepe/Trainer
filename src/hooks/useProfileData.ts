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
      // Build payload with only the fields that are actually present in `data`.
      // Omitting a key means Supabase upsert will NOT touch that column in the DB,
      // preventing partial edits from wiping sections that belong to other steps.
      const payload: Record<string, unknown> = {
        user_id:      userId,
        current_step: step,
        updated_at:   new Date().toISOString(),
      };

      // Only stamp completed_at when finishing the wizard — never clear it on partial edits.
      if (step === 'completed') payload.completed_at = new Date().toISOString();

      // Include profile section columns only when the caller actually provided them.
      const SECTIONS = [
        'basic_data', 'objectives', 'movement_history', 'functional_capacity',
        'environment', 'availability', 'preferences', 'habits', 'comorbidities',
        'declared_health', 'sensitive_factors', 'body_rhythm', 'consent', 'risk',
      ] as const;

      for (const key of SECTIONS) {
        if (data[key] !== undefined) payload[key] = toJson(data[key]);
      }

      const { error } = await supabase
        .from('profile_v2')
        .upsert(payload as any, { onConflict: 'user_id' });

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
