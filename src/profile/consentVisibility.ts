import type { ConsentCategory, ConsentMatrix, ConsentValue } from '../types/profile-v2';
import { DEFAULT_PERSONAL_CONSENT, DEFAULT_STUDIO_CONSENT } from '../types/profile-v2';

/**
 * Visual-only consent gate for human viewers (trainer / studio staff).
 *
 * This NEVER affects what the AI receives — `buildAIContext.ts` is gated
 * exclusively by `consent.allow_ai_adaptation`. Do not import this module
 * from any AI context-building code.
 */
export type ConsentViewer = 'personal' | 'studio';

export type CategoryRender =
  | { mode: 'full'; data: Record<string, unknown> }
  | { mode: 'summary'; data: Record<string, unknown> }
  | { mode: 'locked' }
  | { mode: 'hidden' };

export interface ConsentFilteredProfile {
  training_objective:           CategoryRender;
  training_history:             CategoryRender;
  pain_operational_restriction: CategoryRender;
  relevant_comorbidity:          CategoryRender;
  sensitive_medication:          CategoryRender;
  emotional_psychiatric_health:  CategoryRender;
  body_rhythm:                    CategoryRender;
}

/** Loosely-typed sections, matching how `profile_v2` rows are fetched from Supabase. */
export interface ConsentProfileSections {
  objectives?:          Record<string, unknown> | null | undefined;
  movement_history?:    Record<string, unknown> | null | undefined;
  functional_capacity?: Record<string, unknown> | null | undefined;
  comorbidities?:       Record<string, unknown> | null | undefined;
  declared_health?:     Record<string, unknown> | null | undefined;
  sensitive_factors?:   Record<string, unknown> | null | undefined;
  body_rhythm?:         Record<string, unknown> | null | undefined;
  consent?:             ConsentMatrix | null | undefined;
}

function renderCategory(
  value: ConsentValue,
  full?: Record<string, unknown>,
  summary?: Record<string, unknown>,
  granted?: boolean,
): CategoryRender {
  if (!full) return { mode: 'hidden' };
  switch (value) {
    case 'share':
      return { mode: 'full', data: full };
    case 'summary':
      return summary ? { mode: 'summary', data: summary } : { mode: 'hidden' };
    case 'authorized_only':
      return granted ? { mode: 'full', data: full } : { mode: 'locked' };
    case 'hidden':
    default:
      return { mode: 'hidden' };
  }
}

export function applyConsentToProfile(
  profile: ConsentProfileSections,
  viewer: ConsentViewer,
  grants?: Set<keyof ConsentCategory>,
): ConsentFilteredProfile {
  const category: ConsentCategory =
    profile.consent?.[viewer] ?? (viewer === 'personal' ? DEFAULT_PERSONAL_CONSENT : DEFAULT_STUDIO_CONSENT);

  const objectives          = profile.objectives ?? undefined;
  const movementHistory     = profile.movement_history ?? undefined;
  const functionalCapacity  = profile.functional_capacity ?? undefined;
  const comorbidities       = profile.comorbidities ?? undefined;
  const declaredHealth      = profile.declared_health ?? undefined;
  const sensitiveFactors    = profile.sensitive_factors ?? undefined;
  const bodyRhythm          = profile.body_rhythm ?? undefined;

  const comorbidityFull = (comorbidities || declaredHealth) ? {
    conditions:    comorbidities?.conditions,
    has_condition: declaredHealth?.has_condition,
    categories:    declaredHealth?.categories,
    free_text:     declaredHealth?.free_text,
    voice_note:    [comorbidities?.voice_note, declaredHealth?.voice_note]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .join(' / ') || undefined,
  } : undefined;

  const comorbiditySummary = (comorbidities || declaredHealth) ? {
    has_condition: declaredHealth?.has_condition,
    categories:    declaredHealth?.categories,
  } : undefined;

  const medicationFull = sensitiveFactors?.regular_medications
    ? { regular_medications: sensitiveFactors.regular_medications }
    : undefined;

  const medicationSummary = sensitiveFactors?.regular_medications
    ? { uses_medication: true }
    : undefined;

  const emotionalFull = sensitiveFactors ? {
    declares_emotional_history:      sensitiveFactors.declares_emotional_history,
    declares_recreational_substance: sensitiveFactors.declares_recreational_substance,
    voice_note:                       sensitiveFactors.voice_note,
  } : undefined;

  const emotionalSummary = sensitiveFactors ? {
    declares_emotional_history:      sensitiveFactors.declares_emotional_history,
    declares_recreational_substance: sensitiveFactors.declares_recreational_substance,
  } : undefined;

  const bodyRhythmFull = (bodyRhythm && bodyRhythm.enabled === true) ? bodyRhythm : undefined;
  const bodyRhythmSummary = bodyRhythmFull ? { enabled: true } : undefined;

  return {
    training_objective: renderCategory(
      category.training_objective,
      objectives,
      objectives ? { primary_goal: objectives.primary_goal } : undefined,
      grants?.has('training_objective'),
    ),
    training_history: renderCategory(
      category.training_history,
      movementHistory,
      movementHistory ? { fitness_level: movementHistory.fitness_level } : undefined,
      grants?.has('training_history'),
    ),
    pain_operational_restriction: renderCategory(
      category.pain_operational_restriction,
      functionalCapacity,
      functionalCapacity ? { pain_level: functionalCapacity.pain_level, mobility: functionalCapacity.mobility } : undefined,
      grants?.has('pain_operational_restriction'),
    ),
    relevant_comorbidity: renderCategory(category.relevant_comorbidity, comorbidityFull, comorbiditySummary, grants?.has('relevant_comorbidity')),
    sensitive_medication: renderCategory(category.sensitive_medication, medicationFull, medicationSummary, grants?.has('sensitive_medication')),
    emotional_psychiatric_health: renderCategory(category.emotional_psychiatric_health, emotionalFull, emotionalSummary, grants?.has('emotional_psychiatric_health')),
    body_rhythm: renderCategory(category.body_rhythm, bodyRhythmFull, bodyRhythmSummary, grants?.has('body_rhythm')),
  };
}
