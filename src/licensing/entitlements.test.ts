import { describe, it, expect } from 'vitest';
import {
  resolveEffectivePlanKey, toEntitlements, DEFAULTS, ALL_FEATURE_KEYS, resolveWorkoutOrigin,
} from './entitlements';
import type { FeaturePermission, Subscription, PlanKey } from '../types';

function sub(overrides: Partial<Subscription>): Subscription {
  return {
    plan_key: 'free', status: 'active', billing_cycle: null, current_period_end: null,
    ...overrides,
  };
}

const NOW = new Date('2026-08-04T12:00:00Z');
const FUTURE = new Date('2026-08-10T12:00:00Z').toISOString(); // 6 days ahead
const PAST   = new Date('2026-07-01T12:00:00Z').toISOString(); // in the past

// ─── resolveEffectivePlanKey ─────────────────────────────────────────────

describe('resolveEffectivePlanKey', () => {
  it('returns undefined when there is no subscription', () => {
    expect(resolveEffectivePlanKey(null, NOW)).toBeUndefined();
    expect(resolveEffectivePlanKey(undefined, NOW)).toBeUndefined();
  });

  it('elevates free → ai_fitness while the welcome window is active', () => {
    const s = sub({ plan_key: 'free', current_period_end: FUTURE });
    expect(resolveEffectivePlanKey(s, NOW)).toBe('ai_fitness');
  });

  it('does not elevate free once the welcome window has expired', () => {
    const s = sub({ plan_key: 'free', current_period_end: PAST });
    expect(resolveEffectivePlanKey(s, NOW)).toBe('free');
  });

  it('does not elevate free with no current_period_end (pre-welcome-window accounts)', () => {
    const s = sub({ plan_key: 'free', current_period_end: null });
    expect(resolveEffectivePlanKey(s, NOW)).toBe('free');
  });

  it('elevates trial → pro while the trial window is active', () => {
    const s = sub({ plan_key: 'trial', current_period_end: FUTURE });
    expect(resolveEffectivePlanKey(s, NOW)).toBe('pro');
  });

  it('does not elevate trial once the trial window has expired', () => {
    const s = sub({ plan_key: 'trial', current_period_end: PAST });
    expect(resolveEffectivePlanKey(s, NOW)).toBe('trial');
  });

  it('is exact at the boundary — current_period_end equal to now does not elevate', () => {
    const s = sub({ plan_key: 'trial', current_period_end: NOW.toISOString() });
    expect(resolveEffectivePlanKey(s, NOW)).toBe('trial');
  });

  it.each<PlanKey>(['ai_fitness', 'ai_performance', 'pro', 'elite'])(
    'never elevates a plan that is not free or trial (%s passes through unchanged)',
    (planKey) => {
      const s = sub({ plan_key: planKey, current_period_end: FUTURE });
      expect(resolveEffectivePlanKey(s, NOW)).toBe(planKey);
    },
  );

  it('defaults `now` to the real clock when omitted (smoke test, not a value assertion)', () => {
    const s = sub({ plan_key: 'free', current_period_end: null });
    expect(() => resolveEffectivePlanKey(s)).not.toThrow();
  });
});

// ─── toEntitlements — fail-closed on omission ────────────────────────────

describe('toEntitlements — omission policy', () => {
  it('with no planKey, denies everything — never falls back to DEFAULTS', () => {
    const ents = toEntitlements([], undefined);
    for (const key of ALL_FEATURE_KEYS) {
      expect(ents[key]).toEqual({ allowed: false, limitValue: null, loading: false });
    }
  });

  it('a configured row always wins over DEFAULTS, including when it is more permissive', () => {
    const rows: FeaturePermission[] = [
      { feature_key: 'ai.workout_generation', plan_key: 'free', allowed: true, limit_value: null },
    ];
    const ents = toEntitlements(rows, 'free');
    expect(ents['ai.workout_generation']).toEqual({ allowed: true, limitValue: null, loading: false });
  });

  it('a missing row falls back to DEFAULTS, never to allowed:true/limitValue:null by omission', () => {
    const ents = toEntitlements([], 'pro');
    for (const key of ALL_FEATURE_KEYS) {
      expect(ents[key]).toEqual({ ...DEFAULTS[key], loading: false });
      // The historical bug this fixes: a numeric cap must never silently
      // become unlimited just because nobody configured it.
      if (DEFAULTS[key].limitValue === null) {
        expect(ents[key].allowed).toBe(false);
      }
    }
  });

  it('every FeatureKey has an explicit DEFAULTS entry (exhaustiveness is enforced at compile time, this is a runtime sanity check)', () => {
    expect(Object.keys(DEFAULTS).sort()).toEqual([...ALL_FEATURE_KEYS].sort());
  });

  it('rows for a different plan_key never leak into the resolved plan', () => {
    const rows: FeaturePermission[] = [
      { feature_key: 'coach_dna', plan_key: 'elite', allowed: true, limit_value: null },
    ];
    const ents = toEntitlements(rows, 'pro');
    expect(ents['coach_dna']).toEqual({ ...DEFAULTS['coach_dna'], loading: false });
  });
});

