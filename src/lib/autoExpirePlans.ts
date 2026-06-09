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

  if (trigger === 'trainer') {
    // Trainer opened client view → one notification per expired plan to CLIENT
    for (const planId of ids) {
      void notify(
        clientId,
        'Plan auto-cancelled',
        `A plan older than ${expiryDays} days was automatically cancelled.`,
        undefined,
        { type: 'plan_expired', templateKey: 'plans_expired', params: { count: 1, expiryDays }, entityType: 'workout_plan', entityId: planId }
      );
    }
  } else {
    // Client opened Workout/History → one notification per expired plan to TRAINER
    const { data: tc } = await supabase
      .from('trainer_clients')
      .select('trainer_id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle();

    if (tc?.trainer_id) {
      for (const planId of ids) {
        void notify(
          tc.trainer_id,
          'Plan expired',
          `A pending plan was auto-cancelled after ${expiryDays} days.`,
          undefined,
          { type: 'plan_expired', templateKey: 'plans_expired', params: { count: 1, expiryDays }, entityType: 'workout_plan', entityId: planId, fromUserId: clientId }
        );
      }
    }
  }

  return ids.length;
}
