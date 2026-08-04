// Núcleo de entitlements — Fase 1 de docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md.
//
// Fonte única da decisão "a que este utilizador tem direito?". Zero I/O, zero
// dependência de React ou de ambiente — consumível por hooks de cliente (via
// src/hooks/useFeatureAccess.ts) e, na Fase 2, pelo servidor.
//
// Substitui duas implementações que hoje divergem em linguagem de acesso a
// dados (useFeatureAccess.ts:12-22 e api/send-invitation.ts:139-154) sem
// nenhum teste que garanta que produzem o mesmo resultado.

import type { FeatureKey, FeatureAccess, FeaturePermission, PlanKey, Subscription } from '../types';

// ─── Elevação de janela (welcome/trial) ─────────────────────────────────────

/**
 * Resolve o plan_key efectivo para efeitos de licenciamento, considerando a
 * janela de 21 dias de welcome (free→ai_fitness) e de trial (trial→pro).
 *
 * Matematicamente equivalente a `useWelcomeWindow`/`useTrialWindow` estarem
 * em estado 'active' ou 'expiring' (ambos elevam; só 'expired' não eleva) —
 * ver src/hooks/useWelcomeWindow.ts e useTrialWindow.ts, que continuam a ser
 * a autoridade sobre o estado *rico* usado para banners de contagem
 * decrescente (daysLeft, aviso). Esta função é a autoridade sobre uma única
 * pergunta mais estreita: qual plan_key aplicar agora. Antes desta função,
 * essa pergunta tinha duas respostas possíveis no código (cliente e
 * servidor); agora tem uma.
 *
 * `now` é injectável para testes determinísticos — nunca lê `Date.now()`
 * implicitamente.
 */
export function resolveEffectivePlanKey(
  subscription: Subscription | null | undefined,
  now: Date = new Date(),
): PlanKey | undefined {
  if (!subscription) return undefined;

  if (subscription.plan_key === 'free' && isWindowActive(subscription.current_period_end, now)) {
    return 'ai_fitness';
  }
  if (subscription.plan_key === 'trial' && isWindowActive(subscription.current_period_end, now)) {
    return 'pro';
  }
  return subscription.plan_key;
}

function isWindowActive(currentPeriodEnd: string | null, now: Date): boolean {
  if (!currentPeriodEnd) return false;
  return new Date(currentPeriodEnd).getTime() > now.getTime();
}

/**
 * Início (00:00 local) da semana corrente, Segunda-feira — o limite usado
 * para contar sessões contra `workout.sessions_per_week`. Única
 * implementação; antes só existia inline em StartWorkoutScreen.tsx (Fase 2
 * do plano de licenciamento passa a reutilizá-la também no servidor).
 */
export function startOfWeek(now: Date = new Date()): Date {
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon … 6=Sun
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - dayOfWeek);
  return start;
}

// ─── Catálogo de feature keys ───────────────────────────────────────────────

// Tipado como Record<FeatureKey, true> em vez de FeatureKey[] de propósito:
// se alguém adicionar uma key à union em types/feature-permissions.ts e
// esquecer de a listar aqui, o TypeScript recusa compilar — a lista nunca
// pode ficar desalinhada da union em silêncio.
const FEATURE_KEY_SET: Record<FeatureKey, true> = {
  'scores.basic':                  true,
  'scores.advanced':               true,
  'ai.workout_generation':         true,
  'ai.checkin_adjustment':         true,
  'ai.advanced_analysis':          true,
  'coach_dna':                     true,
  'clients.limit':                 true,
  'studio.branding':               true,
  'marketplace.listing':           true,
  'marketplace.revenue_share':     true,
  'workout.sessions_per_week':     true,
  'workout.exercises_per_session': true,
  'workout.exercise_type':         true,
  'checkin.full':                  true,
  'trainer_plan.days_per_week':    true,
  'progress.fitness_advanced':     true,
  'progress.performance':          true,
  'checkin.full_capture':          true,
  'checkin.voice_input':           true,
  'ai.checkin_interpretation':     true,
  'progress.client_raw_data':      true,
  'progress.coach_operational':    true,
};

