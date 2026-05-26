import { supabase } from '../supabase';
import { emitEvent } from '../lib/events';
import type { CheckInVariant, CheckInQuick, CheckInDetailed, CheckInVoice, CheckInPostWorkout, SafetyGateResult } from '../types/checkin-v2';
import type { Json } from '../types/supabase';

interface MutateResult { error: unknown }

const toJson = (v: unknown): Json | null => v != null ? v as unknown as Json : null;

export function useCheckinData(userId: string | undefined) {

  async function saveCheckinV2(data: {
    variant:            CheckInVariant;
    quick_data?:        CheckInQuick;
    detailed_data?:     CheckInDetailed;
    voice_data?:        CheckInVoice;
    post_workout_data?: CheckInPostWorkout;
    safety_gate?:       SafetyGateResult;
  }): Promise<MutateResult> {
    if (!userId) return { error: null };
    const qd = data.quick_data;
    const dd = data.detailed_data;
    const { error } = await supabase
      .from('checkin_prontidao')
      .insert({
        user_id:           userId,
        variant:           data.variant,
        occurred_at:       new Date().toISOString(),
        input_source:      data.variant === 'voice' ? 'voice' : 'form',
        quick_data:        toJson(qd),
        detailed_data:     toJson(dd),
        voice_data:        toJson(data.voice_data),
        post_workout_data: toJson(data.post_workout_data),
        safety_gate:       toJson(data.safety_gate),
        energy_level:      qd?.energy           ?? null,
        sleep_quality:     qd?.sleep_quality     ?? null,
        fatigue_level:     qd?.fatigue           ?? null,
        pain_present:      qd?.pain?.present     ?? null,
        pain_intensity:    qd?.pain?.intensity   ?? null,
        available_minutes: qd?.available_minutes ?? null,
        training_location: dd?.location_today    ?? null,
        readiness_score:   data.safety_gate?.readiness_score ?? null,
        ai_led_blocked:    data.safety_gate?.ai_led_blocked  ?? false,
      });
    if (error) { console.error('[useCheckinData] saveCheckinV2:', error); return { error }; }
    void emitEvent(userId, 'checkin_submitted', 'checkin_prontidao', undefined, { variant: data.variant });
    return { error };
  }

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
          user_id:            userId,
          pain_region:        region,
          occurrence_count:   newCount,
          window_days:        14,
          alert_triggered:    newCount >= 3,
          last_occurrence_at: new Date().toISOString(),
          updated_at:         new Date().toISOString(),
        },
        { onConflict: 'user_id,pain_region' }
      );
    if (error) console.error('[useCheckinData] updatePainRecurrence:', error);
    return { error };
  }

  return { saveCheckinV2, updatePainRecurrence };
}
