import { supabase } from '../supabase';

export function useData(userId) {
  async function savePhysicalProfile(data) {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('physical_profiles')
      .upsert(
        { user_id: userId, ...data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    return { error };
  }

  async function saveCheckin(data) {
    if (!userId) return { error: null };
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('checkins')
      .upsert(
        { user_id: userId, date: today, ...data },
        { onConflict: 'user_id,date' }
      );
    return { error };
  }

  async function logWorkoutSession(data) {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, ...data });
    return { error };
  }

  async function fetchPhysicalProfile() {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('physical_profiles')
      .select('weight_kg, height_cm, fitness_level, primary_goal, restrictions')
      .eq('user_id', userId)
      .maybeSingle();
    return { data, error };
  }

  // ── Cycle config ──────────────────────────────────────────────

  async function saveCycleConfig({ cycleLength, periodLength, lastStartDate }) {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('cycle_config')
      .upsert(
        {
          user_id: userId,
          cycle_length: cycleLength,
          period_length: periodLength,
          last_start_date: lastStartDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    return { error };
  }

  async function fetchCycleConfig() {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('cycle_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return { data, error };
  }

  // ── Preferences ──────────────────────────────────────────────

  async function savePreferences(prefs) {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('preferences')
      .upsert(
        { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    return { error };
  }

  async function fetchPreferences() {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return { data, error };
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
  };
}