export const ALL_FEATURE_KEYS = Object.keys(FEATURE_KEY_SET) as FeatureKey[];

// ─── Política de omissão — fail-closed ──────────────────────────────────────

type Grant = Omit<FeatureAccess, 'loading'>;

/**
 * O que um utilizador recebe quando `feature_permissions` não tem linha para
 * o par (plan_key, feature_key) dele — plan_key novo sem seed completo,
 * DELETE acidental, erro de migração. Antes desta fase: `allowed ?? false`
 * (seguro) mas `limit_value ?? null` (inseguro — null = ilimitado). A mesma
 * ausência de dado produzia um resultado permissivo para caps numéricos e
 * restritivo para booleanos, dependendo só do tipo do campo, nunca de uma
 * decisão. Agora é sempre a mais restritiva.
 *
 * Para caps numéricos, o valor aqui é o mais restritivo entre os planos
 * genuinamente configurados hoje (não um número arbitrário) — um plan_key
 * novo e não semeado comporta-se como o tier mais básico da mesma audiência
 * até alguém o configurar explicitamente. Ver docs/BILLING_FEATURE_MODEL_AUDIT_20260804.md
 * para os valores reais de onde estes derivam.
 */
export const DEFAULTS: Record<FeatureKey, Grant> = {
  'scores.basic':                  { allowed: false, limitValue: null },
  'scores.advanced':               { allowed: false, limitValue: null },
  // Fail-closed apesar de FREE hoje conceder true — geração por IA é a única
  // operação com custo variável real (auditoria §3.1); uma combinação
  // plan_key×feature desconhecida não deve disparar chamadas de IA.
  'ai.workout_generation':         { allowed: false, limitValue: null },
  'ai.checkin_adjustment':         { allowed: false, limitValue: null },
  'ai.advanced_analysis':          { allowed: false, limitValue: null },
  'coach_dna':                     { allowed: false, limitValue: null },
  'clients.limit':                 { allowed: true,  limitValue: 3 },    // trial: cap mais restritivo configurado
  'studio.branding':               { allowed: false, limitValue: null },
  'marketplace.listing':           { allowed: false, limitValue: null },
  'marketplace.revenue_share':     { allowed: false, limitValue: null },
  'workout.sessions_per_week':     { allowed: true,  limitValue: 1 },    // free: cap mais restritivo configurado
  'workout.exercises_per_session': { allowed: true,  limitValue: 6 },    // free
  'workout.exercise_type':         { allowed: true,  limitValue: 0 },    // free (0 = fitness only)
  'checkin.full':                  { allowed: false, limitValue: null },  // legacy, ver types/feature-permissions.ts
  'trainer_plan.days_per_week':    { allowed: true,  limitValue: 1 },    // free
  'progress.fitness_advanced':     { allowed: false, limitValue: null },
  'progress.performance':          { allowed: false, limitValue: null },
  // Fase 4.1 — mesma disciplina fail-closed que scores.basic: DEFAULT é
  // restritivo mesmo que, uma vez semeadas, estas keys resolvam para true em
  // todos os planos reais (dados operacionais/brutos nunca foram gateados
  // na UI). O DEFAULT protege um plan_key hipotético sem seed, não descreve
  // o comportamento actual.
  'checkin.full_capture':          { allowed: false, limitValue: null },
  'checkin.voice_input':           { allowed: false, limitValue: null },
  'ai.checkin_interpretation':     { allowed: false, limitValue: null },
  'progress.client_raw_data':      { allowed: false, limitValue: null },
  'progress.coach_operational':    { allowed: false, limitValue: null },
};

/** Sem assinatura de todo — nada é concedido, nem os defaults de "plano desconhecido". */
const NO_SUBSCRIPTION_GRANT: Grant = { allowed: false, limitValue: null };

// ─── Mapeamento de linhas para entitlements tipados ─────────────────────────

