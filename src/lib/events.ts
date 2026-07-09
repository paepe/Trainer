import { supabase } from '../supabase';
import type { Json } from '../types/supabase';
import type { SystemEventType } from '../types/workout';
import { notify } from './notify';

export async function emitEvent(
  userId: string,
  eventType: SystemEventType,
  entityType?: string,
  entityId?: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('system_events').insert({
    user_id:     userId,
    event_type:  eventType,
    entity_type: entityType ?? null,
    entity_id:   entityId   ?? null,
    payload:     (payload ?? {}) as unknown as Json,
  });
  if (error) console.error('[events] emitEvent error:', error);
}

// Called when a client reports pain during a session.
// Always emits pain_reported; when intensity >= 7 also creates a trainer alert + task.
export async function handlePainReport(
  userId: string,
  sessionId: string,
  bodyRegion: string,
  intensity: number,
): Promise<void> {
  void emitEvent(userId, 'pain_reported', 'workout_session', sessionId, {
    body_region: bodyRegion,
    intensity,
  });

  if (intensity < 7) return;

  const { data: tc } = await supabase
    .from('trainer_clients')
    .select('trainer_id')
    .eq('client_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!tc?.trainer_id) return;

  const severity = intensity >= 9 ? 'critical' : 'high';

  const alertParams = { region: bodyRegion, intensity };

  const { data: alert, error: alertErr } = await supabase
    .from('trainer_alerts')
    .insert({
      trainer_id:   tc.trainer_id,
      client_id:    userId,
      alert_type:   'high_pain',
      severity,
      title:        `High pain reported — ${bodyRegion}`,
      body:         `Intensity ${intensity}/10 during workout session. Review and adjust plan.`,
      template_key: 'high_pain_alert',
      params:       alertParams as unknown as Json,
      status:       'open',
      session_id:   sessionId,
    })
    .select('id')
    .single();

  if (alertErr) { console.error('[events] alert insert error:', alertErr); return; }

  const alertId = (alert as { id: string } | null)?.id ?? null;

  const taskParams = { region: bodyRegion, intensity };

  await supabase.from('operational_tasks').insert({
    trainer_id:         tc.trainer_id,
    client_id:          userId,
    task_type:          'review_pain',
    title:              `Review pain — ${bodyRegion}`,
    description:        `Client reported ${intensity}/10 intensity in ${bodyRegion}.`,
    template_key:       'review_pain',
    params:             taskParams as unknown as Json,
    priority:           intensity >= 9 ? 'urgent' : 'high',
    status:             'pending',
    related_session_id: sessionId,
    related_alert_id:   alertId,
  });

  // Push-notify trainer via the canonical multilingual pipeline
  notify(tc.trainer_id, '', '', undefined, {
    type:        'high_pain',
    templateKey: 'high_pain_alert',
    params:      alertParams,
  });

  if (alertId) {
    void emitEvent(userId, 'alert_created', 'trainer_alert', alertId);
  }
}
