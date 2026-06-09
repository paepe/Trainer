// Auto-cancel plans older than EXPIRE_DAYS that are still sent/postponed.
// Called at screen load — fire-and-forget, never blocks the UI.
//
// Trigger points:
//   Trainer opens TrainerClientDetailScreen → expires plans for the VIEWED client
//     → notifies CLIENT (trainer took the action)
//   Client opens StartWorkoutScreen or HistoryScreen → expires their own plans
//     → notifies TRAINER (client-side trigger)
import { supabase } from '../supabase';
import { notify }   from './notify';

const DEFAULT_EXPIRE_DAYS = 10;

export async function autoExpirePlans(
  clientId: string,
  trigger: 'trainer' | 'client',
  expiryDays: number = DEFAULT_EXPIRE_DAYS,
): Promise<number> {
  if (!clientId) return 0;

  const cutoff = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('assigned_to', clientId)
    .in('status', ['sent', 'postponed'])
    .lt('created_at', cutoff);

  if (!stale?.length) return 0;

  const ids = stale.map(p => p.id);

  await supabase
    .from('workout_plans')
    .update({ status: 'cancelled' })
    .in('id', ids);

  const count = ids.length;

  if (trigger === 'trainer') {
    // Trainer opened client view → notify CLIENT that stale plans were cleared
    void notify(
      clientId,
      'Plans auto-cancelled',
      `${count} plan(s) older than ${expiryDays} days were automatically cancelled.`,
      undefined,
      { type: 'plan_expired', templateKey: 'plans_expired', params: { count, expiryDays }, entityType: 'workout_plan' }
    );
  } else {
    // Client opened Workout/History → notify TRAINER
    const { data: tc } = await supabase
      .from('trainer_clients')
      .select('trainer_id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle();

    if (tc?.trainer_id) {
      void notify(
        tc.trainer_id,
        'Plans expired',
        `${count} pending plan(s) for a client were auto-cancelled after ${expiryDays} days.`,
        undefined,
        { type: 'plan_expired', templateKey: 'plans_expired', params: { count, expiryDays }, entityType: 'workout_plan', fromUserId: clientId }
      );
    }
  }

  return count;
}
