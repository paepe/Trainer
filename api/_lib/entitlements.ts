// Server-side entitlements resolver — Fase 2 of
// docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md.
//
// Resolves a user's real plan from the database and returns the exact same
// Entitlements shape the client computes — but here, the client cannot lie
// about which plan it belongs to. The decision logic itself (window
// elevation, fail-closed defaults) is NOT reimplemented here: it's imported
// from src/licensing/entitlements.ts (Fase 1), a pure module with zero React
// or environment dependencies, so it's safe to import from a serverless
// function. This cross-directory relative import (api/ → src/) is new
// territory beyond Fase 0's proof (which only covered api/ → api/_lib/) —
// verify with the same build-output-bundle-inspection technique before
// trusting it.
import { resolveEffectivePlanKey, toEntitlements, startOfWeek, type Entitlements } from '../../src/licensing/entitlements.js';
import type { FeaturePermission, Subscription } from '../../src/types/index.js';
import { authSupabaseUrl, authServiceHeaders } from './auth.js';

/**
 * Resolves `userId`'s real, current entitlements from the database —
 * `subscriptions` for the plan (including window elevation), then
 * `feature_permissions` for that resolved plan. Never trusts anything the
 * caller supplied about their own plan.
 *
 * Fails closed: any fetch failure here denies everything (same posture as
 * a genuinely missing subscription), never falls back to "assume allowed".
 */
export async function resolveUserEntitlements(userId: string): Promise<Entitlements> {
  let subscription: Subscription | null = null;
  try {
    const subRes = await fetch(
      `${authSupabaseUrl()}/rest/v1/subscriptions?select=plan_key,status,billing_cycle,current_period_end&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: authServiceHeaders() },
    );
    if (subRes.ok) {
      const rows = await subRes.json() as Subscription[];
      subscription = rows[0] ?? null;
    } else {
      console.error(`[entitlements] subscriptions fetch failed: ${subRes.status}`);
    }
  } catch (err) {
    console.error('[entitlements] subscriptions fetch threw:', (err as Error)?.message);
  }

  const planKey = resolveEffectivePlanKey(subscription);
  if (!planKey) return toEntitlements([], undefined);

  let rows: FeaturePermission[] = [];
  try {
    const permRes = await fetch(
      `${authSupabaseUrl()}/rest/v1/feature_permissions?select=feature_key,plan_key,allowed,limit_value&plan_key=eq.${encodeURIComponent(planKey)}`,
      { headers: authServiceHeaders() },
    );
    if (permRes.ok) {
      rows = await permRes.json() as FeaturePermission[];
    } else {
      console.error(`[entitlements] feature_permissions fetch failed: ${permRes.status}`);
    }
  } catch (err) {
    console.error('[entitlements] feature_permissions fetch threw:', (err as Error)?.message);
  }

  // rows=[] on failure still resolves correctly: toEntitlements falls back
  // to DEFAULTS per key (fail-closed), not to "allowed".
  return toEntitlements(rows, planKey);
}

/**
 * Sessions started since the current week's Monday 00:00, for enforcing
 * `workout.sessions_per_week` server-side. On fetch failure, returns 0
 * (does not block generation) — deliberately fail-open here: this is a
 * volume/cost guardrail, not a content-safety boundary, and the content
 * gates (exercises_per_session, exercise_type) resolved via
 * resolveUserEntitlements are what must never fail open. A transient
 * infra error should not take down AI generation for every user.
 */
export async function countSessionsThisWeek(userId: string, now: Date = new Date()): Promise<number> {
  const weekStart = startOfWeek(now).toISOString();
  try {
    const res = await fetch(
      `${authSupabaseUrl()}/rest/v1/workout_sessions?select=id&user_id=eq.${encodeURIComponent(userId)}&started_at=gte.${encodeURIComponent(weekStart)}`,
      { headers: authServiceHeaders() },
    );
    if (!res.ok) {
      console.error(`[entitlements] workout_sessions count fetch failed: ${res.status}`);
      return 0;
    }
    const rows = await res.json() as { id: string }[];
    return rows.length;
  } catch (err) {
    console.error('[entitlements] workout_sessions count fetch threw:', (err as Error)?.message);
    return 0;
  }
}

/** Pure — whether the weekly-session cap has been reached. No I/O. */
export function isSessionsPerWeekCapReached(entitlements: Entitlements, sessionsThisWeek: number): boolean {
  const cap = entitlements['workout.sessions_per_week'].limitValue;
  return cap !== null && sessionsThisWeek >= cap;
}

// ─── The bypass fix itself ───────────────────────────────────────────────

export interface RequestedTaskGates {
  maxExercises?: number | undefined;
  fitnessOnly?:  boolean | undefined;
}

export interface ResolvedTaskGates {
  maxExercises: number | undefined; // undefined = unlimited, matching TaskContext's convention
  fitnessOnly:  boolean;
  /** Non-empty when the client asked for something the server didn't grant — logged, not thrown. */
  divergences:  string[];
}

/**
 * Pure — the server's answer to "how many exercises, what type" for this
 * client, ignoring whatever the client itself claimed. This is the fix for
 * the bypass documented in docs/BILLING_FEATURE_MODEL_AUDIT_20260804.md §3.1:
 * before Fase 2, `body.task.maxExercises`/`fitnessOnly` were honoured as-is.
 *
 * `requested` is kept only to compute `divergences` for the measurement
 * window this fase's checklist asks for — it never influences the resolved
 * values.
 */
export function resolveAuthoritativeTaskGates(
  entitlements: Entitlements,
  requested: RequestedTaskGates,
): ResolvedTaskGates {
  const maxExercises = entitlements['workout.exercises_per_session'].limitValue ?? undefined;
  const fitnessOnly  = entitlements['workout.exercise_type'].limitValue === 0;

  const divergences: string[] = [];
  if ((requested.maxExercises ?? null) !== (maxExercises ?? null)) {
    divergences.push(`maxExercises: cliente pediu ${requested.maxExercises ?? 'null'}, entitlement real é ${maxExercises ?? 'null'}`);
  }
  if (!!requested.fitnessOnly !== fitnessOnly) {
    divergences.push(`fitnessOnly: cliente pediu ${!!requested.fitnessOnly}, entitlement real é ${fitnessOnly}`);
  }

  return { maxExercises, fitnessOnly, divergences };
}
