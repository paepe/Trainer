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

  return { savePhysicalProfile, saveCheckin, logWorkoutSession };
}
