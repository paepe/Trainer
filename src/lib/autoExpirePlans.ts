// Auto-cancel plans whose immutable server-calculated expiry instant passed.
// Called at screen load before querying actionable plans.
//
// Trigger points:
//   Trainer opens TrainerClientDetailScreen → expires plans for the VIEWED client
//     → notifies CLIENT (trainer took the action)
//   Client opens StartWorkoutScreen or HistoryScreen → expires their own plans
//     → notifies TRAINER (client-side trigger)
import { supabase } from '../supabase';
import { notify, notifyLinkedTrainer } from './notify';

export async function autoExpirePlans(
  clientId: string,
  trigger: 'trainer' | 'client',
): Promise<number> {
  if (!clientId) return 0;

  const { data: stale, error } = await supabase
    .rpc('expire_assigned_workout_plans', { p_client_id: clientId });

  if (error || !stale?.length) return 0;

  // Both parties are informed regardless of which interface detected expiry.
  for (const plan of stale) {
    const params = { expiryAt: plan.expires_at };
    void notify(clientId, '', '', undefined,
      { type: 'plan_expired', templateKey: 'plans_expired', params, entityType: 'workout_plan', entityId: plan.id });
    void notifyLinkedTrainer(clientId, '', '',
      { type: 'plan_expired', templateKey: 'plans_expired', params, entityType: 'workout_plan', entityId: plan.id });
  }

  return stale.length;
}