export type Entitlements = Record<FeatureKey, FeatureAccess>;

/**
 * Mapeia linhas de `feature_permissions` (de qualquer conjunto de planos —
 * filtra internamente por `planKey`) para um objecto tipado e total: toda
 * `FeatureKey` está sempre presente, configurada ou por omissão (DEFAULTS).
 *
 * `planKey` undefined (sem assinatura) nunca cai em DEFAULTS — cai em
 * NO_SUBSCRIPTION_GRANT, estritamente mais restritivo.
 */
export function toEntitlements(
  rows: readonly FeaturePermission[],
  planKey: PlanKey | undefined,
): Entitlements {
  const result = {} as Entitlements;

  for (const key of ALL_FEATURE_KEYS) {
    if (!planKey) {
      result[key] = { ...NO_SUBSCRIPTION_GRANT, loading: false };
      continue;
    }
    const row = rows.find(r => r.plan_key === planKey && r.feature_key === key);
    result[key] = row
      ? { allowed: row.allowed, limitValue: row.limit_value, loading: false }
      : { ...DEFAULTS[key], loading: false };
  }

  return result;
}

// ─── Origem do treino — Fase 4 ──────────────────────────────────────────────

export type WorkoutOrigin = 'trainer_prescribed' | 'autonomous_ai';

/**
 * `trainer_prescribed` × `autonomous_ai` — a partir de `created_by <>
 * assigned_to` em `workout_plans` (verificado em produção: correlação
 * perfeita com `source`, 136/136 linhas, docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md
 * §Fase 4). Nenhuma coluna nova, nenhum backfill — o discriminador já existe
 * e já é autoridade na RLS (`client creates own ai-generated plan`).
 *
 * Único lugar onde esta decisão é tomada — Fase 4 remove as duas
 * reimplementações inline que existiam (o filtro de exercícios em
 * StartWorkoutScreen.tsx e o cap de dias, ambos aplicados incorrectamente a
 * conteúdo que a própria query já garantia ser `trainer_prescribed`).
 */
export function resolveWorkoutOrigin(plan: { created_by: string; assigned_to: string }): WorkoutOrigin {
  return plan.created_by === plan.assigned_to ? 'autonomous_ai' : 'trainer_prescribed';
}

// ─── Direito patrocinado — Fase 4.1 ─────────────────────────────────────────

export interface SponsoredAccess {
  executionFull:      boolean;
  checkinFullCapture:  boolean;
  progressOperational: boolean;
}

/**
 * O que um vínculo activo com um treinador concede ao aluno, independente
 * do `plan_key` do próprio aluno — decisão comercial de 2026-08-04
 * (docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md §Fase 4/4.1):
 * "execução integral + captura de check-in + métricas operacionais
 * determinísticas; não cobre automação nem inferência".
 *
 * Nota de modelagem: isto NÃO é uma linha em `feature_permissions` — não
 * varia por plan_key, varia por `hasActiveTrainerLink`. Modelá-lo como
 * feature_key com uma linha por plano estaria semanticamente errado (o
 * vínculo concede o mesmo patrocínio a um aluno FREE, AI FITNESS ou AI
 * PERFORMANCE). Todas as três chaves resolvem para o mesmo booleano por
 * desenho — mantidas separadas no tipo (não um único `sponsored: boolean`)
 * porque a decisão as trata como direitos distintos, mesmo coincidindo hoje.
 *
 * O que fica de fora por desenho (nunca patrocinado, sempre pago pelo plano
 * do aluno ou pela franquia do treinador — Fase 4.2): `checkin.voice_input`,
 * `ai.checkin_interpretation`, `ai.checkin_adjustment`, `progress.fitness_advanced`,
 * `progress.performance`, `ai.advanced_analysis`.
 */
export function resolveSponsoredAccess(hasActiveTrainerLink: boolean): SponsoredAccess {
  return {
    executionFull:       hasActiveTrainerLink,
    checkinFullCapture:  hasActiveTrainerLink,
    progressOperational: hasActiveTrainerLink,
  };
}
