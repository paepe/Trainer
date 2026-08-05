import { describe, it, expect, vi } from 'vitest';
import { resolveAuthoritativeTaskGates, isSessionsPerWeekCapReached, resolveUserEntitlements } from './entitlements';
import { toEntitlements, DEFAULTS } from '../../src/licensing/entitlements';
import type { FeaturePermission } from '../../src/types';

// FREE snapshot — matches production (docs/BILLING_FEATURE_MODEL_AUDIT_20260804.md):
// 6 exercises/session, fitness-only (limit_value 0), 1 session/week.
const FREE_ROWS: FeaturePermission[] = [
  { feature_key: 'workout.exercises_per_session', plan_key: 'free', allowed: true, limit_value: 6 },
  { feature_key: 'workout.exercise_type',         plan_key: 'free', allowed: true, limit_value: 0 },
  { feature_key: 'workout.sessions_per_week',      plan_key: 'free', allowed: true, limit_value: 1 },
];
const freeEntitlements = toEntitlements(FREE_ROWS, 'free');

const AI_PERFORMANCE_ROWS: FeaturePermission[] = [
  { feature_key: 'workout.exercises_per_session', plan_key: 'ai_performance', allowed: true, limit_value: null },
  { feature_key: 'workout.exercise_type',         plan_key: 'ai_performance', allowed: true, limit_value: null },
  { feature_key: 'workout.sessions_per_week',      plan_key: 'ai_performance', allowed: true, limit_value: null },
];
const performanceEntitlements = toEntitlements(AI_PERFORMANCE_ROWS, 'ai_performance');

describe('resolveAuthoritativeTaskGates — o teste de bypass', () => {
  it('ignora um cliente FREE que se auto-declara ilimitado — fitnessOnly é sempre false (Fase 5: retirado como gate comercial)', () => {
    const resolved = resolveAuthoritativeTaskGates(freeEntitlements, {
      maxExercises: 999,
      fitnessOnly:  false,
    });
    expect(resolved.maxExercises).toBe(6);
    expect(resolved.fitnessOnly).toBe(false);
    expect(resolved.divergences).toHaveLength(1);
    expect(resolved.divergences[0]).toMatch(/maxExercises/);
  });

  it('não gera divergência quando o cliente pede exactamente o que tem direito', () => {
    const resolved = resolveAuthoritativeTaskGates(freeEntitlements, {
      maxExercises: 6,
      fitnessOnly:  false,
    });
    expect(resolved.divergences).toEqual([]);
  });

  it('AI PERFORMANCE (sem cap real) resolve maxExercises undefined, não 999 nem null literal', () => {
    const resolved = resolveAuthoritativeTaskGates(performanceEntitlements, { maxExercises: 3, fitnessOnly: true });
    expect(resolved.maxExercises).toBeUndefined();
    expect(resolved.fitnessOnly).toBe(false);
    expect(resolved.divergences).toHaveLength(2); // cliente pediu 3/true, direito real é ilimitado/false
  });

  it('um plan_key desconhecido (sem linhas) cai nos DEFAULTS fail-closed para maxExercises; fitnessOnly é sempre false (retirado, Fase 5)', () => {
    const emptyEntitlements = toEntitlements([], 'pro');
    const resolved = resolveAuthoritativeTaskGates(emptyEntitlements, { maxExercises: 999, fitnessOnly: false });
    expect(resolved.maxExercises).toBe(DEFAULTS['workout.exercises_per_session'].limitValue);
    expect(resolved.fitnessOnly).toBe(false);
  });
});

describe('isSessionsPerWeekCapReached', () => {
  it('bloqueia a partir da 6ª sessão da semana para FREE (cap=1)', () => {
    expect(isSessionsPerWeekCapReached(freeEntitlements, 0)).toBe(false);
    expect(isSessionsPerWeekCapReached(freeEntitlements, 1)).toBe(true);
    expect(isSessionsPerWeekCapReached(freeEntitlements, 5)).toBe(true);
  });

  it('nunca bloqueia quando o cap é null (ilimitado)', () => {
    expect(isSessionsPerWeekCapReached(performanceEntitlements, 0)).toBe(false);
    expect(isSessionsPerWeekCapReached(performanceEntitlements, 999)).toBe(false);
  });
});

describe('resolveUserEntitlements', () => {
  it('preserves the authoritative effective plan alongside the grants for server telemetry', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        plan_key: 'free', status: 'active', billing_cycle: null, current_period_end: null,
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(FREE_ROWS), { status: 200 }));

    const resolved = await resolveUserEntitlements('client-id');

    expect(resolved.planKey).toBe('free');
    expect(resolved['workout.exercises_per_session'].limitValue).toBe(6);
    fetchSpy.mockRestore();
  });
});
