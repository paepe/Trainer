import { supabase } from '../supabase';
import { emitEvent } from '../lib/events';
import { notifyLinkedTrainer } from '../lib/notify';
import type { CheckInVariant, CheckInQuick, CheckInDetailed, CheckInVoice, SafetyGateResult } from '../types/checkin-v2';
import type { Json } from '../types/supabase';

interface MutateResult { error: unknown }

const toJson = (v: unknown): Json | null => v != null ? v as unknown as Json : null;

export function useCheckinData(userId: string | undefined, alertsEnabled = true) {

  async function saveCheckinV2(data: {
    variant:            CheckInVariant;
    quick_data?:        CheckInQuick;
    detailed_data?:     CheckInDetailed;
    voice_data?:        CheckInVoice;
    safety_gate?:       SafetyGateResult;
    clientUserId?:      string;
  }): Promise<MutateResult> {
    const effectiveUserId = data.clientUserId ?? userId;
    if (!effectiveUserId) return { error: null };
    const qd = data.quick_data;
    const dd = data.detailed_data;
    const { error } = await supabase
      .from('checkin_prontidao')
      .insert({
        user_id:           effectiveUserId,
        variant:           data.variant,
        occurred_at:       new Date().toISOString(),
        input_source:      data.variant === 'voice' ? 'voice' : 'form',
        quick_data:        toJson(qd),
        detailed_data:     toJson(dd),
        voice_data:        toJson(data.voice_data),
        safety_gate:       toJson(data.safety_gate),
        energy_level:      (qd ?? dd)?.energy            ?? null,
        sleep_quality:     (qd ?? dd)?.sleep_quality     ?? null,
        fatigue_level:     (qd ?? dd)?.fatigue           ?? null,
        pain_present:      (qd ?? dd)?.pain?.present     ?? null,
        pain_intensity:    (qd ?? dd)?.pain?.intensity   ?? null,
        available_minutes: (qd ?? dd)?.available_minutes ?? null,
        training_location: dd?.location_today            ?? null,
        readiness_score:   data.safety_gate?.readiness_score ?? null,
        ai_led_blocked:    data.safety_gate?.ai_led_blocked  ?? false,
      });
    if (error) { console.error('[useCheckinData] saveCheckinV2:', error); return { error }; }
    // Notify trainer if safety gate blocks or warns about AI-led workout
    if (data.safety_gate && effectiveUserId) {
      const blocked = data.safety_gate.ai_led_blocked;
      const score   = data.safety_gate.readiness_score;
      if (alertsEnabled && (blocked || (typeof score === 'number' && score < 55))) {
        const template = blocked ? 'safety_gate_blocked' : 'low_readiness';
        void notifyLinkedTrainer(effectiveUserId, '', '', { type: 'checkin_alert', templateKey: template, params: { score } });
      }
    }

    void emitEvent(effectiveUserId, 'checkin_submitted', 'checkin_prontidao', undefined, { variant: data.variant });
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