// ─── toEntitlements — matriz completa contra dado real de produção ──────

// Espelha o dump real de `feature_permissions` (sevenseeds.trainer, 73 linhas,
// 2026-08-04) — ver docs/BILLING_FEATURE_MODEL_AUDIT_20260804.md. Propositadamente
// incompleto (pro/elite sem checkin.full/progress.*/workout.*) para provar que
// o núcleo reproduz o comportamento real actual, lacunas incluídas — a
// completude dos dados é responsabilidade da Fase 3, não desta.
const PRODUCTION_SNAPSHOT: FeaturePermission[] = [
  { feature_key: 'ai.advanced_analysis', plan_key: 'ai_fitness', allowed: false, limit_value: null },
  { feature_key: 'ai.advanced_analysis', plan_key: 'ai_performance', allowed: true, limit_value: null },
  { feature_key: 'ai.advanced_analysis', plan_key: 'elite', allowed: true, limit_value: null },
  { feature_key: 'ai.advanced_analysis', plan_key: 'free', allowed: false, limit_value: null },
  { feature_key: 'ai.advanced_analysis', plan_key: 'pro', allowed: true, limit_value: null },
  { feature_key: 'ai.advanced_analysis', plan_key: 'trial', allowed: false, limit_value: null },
  { feature_key: 'ai.checkin_adjustment', plan_key: 'ai_fitness', allowed: true, limit_value: null },
  { feature_key: 'ai.checkin_adjustment', plan_key: 'ai_performance', allowed: true, limit_value: null },
  { feature_key: 'ai.checkin_adjustment', plan_key: 'elite', allowed: true, limit_value: null },
  { feature_key: 'ai.checkin_adjustment', plan_key: 'free', allowed: false, limit_value: null },
  { feature_key: 'ai.checkin_adjustment', plan_key: 'pro', allowed: true, limit_value: null },
  { feature_key: 'ai.checkin_adjustment', plan_key: 'trial', allowed: false, limit_value: null },
  { feature_key: 'ai.workout_generation', plan_key: 'ai_fitness', allowed: true, limit_value: null },
  { feature_key: 'ai.workout_generation', plan_key: 'ai_performance', allowed: true, limit_value: null },
  { feature_key: 'ai.workout_generation', plan_key: 'elite', allowed: true, limit_value: null },
  { feature_key: 'ai.workout_generation', plan_key: 'free', allowed: true, limit_value: null },
  { feature_key: 'ai.workout_generation', plan_key: 'pro', allowed: true, limit_value: null },
  { feature_key: 'ai.workout_generation', plan_key: 'trial', allowed: true, limit_value: null },
  { feature_key: 'checkin.full', plan_key: 'ai_fitness', allowed: true, limit_value: null },
  { feature_key: 'checkin.full', plan_key: 'ai_performance', allowed: true, limit_value: null },
  { feature_key: 'checkin.full', plan_key: 'free', allowed: false, limit_value: null },
  { feature_key: 'checkin.full', plan_key: 'trial', allowed: true, limit_value: null },
  { feature_key: 'clients.limit', plan_key: 'elite', allowed: true, limit_value: null },
  { feature_key: 'clients.limit', plan_key: 'pro', allowed: true, limit_value: 50 },
  { feature_key: 'clients.limit', plan_key: 'trial', allowed: true, limit_value: 3 },
  { feature_key: 'coach_dna', plan_key: 'elite', allowed: true, limit_value: null },
  { feature_key: 'coach_dna', plan_key: 'pro', allowed: true, limit_value: null },
  { feature_key: 'coach_dna', plan_key: 'trial', allowed: false, limit_value: null },
  { feature_key: 'workout.exercises_per_session', plan_key: 'ai_fitness', allowed: true, limit_value: null },
  { feature_key: 'workout.exercises_per_session', plan_key: 'ai_performance', allowed: true, limit_value: null },
  { feature_key: 'workout.exercises_per_session', plan_key: 'free', allowed: true, limit_value: 6 },
  { feature_key: 'workout.exercises_per_session', plan_key: 'trial', allowed: true, limit_value: null },
  { feature_key: 'workout.sessions_per_week', plan_key: 'ai_fitness', allowed: true, limit_value: 7 },
  { feature_key: 'workout.sessions_per_week', plan_key: 'ai_performance', allowed: true, limit_value: null },
  { feature_key: 'workout.sessions_per_week', plan_key: 'free', allowed: true, limit_value: 1 },
  { feature_key: 'workout.sessions_per_week', plan_key: 'trial', allowed: true, limit_value: null },
];

