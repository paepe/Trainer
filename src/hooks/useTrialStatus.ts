import type { Subscription } from '../types';

const TRIAL_WARNING_DAYS = 3;

export type TrialState =
  | { state: 'not_trial' }
  | { state: 'active';   daysLeft: number }
  | { state: 'expiring'; daysLeft: number }   // ≤ TRIAL_WARNING_DAYS
  | { state: 'expired' };

/**
 * Derives trial lifecycle state from the current subscription.
 * Pure function — no side effects, no network calls.
 *
 * Rules:
 *   - Only applies to plan_key = 'trial'
 *   - No current_period_end → treat as active (Stripe not yet wired)
 *   - daysLeft ≤ 0           → expired
 *   - daysLeft ≤ WARNING      → expiring (banner shown in amber)
 *   - otherwise               → active (no banner)
 */
export function useTrialStatus(subscription: Subscription | null): TrialState {
  if (!subscription || subscription.plan_key !== 'trial') return { state: 'not_trial' };
  if (!subscription.current_period_end)                   return { state: 'active', daysLeft: 14 };

  const msLeft  = new Date(subscription.current_period_end).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0)                    return { state: 'expired' };
  if (daysLeft <= TRIAL_WARNING_DAYS)   return { state: 'expiring', daysLeft };
  return { state: 'active', daysLeft };
}
