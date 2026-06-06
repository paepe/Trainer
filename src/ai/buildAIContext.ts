import type { CoachDNARow, CoachArchetype } from '../types/coach-dna';
import type { UserProfileV2 } from '../types/profile-v2';
import type { CheckInProntidao } from '../types/checkin-v2';
import type { M5Data } from '../screens/client/performance/perf-types';
import type {
  AIContext, TrainerContext, ClientContext, TodayContext,
  StatsContext, LibraryContext, TaskContext,
} from './types';

// ─── Trainer ─────────────────────────────────────────────────────────────────

export function buildTrainerContext(row: CoachDNARow): TrainerContext {
  const archetype: CoachArchetype = row.archetype ?? 'performance';
  return {
    id:                row.trainer_id,
    name:              row.identity?.name ?? '',
    archetype,
    coachingStyles:    row.dna_style?.style ?? [],
    coreValues:        row.dna_principles?.principles ?? [],
    coachVoice:        row.philosophy?.prompt ?? '',
    motto:             row.philosophy?.motto ?? '',
    methods:           row.training?.methods ?? [],
    environments:      row.training?.envs ?? [],
    intensity:         row.training?.intensity ?? '',
    focus: {
      strength:  row.focus?.strength  ?? 0,
      endurance: row.focus?.endurance ?? 0,
      mobility:  row.focus?.mobility  ?? 0,
      athletic:  row.focus?.athletic  ?? 0,
      coord:     row.focus?.coord     ?? 0,
      balance:   row.focus?.balance   ?? 0,
    },
    preferredFormats:  row.design?.formats ?? [],
    intensityCurve:    row.design?.curve ?? '',
    sessionOrder:      row.structure?.order ?? [],
    communicationTone: row.audience?.tone ?? [],
    clientProfiles:    row.audience?.clients ?? [],
    favoriteExercises: row.exercises?.favorites ?? [],
    avoidExercises:    row.exercises?.avoid ?? [],
  };
}

// ─── Client ───────────────────────────────────────────────────────────────────

interface AmplifiedFields {
  trainabilityTier?:  string;
  priorityGoal?:      string;
  intensityCeiling?:  string;
  progressionRate?:   string;
  safetyFlags?:       string[];
  aiNotes?:           string;
}

export function buildClientContext(
  profile: UserProfileV2,
  amplified?: AmplifiedFields,
): ClientContext {
  const risk = profile.risk;
  const riskFlags: string[] = [];
  if (risk?.flags.human_validation_required)   riskFlags.push('human_validation_required');
  if (risk?.flags.ai_privacy_masking_required) riskFlags.push('ai_privacy_masking_required');
  if (risk?.flags.safety_gate_required)        riskFlags.push('safety_gate_required');

  return {
    id:                  profile.user_id,
    name:                profile.basic_data?.name ?? '',
    age:                 profile.basic_data?.age,
    biologicalSex:       profile.basic_data?.biological_sex,
    heightCm:            profile.basic_data?.height_cm,
    weightKg:            profile.basic_data?.weight_kg,
    primaryGoal:         profile.objectives?.primary_goal ?? '',
    secondaryGoals:      profile.objectives?.secondary_goals ?? [],
    voiceNote:           profile.objectives?.voice_note,
    fitnessLevel:        profile.movement_history?.fitness_level ?? '',
    daysPerWeek:         profile.availability?.days_per_week ?? 3,
    sessionDuration:     profile.availability?.session_duration_min ?? 60,
    preferredTime:       profile.availability?.preferred_time ?? '',
    preferredDays:       profile.availability?.preferred_days,
    adherenceBarriers:   profile.availability?.adherence_barriers,
    modalities:          profile.movement_history?.modalities ?? [],
    hasHealthCondition:  profile.declared_health?.has_condition ?? false,
    healthCategories:    profile.declared_health?.categories ?? [],
    healthFreeText:       profile.declared_health?.free_text,
    healthVoiceNote:      profile.declared_health?.voice_note,
    comorbidities:       profile.comorbidities?.conditions ?? [],
    comorbiditiesNote:   profile.comorbidities?.voice_note,
    mobilityLevel:       profile.functional_capacity?.mobility ?? '',
    balanceLevel:        profile.functional_capacity?.balance ?? '',
    autonomyLevel:       profile.functional_capacity?.autonomy,
    effortTolerance:     profile.functional_capacity?.effort_tolerance ?? '',
    baselinePainLevel:   profile.functional_capacity?.pain_level ?? 'none',
    accessLevel:         profile.functional_capacity?.access_level,
    supportResources:    profile.functional_capacity?.support_resources,
    instructionFormat:   profile.functional_capacity?.instruction_format,
    accessibility:       profile.environment?.accessibility,
    locations:           profile.environment?.locations ?? [],
    equipment:           profile.environment?.equipment ?? [],
    preferenceIntensity: profile.preferences?.preferred_intensity ?? '',
    explanationLevel:    profile.preferences?.explanation_level ?? '',
    preferredLanguage:   profile.preferences?.preferred_language,
    trainingFocus:       profile.preferences?.focus ?? '',
    company:             profile.preferences?.training_company,
    supportLevel:        profile.preferences?.support_level,
    riskLevel:           risk?.level ?? 'R0',
    riskFlags,
    lifestyleBarriers:   profile.habits?.lifestyle_barriers,
    sensitiveFactors:    profile.sensitive_factors ? {
      regularMedications:    profile.sensitive_factors.regular_medications,
      emotionalHistory:      profile.sensitive_factors.declares_emotional_history,
      recreationalSubstance: profile.sensitive_factors.declares_recreational_substance,
      voiceNote:             profile.sensitive_factors.voice_note,
    } : undefined,
    bodyRhythm:          profile.body_rhythm?.enabled ? {
      enabled:              true,
      cycleCurrentDay:      profile.body_rhythm.cycle_current_day,
      cycleDurationDays:    profile.body_rhythm.cycle_duration_days,
      adaptationPreference: profile.body_rhythm.adaptation_preference,
    } : undefined,
    abandonHistory:      profile.abandon_history ? {
      reasons:               profile.abandon_history.reasons,
      hadNegativeExperience: profile.abandon_history.had_negative_experience,
      fearOfInjury:          profile.abandon_history.fear_of_injury,
      feltGymConstraint:     profile.abandon_history.felt_gym_constraint,
      whatHelped:            profile.abandon_history.what_helped_consistency,
      whatDisrupted:         profile.abandon_history.what_disrupted_routine,
      voiceNote:             profile.abandon_history.voice_note,
    } : undefined,
    consentAiAdaptation: profile.consent?.allow_ai_adaptation,
    trainabilityTier:    amplified?.trainabilityTier,
    priorityGoal:        amplified?.priorityGoal,
    intensityCeiling:    amplified?.intensityCeiling,
    progressionRate:     amplified?.progressionRate,
    safetyFlags:         amplified?.safetyFlags,
    aiNotes:             amplified?.aiNotes,
  };
}

