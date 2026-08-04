// Guarda anti-regressão — Fase 3 de docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md.
//
// A regressão `trial → pro` (uma das quatro causas raiz apuradas nesta
// auditoria) só existiu porque nada verificava se toda combinação
// aplicável feature_key × plan_key tinha uma linha em `feature_permissions`.
// Este módulo é essa verificação — pura, sem I/O, para poder ser testada
// com fixtures e reutilizada por um script que lê a base de dados real.

import type { FeatureKey } from '../types';

export type Audience = 'client' | 'trainer';

/**
 * A que audiência cada feature_key se aplica — derivado do código que
 * efectivamente lê cada key (grep, não suposição): StartWorkoutScreen.tsx
 * é inalcançável pela própria conta de um treinador (`SideMenu.tsx`
 * exclui 'workout' de TRAINER_EXCLUDE); CheckInProntidaoScreen.tsx e
 * PerformanceDashboardScreen.tsx são alcançáveis por ambos (aceitam
 * `isTrainerContext`/`isTrainerOverride`, usados quando `false` contra o
 * próprio plano do utilizador, seja ele client ou trainer).
 */
export const FEATURE_AUDIENCE: Record<FeatureKey, Audience | 'both'> = {
  'scores.basic':                   'both',
  'scores.advanced':                'both', // legacy — sem leitor na UI, mas semeado historicamente nos 6 planos
  'ai.workout_generation':          'client',
  'ai.checkin_adjustment':          'client',
  'ai.advanced_analysis':           'client',
  'coach_dna':                      'trainer',
  'clients.limit':                  'trainer',
  'studio.branding':                'trainer',
  'marketplace.listing':            'trainer',
  'marketplace.revenue_share':      'trainer',
  'workout.sessions_per_week':      'client',
  'workout.exercises_per_session':  'client',
  'workout.exercise_type':          'client',
  'checkin.full':                   'both',
  'trainer_plan.days_per_week':     'client',
  'progress.fitness_advanced':      'both',
  'progress.performance':           'both',
};

export interface PlanDefinitionRow { plan_key: string; audience: Audience; is_active?: boolean }
export interface PermissionKeyRow { feature_key: string; plan_key: string }

export interface MissingPermission { feature_key: FeatureKey; plan_key: string }

/**
 * Combinações feature_key × plan_key que deveriam ter uma linha em
 * `feature_permissions` e não têm. Vazio = completo.
 */
export function findMissingPermissions(
  planDefinitions: PlanDefinitionRow[],
  existingRows: PermissionKeyRow[],
): MissingPermission[] {
  const existing = new Set(existingRows.map(r => `${r.feature_key}::${r.plan_key}`));
  const missing: MissingPermission[] = [];

  for (const plan of planDefinitions) {
    if (plan.is_active === false) continue;
    for (const featureKey of Object.keys(FEATURE_AUDIENCE) as FeatureKey[]) {
      const audience = FEATURE_AUDIENCE[featureKey];
      const applies = audience === 'both' || audience === plan.audience;
      if (!applies) continue;
      if (!existing.has(`${featureKey}::${plan.plan_key}`)) {
        missing.push({ feature_key: featureKey, plan_key: plan.plan_key });
      }
    }
  }
  return missing;
}
