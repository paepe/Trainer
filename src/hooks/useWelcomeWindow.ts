import type { Subscription } from '../types';

const WELCOME_WARNING_DAYS = 4;

export type WelcomeWindowState =
  | { state: 'not_applicable' }
  | { state: 'active';   daysLeft: number }
  | { state: 'expiring'; daysLeft: number }   // ≤ WELCOME_WARNING_DAYS — show countdown banner
  | { state: 'expired' };                      // revert to real FREE limits

/**
 * Derives the 21-day welcome window state for new free-plan clients.
 * While active, the UI should grant ai_fitness-level permissions.
 * Pure function — no side effects, no network calls.
 *
 * Rules:
 *   - Only applies to plan_key = 'free'
 *   - No current_period_end → expired (should not happen post-signup)
 *   - daysLeft ≤ 0          → expired (revert to real FREE limits)
 *   - daysLeft ≤ WARNING     → expiring (show countdown banner)
 *   - otherwise              → active (full ai_fitness experience, no banner)
 */
export function useWelcomeWindow(subscription: Subscription | null): WelcomeWindowState {
  if (!subscription || subscription.plan_key !== 'free') return { state: 'not_applicable' };
  if (!subscription.current_period_end)                  return { state: 'expired' };

  const msLeft   = new Date(subscription.current_period_end).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0)                      return { state: 'expired' };
  if (daysLeft <= WELCOME_WARNING_DAYS)   return { state: 'expiring', daysLeft };
  return { state: 'active', daysLeft };
}
