import type { Subscription } from '../types';

const TRIAL_WARNING_DAYS = 4;

export type TrialWindowState =
  | { state: 'not_applicable' }
  | { state: 'active';   daysLeft: number }
  | { state: 'expiring'; daysLeft: number }   // ≤ TRIAL_WARNING_DAYS — show countdown banner
  | { state: 'expired' };                      // revert to real TRIAL limits

/**
 * Derives the 21-day PRO trial window state for new trainer accounts.
 * While active, the UI should grant pro-level permissions.
 * Pure function — no side effects, no network calls.
 *
 * Rules:
 *   - Only applies to plan_key = 'trial'
 *   - No current_period_end → expired (should not happen post-signup)
 *   - daysLeft ≤ 0          → expired (revert to real TRIAL limits: 3 clients, no Coach DNA)
 *   - daysLeft ≤ WARNING     → expiring (show countdown banner)
 *   - otherwise              → active (full PRO experience, no banner)
 */
export function useTrialWindow(subscription: Subscription | null): TrialWindowState {
  if (!subscription || subscription.plan_key !== 'trial') return { state: 'not_applicable' };
  if (!subscription.current_period_end)                   return { state: 'expired' };

  const msLeft   = new Date(subscription.current_period_end).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0)                     return { state: 'expired' };
  if (daysLeft <= TRIAL_WARNING_DAYS)    return { state: 'expiring', daysLeft };
  return { state: 'active', daysLeft };
}
