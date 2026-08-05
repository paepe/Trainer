import { describe, it, expect } from 'vitest';
import { findMissingPermissions, FEATURE_AUDIENCE } from './completeness';
import type { FeatureKey } from '../types';

const PLANS = [
  { plan_key: 'free',           audience: 'client' as const },
  { plan_key: 'ai_fitness',     audience: 'client' as const },
  { plan_key: 'ai_performance', audience: 'client' as const },
  { plan_key: 'trial',          audience: 'trainer' as const },
  { plan_key: 'pro',            audience: 'trainer' as const },
  { plan_key: 'elite',          audience: 'trainer' as const },
];

// Espelha as 87 linhas reais em produção após a Fase 3 (verificado 2026-08-04).
function fullRows() {
  const rows: { feature_key: string; plan_key: string }[] = [];
  for (const key of Object.keys(FEATURE_AUDIENCE) as FeatureKey[]) {
    const audience = FEATURE_AUDIENCE[key];
    for (const plan of PLANS) {
      if (audience === 'both' || audience === plan.audience) rows.push({ feature_key: key, plan_key: plan.plan_key });
    }
  }
  return rows;
}

describe('findMissingPermissions', () => {
  it('não acusa nada quando todas as combinações aplicáveis têm linha', () => {
    expect(findMissingPermissions(PLANS, fullRows())).toEqual([]);
  });

  it('detecta a regressão real desta auditoria: trial tem checkin.full, pro não', () => {
    const rows = fullRows().filter(r => !(r.feature_key === 'checkin.full' && r.plan_key === 'pro'));
    const missing = findMissingPermissions(PLANS, rows);
    expect(missing).toContainEqual({ feature_key: 'checkin.full', plan_key: 'pro' });
  });

  it('não exige linhas de audiência "client" para planos de treinador', () => {
    const rows = fullRows().filter(r => r.feature_key !== 'workout.sessions_per_week' || r.plan_key !== 'pro');
    // workout.sessions_per_week nunca teve linha para 'pro' (é 'client'-only) — não deve acusar falta
    const missing = findMissingPermissions(PLANS, rows);
    expect(missing).toEqual([]);
  });

  it('não exige linhas de audiência "trainer" para planos de aluno', () => {
    const rows = fullRows().filter(r => r.feature_key !== 'clients.limit' || r.plan_key !== 'free');
    const missing = findMissingPermissions(PLANS, rows);
    expect(missing).toEqual([]);
  });

  it('ignora planos inactivos', () => {
    const plansWithInactive = [...PLANS, { plan_key: 'legacy_discontinued', audience: 'client' as const, is_active: false }];
    const missing = findMissingPermissions(plansWithInactive, fullRows());
    expect(missing).toEqual([]);
  });

  it('acusa um plano novo sem seed nenhum', () => {
    const plansWithNew = [...PLANS, { plan_key: 'studio', audience: 'trainer' as const }];
    const missing = findMissingPermissions(plansWithNew, fullRows());
    const trainerFeatureCount = (Object.keys(FEATURE_AUDIENCE) as FeatureKey[])
      .filter(k => FEATURE_AUDIENCE[k] === 'both' || FEATURE_AUDIENCE[k] === 'trainer').length;
    expect(missing).toHaveLength(trainerFeatureCount);
    expect(missing.every(m => m.plan_key === 'studio')).toBe(true);
  });
});