describe('toEntitlements — matriz contra o snapshot real de produção', () => {
  it.each<[PlanKey, keyof typeof DEFAULTS, boolean, number | null]>([
    ['free',           'workout.sessions_per_week', true,  1],
    ['ai_fitness',     'workout.sessions_per_week', true,  7],
    ['ai_performance', 'workout.sessions_per_week', true,  null],
    ['free',           'workout.exercises_per_session', true, 6],
    ['ai_fitness',     'checkin.full', true,  null],
    ['free',           'checkin.full', false, null],
    ['pro',            'coach_dna', true, null],
    ['trial',          'coach_dna', false, null],
    ['pro',            'clients.limit', true, 50],
    ['trial',          'clients.limit', true, 3],
    ['elite',          'clients.limit', true, null],
  ])('%s.%s → allowed=%s, limitValue=%s', (planKey, feature, allowed, limitValue) => {
    const ents = toEntitlements(PRODUCTION_SNAPSHOT, planKey);
    expect(ents[feature]).toEqual({ allowed, limitValue, loading: false });
  });

  it('documents the known, still-open regression: pro has no configured row for checkin.full/progress.* — falls back to DEFAULTS (deny), not to trial-equivalent access', () => {
    const ents = toEntitlements(PRODUCTION_SNAPSHOT, 'pro');
    expect(ents['checkin.full']).toEqual({ ...DEFAULTS['checkin.full'], loading: false });
    expect(ents['progress.fitness_advanced']).toEqual({ ...DEFAULTS['progress.fitness_advanced'], loading: false });
    expect(ents['progress.performance']).toEqual({ ...DEFAULTS['progress.performance'], loading: false });
    // Fase 3 fixes this by seeding real rows — not this module's job.
  });
});

// ─── Teste de regressão explícito: trial elevado não pode perder capacidade ─

// Fixture completa (como a Fase 3 deixará a produção) — usada aqui para
// validar o MECANISMO de composição resolveEffectivePlanKey + toEntitlements,
// isolado da lacuna de dados actual documentada acima.
const COMPLETE_FIXTURE: FeaturePermission[] = [
  ...ALL_FEATURE_KEYS.map((feature_key): FeaturePermission => ({
    feature_key, plan_key: 'trial',
    allowed: DEFAULTS[feature_key].allowed, limit_value: DEFAULTS[feature_key].limitValue,
  })),
  // trial real: liga check-in completo e progresso, coach_dna desligado
  { feature_key: 'checkin.full', plan_key: 'trial', allowed: true, limit_value: null },
  { feature_key: 'progress.fitness_advanced', plan_key: 'trial', allowed: true, limit_value: null },
  { feature_key: 'progress.performance', plan_key: 'trial', allowed: true, limit_value: null },
  { feature_key: 'coach_dna', plan_key: 'trial', allowed: false, limit_value: null },
  // pro real, completo — Fase 3 fecha isto; simulado aqui como já fechado
  { feature_key: 'checkin.full', plan_key: 'pro', allowed: true, limit_value: null },
  { feature_key: 'progress.fitness_advanced', plan_key: 'pro', allowed: true, limit_value: null },
  { feature_key: 'progress.performance', plan_key: 'pro', allowed: true, limit_value: null },
  { feature_key: 'coach_dna', plan_key: 'pro', allowed: true, limit_value: null },
  { feature_key: 'clients.limit', plan_key: 'pro', allowed: true, limit_value: 50 },
];

describe('regressão: trial elevado a pro nunca perde capacidade face a trial bruto', () => {
  it('para cada feature, pro (elevado) concede pelo menos o que trial bruto concede', () => {
    const trialRaw = toEntitlements(COMPLETE_FIXTURE, 'trial');
    const trialElevated = toEntitlements(
      COMPLETE_FIXTURE,
      resolveEffectivePlanKey(sub({ plan_key: 'trial', current_period_end: FUTURE }), NOW),
    );
    expect(resolveEffectivePlanKey(sub({ plan_key: 'trial', current_period_end: FUTURE }), NOW)).toBe('pro');

    for (const key of ALL_FEATURE_KEYS) {
      const raw = trialRaw[key];
      const elevated = trialElevated[key];
      if (raw.allowed) {
        expect(elevated.allowed).toBe(true);
        // null (ilimitado) em trial nunca pode virar um número finito em pro;
        // um número finito em trial pode ficar igual ou mais generoso em pro.
        if (raw.limitValue === null) {
          expect(elevated.limitValue).toBeNull();
        } else if (elevated.limitValue !== null) {
          expect(elevated.limitValue).toBeGreaterThanOrEqual(raw.limitValue);
        }
      }
    }
  });
});

describe('resolveWorkoutOrigin', () => {
  it('classifica como autonomous_ai quando o próprio aluno criou o plano para si', () => {
    expect(resolveWorkoutOrigin({ created_by: 'user-1', assigned_to: 'user-1' })).toBe('autonomous_ai');
  });

  it('classifica como trainer_prescribed quando o criador difere do destinatário', () => {
    expect(resolveWorkoutOrigin({ created_by: 'trainer-1', assigned_to: 'client-1' })).toBe('trainer_prescribed');
  });
});
