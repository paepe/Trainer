import { describe, it, expect } from 'vitest';
import { resolveAuthoritativeTaskGates, isSessionsPerWeekCapReached } from './entitlements';
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
  it('ignora um cliente FREE que se auto-declara ilimitado e sem filtro de tipo', () => {
    const resolved = resolveAuthoritativeTaskGates(freeEntitlements, {
      maxExercises: 999,
      fitnessOnly:  false,
    });
    expect(resolved.maxExercises).toBe(6);
    expect(resolved.fitnessOnly).toBe(true);
    expect(resolved.divergences).toHaveLength(2);
    expect(resolved.divergences[0]).toMatch(/maxExercises/);
    expect(resolved.divergences[1]).toMatch(/fitnessOnly/);
  });

  it('não gera divergência quando o cliente pede exactamente o que tem direito', () => {
    const resolved = resolveAuthoritativeTaskGates(freeEntitlements, {
      maxExercises: 6,
      fitnessOnly:  true,
    });
    expect(resolved.divergences).toEqual([]);
  });

  it('AI PERFORMANCE (sem cap real) resolve maxExercises undefined, não 999 nem null literal', () => {
    const resolved = resolveAuthoritativeTaskGates(performanceEntitlements, { maxExercises: 3, fitnessOnly: true });
    expect(resolved.maxExercises).toBeUndefined();
    expect(resolved.fitnessOnly).toBe(false);
    expect(resolved.divergences).toHaveLength(2); // cliente pediu 3/true, direito real é ilimitado/false
  });

  it('um plan_key desconhecido (sem linhas) cai nos DEFAULTS fail-closed, não em ilimitado', () => {
    const emptyEntitlements = toEntitlements([], 'pro');
    const resolved = resolveAuthoritativeTaskGates(emptyEntitlements, { maxExercises: 999, fitnessOnly: false });
    expect(resolved.maxExercises).toBe(DEFAULTS['workout.exercises_per_session'].limitValue);
    expect(resolved.fitnessOnly).toBe(true); // DEFAULTS['workout.exercise_type'].limitValue === 0
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