// ─── Today ────────────────────────────────────────────────────────────────────

export function buildTodayContext(checkin: CheckInProntidao): TodayContext {
  const detailed = checkin.detailed_data;
  const quick    = checkin.quick_data;
  const gate     = checkin.safety_gate;

  const painRegions: string[] = [];
  const painData = detailed?.pain ?? quick?.pain;
  if (painData?.region) painRegions.push(painData.region);

  return {
    checkinAt:        checkin.occurred_at,
    variant:          checkin.variant,
    readinessScore:   checkin.readiness_score  ?? 0,
    energyLevel:      checkin.energy_level     ?? 0,
    sleepQuality:     checkin.sleep_quality    ?? 'regular',
    sleepHours:       detailed?.sleep_hours    ?? undefined,
    fatigueLevel:     checkin.fatigue_level    ?? 0,
    fatigueType:      detailed?.fatigue_type   ?? undefined,
    emotionalState:   detailed?.emotional_state ?? undefined,
    painPresent:      checkin.pain_present     ?? false,
    painIntensity:    checkin.pain_intensity   ?? 0,
    painRegions,
    safetyStatus:     gate?.status             ?? 'clear',
    aiLedBlocked:     checkin.ai_led_blocked   ?? false,
    safetySignals:    gate?.triggered_signals  ?? [],
    availableMinutes: checkin.available_minutes ?? 60,
    location:         checkin.training_location ?? '',
    equipmentToday:   detailed?.equipment_today ?? undefined,
    cycleActive:      detailed?.body_rhythm_active      ?? undefined,
    cycleAdaptation:  detailed?.adaptation_preference?.[0] ?? undefined,
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function buildStatsContext(m5: M5Data): StatsContext {
  const recent = m5.recentSessions ?? [];
  const rpeList = recent.map(s => s.rpe).filter((r): r is number => r !== null).slice(-3);
  const avgRPELast3 = rpeList.length > 0
    ? Math.round(rpeList.reduce((a, b) => a + b, 0) / rpeList.length * 10) / 10
    : 0;

  const pain14d     = m5.painEvents14d ?? [];
  const primaryPain = m5.primaryPainRegion ?? undefined;

  return {
    adherenceRate:       m5.adherenceRate,
    workoutStreak:       m5.workoutStreak,
    sessionsLast30d:     m5.completedSessions + m5.partialSessions,
    avgEnergy7d:         m5.energyAvg,
    avgReadiness7d:      m5.sleepAvg,
    avgRPELast3,
    painEvents14d:       pain14d.length,
    primaryPainRegion:   primaryPain,
    painRecurrenceAlert: m5.painRecurrenceCount >= 3,
    predictiveScores: {
      progressionReadiness: m5.scores.progressionReadiness.score,
      fatigueRisk:          m5.scores.fatigueRisk.score,
      painRecurrence:       m5.scores.painRecurrence.score,
      sessionCompletion:    m5.scores.sessionCompletion.score,
      planFit:              m5.scores.planFit.score,
    },
  };
}

// ─── Library (exercise constraints from trainer + client equipment) ───────────

export interface LibraryInput {
  excludedRegions:    string[];
  clientEquipment:    string[];
  trainerFavorites:   string[];
  trainerAvoid:       string[];
}

export function buildLibraryContext(input: LibraryInput): LibraryContext {
  return {
    excludedRegions:    input.excludedRegions,
    favoriteExercises:  input.trainerFavorites,
    avoidExercises:     input.trainerAvoid,
    equipmentAvailable: input.clientEquipment,
  };
}

// ─── Full context assembler ───────────────────────────────────────────────────

export function buildAIContext(
  trainer: TrainerContext,
  client:  ClientContext,
  today:   TodayContext,
  stats:   StatsContext,
  library: LibraryContext,
  task:    TaskContext,
  locale:  string,
): AIContext {
  return {
    trainer,
    client,
    today,
    stats,
    library,
    task,
    locale,
    contextVersion: '1.0',
    builtAt: new Date().toISOString(),
  };
}
