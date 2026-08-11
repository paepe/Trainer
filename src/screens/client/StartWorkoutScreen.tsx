import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { supabase } from '../../supabase';
import { Icon, AvatarImage, ScreenTitle, SectionLabel } from '../../components';
import { Spinner } from '../../ui';
import { borderSubtle, textPri, textSec, primaryBtn } from '../../theme';
import type { NavFn, CheckIn, Subscription } from '../../types';
import type { Json } from '../../types/supabase';
import { requestSmartWorkout, requestWorkoutPlan, SmartWorkoutRequestError } from '../../lib/workoutGeneration';
import type { CycleContext, GeneratedWorkoutExercise } from '../../lib/workoutGeneration';
import { buildClientContext, buildTodayContext, buildLibraryContext, resolveTrainerContext, buildStatsContext } from '../../ai/buildAIContext';
import type { TrainerContext, TaskContext } from '../../ai/types';
import { useFeatureAccessMap, useEffectivePlanKey } from '../../hooks/useFeatureAccess';
import { useM5Data } from './performance/perf-engines';
import { handleHighTrainingLoad } from '../../lib/events';
import { computeCyclePhases } from './CycleScreen';
import { autoExpirePlans }   from '../../lib/autoExpirePlans';
import { translateMuscleGroup } from '../../lib/translateMuscleGroup';
import { useTranslatedExerciseContent } from '../../hooks/useTranslatedExerciseContent';
import { STRUCTURE_BLOCKS } from '../../coach-dna/constants';
import { sortBySessionBlock } from '../../lib/sessionStructure';
import { useTranslatedExerciseNamesByRow } from '../../hooks/useTranslatedExerciseNamesByRow';
import { resolveExerciseNameLocale } from '../../lib/exerciseNameLocale';
import type { AppLanguage } from '../../i18n';
import { estimateSessionMinutes } from '../../lib/sessionBudget';
import { generateFallbackPlan as generateLocalFallbackPlan } from '../../lib/fallbackWorkoutGenerator';
import type { ContraindicationRegion } from '../../data/fallbackExerciseLibrary';
import { notifyLinkedTrainer } from '../../lib/notify';
import { startOfWeek } from '../../licensing/entitlements';
import aiPlanIcon from '../../assets/ai-plan-icon.png';

// Primary text colour over this screen's plan/exercise list surfaces — repeated
// identically (white in dark mode, navy `#0E1A2B` in light) across the plan
// header, exercise rows, and modal titles. Distinct from the shared `textPri`
// (which resolves to `--text-pri`, a different navy in light themes); kept
// local rather than reconciled with the design-system token to avoid an
// unintended visual change — flagged here for design review.
const inkPri = (dark: boolean): string => (dark ? '#fff' : '#0E1A2B');

// Default AI trainer used when client has no linked trainer

interface Theme {
  primary:     string;
  primarySoft: string;
  accent:      string;
  amber:       string;
  lavender:    string;
  criticalRed: string;
  liveAction:  string;
}

interface AppUser {
  id:           string | null;
  name:         string;
  email:        string;
  role:         string;
  avatar_url:   string | null;
  gender?:      string;
  plan_key?:    string;
  subscription?: Subscription | null;
}

interface AppCycleConfig {
  length:          number;
  periodLength?:   number;
  lastStartOffset: number;
}

export type Exercise = GeneratedWorkoutExercise;

interface StartWorkoutScreenProps {
  nav:              NavFn;
  t:                Theme;
  dark:             boolean;
  checkin:          CheckIn;
  user:             AppUser;
  cycleConfig:      AppCycleConfig | null;
  linkedTrainerId?: string; // non-empty = client has active trainer
  source?:          string | undefined; // 'trainer_timeout' = trainer did not respond; AI fallback
  prefs?: {
    preferredIntensity?: TrainerContext['intensity'];
    aiFocusStrength?:    number;
    aiFocusEndurance?:   number;
    aiFocusMobility?:    number;
    aiPersonalization?:  boolean;
    keepExerciseNamesInEnglish?: boolean;
  };
}

interface PlanCard {
    id:        string;
    sentAt:    string | null;
    status:    string;
    exercises: Array<{id:string; exercise_name:string; muscle_group?:string|null; sets?:number|null; reps?:number|null; duration_seconds?:number|null; load_kg?:number|null; rest_seconds?:number|null; notes?:string|null; order_index?:number|null; exercise_category?:string|null; phase?:string|null; name_source_locale?:string|null}>;
  }

type GenState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; plan: Exercise[]; planId: string; readinessScore: number; adaptations: string[] }
  | { phase: 'error';   error: string }
  | { phase: 'weekly-limit'; limit: number }
  | { phase: 'blocked'; safetyTitle: string; safetyMessage: string; readinessScore: number };

// ── Fallback plan generator ──────────────────────────────────────────────────
// Local contingency generator (docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md,
// Fase 4) — activated when the client is on a tier without AI workout
// generation, or when the AI endpoint is unreachable (outage, timeout, etc.).
// Selects from the 129-exercise mirror (src/data/fallbackExerciseLibrary.ts,
// Fase 3), respects the same safety gate and contraindication signals the AI
// path uses, and never invents a workout when the Safety Gate is active — see
// generateFallbackPlan/isSafetyGateActive in src/lib/fallbackWorkoutGenerator.ts.
const VALID_CONTRAINDICATION_REGIONS = ['knee', 'lower_back', 'shoulder', 'wrist'] as const;

function toContraindicationRegions(regions: readonly string[]): ContraindicationRegion[] {
  return regions.filter(
    (r): r is ContraindicationRegion => (VALID_CONTRAINDICATION_REGIONS as readonly string[]).includes(r)
  );
}

export function StartWorkoutScreen({ nav, t, dark, checkin, user, cycleConfig, linkedTrainerId = '', source, prefs }: StartWorkoutScreenProps) {
  const { t: tr } = useTranslation();

  // Feature gate: trainers viewing a client always get full AI; clients follow the matrix.
  const isTrainerView    = !!linkedTrainerId && user.role !== 'client';
  const effectivePlanKey = useEffectivePlanKey(user.subscription ?? null);
  const aiAccessMap = useFeatureAccessMap(
    effectivePlanKey,
    ['ai.workout_generation', 'ai.checkin_adjustment', 'ai.advanced_analysis',
     'workout.sessions_per_week', 'workout.exercises_per_session'],
    isTrainerView,
  );
  // ai.workout_generation gates whether the AI creates the workout at all.
  // ai.checkin_adjustment (below) only modifies HOW it's generated — daily
  // calibration by energy/sleep/fatigue — never whether it's generated, and
  // never gates a safety signal (pain, Safety Gate: those reach the prompt
  // for every tier, docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md Fase 0).
  const aiWorkoutGenerationAllowed = aiAccessMap['ai.workout_generation']?.allowed ?? false;
  const aiCheckinAllowed    = aiAccessMap['ai.checkin_adjustment']?.allowed    ?? false;
  const aiAdvancedAllowed   = aiAccessMap['ai.advanced_analysis']?.allowed     ?? false;
  const sessionsPerWeekCap  = aiAccessMap['workout.sessions_per_week']?.limitValue  ?? null; // null = unlimited
  const exercisesPerSession = aiAccessMap['workout.exercises_per_session']?.limitValue ?? null;
  // workout.exercise_type retired as a commercial gate (Fase 5, docs/
  // LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md) — category exclusion is
  // no longer sold as a tier differentiator. Authoritative resolution
  // (api/_lib/entitlements.ts resolveAuthoritativeTaskGates) already hardcodes
  // this false server-side; mirrored here so the local (non-AI) fallback
  // generator never diverges from what the server would return.
  const fitnessOnlyWorkout  = false;
  // Real training-load signal (Fase 5.1) — same computation PerformanceDashboardScreen
  // already uses (perf-engines.ts computeTrainingLoad), now also feeding generation
  // instead of only being displayed after the fact.
  const m5 = useM5Data(user?.id ?? null);
  const [genState, setGenState] = React.useState<GenState>({ phase: 'idle' });
  const [planSource, setPlanSource] = React.useState<string | null>(null);
  const [trainerName,      setTrainerName]      = React.useState<string | null>(null);
  const [trainerAvatarUrl, setTrainerAvatarUrl] = React.useState<string | null>(null);
  const [cycleCtx,   setCycleCtx]   = React.useState<CycleContext | null>(null);
  const [latestCheckin, setLatestCheckin] = React.useState<CheckIn | null>(null);
  const [trainerPlans, setTrainerPlans] = React.useState<PlanCard[]>([]);
  const [expandedPlan,  setExpandedPlan] = React.useState<string | null>(null);
  const [newPlanArrived, setNewPlanArrived] = React.useState(false);
  const activeCheckin = latestCheckin ?? checkin;
  // Real readiness/safety/duration signal for the local fallback generator,
  // captured as soon as today's check-in is fetched — available even in the
  // outer catch block below, where `todayCtx` (block-scoped to the try) is
  // not. Deliberately NOT read from `activeCheckin`/`latestCheckin` state in
  // that catch block: `fetchPlan` calls `setLatestCheckin(resolvedCheckin)`
  // earlier in this same execution, but the state update does not apply
  // until the next render, so `activeCheckin` there would still be the
  // *previous* checkin — e.g. an old 60-minute session — even though the
  // real one the user just submitted was 15. Found live (Fase 4 verification,
  // 2026-08-02): a 15-minute request produced a ~50-minute local plan because
  // the catch block was budgeting against a stale duration. A ref, updated
  // synchronously, has no such lag.
  // Fase 4 achado: never fabricate a readinessScore when a real one exists.
  const fallbackContextRef = React.useRef<{
    readinessScore: number | null;
    painRegions:    string[];
    safetyStatus:   string;
    aiLedBlocked:   boolean;
    minutes:        number | null;
    goal:           string | null;
  }>({ readinessScore: null, painRegions: [], safetyStatus: 'clear', aiLedBlocked: false, minutes: null, goal: null });

  // Translates exercise names on the plan-card preview for this client's own
  // locale — every row now carries its own name_source_locale (AI-generated,
  // catalog, or hand-typed, D7), grouped and translated only where it
  // diverges from what this client should see. Only the name respects the
  // keep-English-names toggle (docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md,
  // D1) — notes (translateNote below) always follow the client's own app
  // language, untouched by that toggle.
  // This client's own exercise-name locale (D2 — the reader's preference
  // governs what reaches them). Used both to READ trainer-sent plans below,
  // and to ask the AI to WRITE self-generated exercise names directly in
  // this locale (Fase 1 of docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md) —
  // fixes the client's own auto-generation path sending i18n.language raw,
  // ignoring the keep-English-names toggle, and never recording provenance.
  const exerciseNamesLocale = resolveExerciseNameLocale({
    keepExerciseNamesInEnglish: prefs?.keepExerciseNamesInEnglish ?? true,
    language: i18n.language as AppLanguage,
  });
  const translateName = useTranslatedExerciseNamesByRow(
    trainerPlans.flatMap(p => p.exercises.map(e => ({ name: e.exercise_name, name_source_locale: e.name_source_locale }))),
    exerciseNamesLocale,
  );
  const translateNote = useTranslatedExerciseContent(
    trainerPlans.flatMap(p => p.exercises.map(e => e.notes)),
  );

  // Trainer-prescribed plans are never filtered or gated by the client's own
  // plan tier — Fase 4 of docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md
  // (decisão comercial #1): the query that populates trainerPlans already
  // scopes to source='manual' (prescribed), so everything here is, by
  // construction, trainer_prescribed — the client's autonomous-generation
  // gates (fitnessOnlyWorkout, trainer_plan.days_per_week) never applied to
  // this content in the first place; they were being applied here by
  // mistake, not by design.
  const hasTrainerPlans = trainerPlans.length > 0;

  // Fase 5.1: the AI has no authority to alter a trainer-prescribed program —
  // when accumulated load is high and a prescribed session is pending, alert
  // the trainer instead of silently adjusting (mirrors the autonomous path,
  // where this same signal feeds generation directly via gatedStatsCtx below).
  // handleHighTrainingLoad dedupes against existing open alerts server-side;
  // this ref only avoids firing the check redundantly within one mount.
  const trainingLoadAlertFiredRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasTrainerPlans || !linkedTrainerId || !user?.id || !m5.data || trainingLoadAlertFiredRef.current) return;
    const { trainingForm, trainingStrain } = m5.data.scores;
    if (trainingForm.score < 40 || trainingStrain.score >= 70) {
      trainingLoadAlertFiredRef.current = true;
      void handleHighTrainingLoad(user.id, linkedTrainerId, trainingForm.score, trainingStrain.score);
    }
  }, [hasTrainerPlans, linkedTrainerId, user?.id, m5.data]);

  // Derived accessors — single point of truth from discriminated union
  const loading         = genState.phase === 'loading';
  const error           = genState.phase === 'error'   ? genState.error                     : null;
  const plan            = genState.phase === 'success' ? genState.plan                      : null;
  const planId          = genState.phase === 'success' ? genState.planId                    : null;
  const safetyBlocked   = genState.phase === 'blocked';
  const safetyTitle     = genState.phase === 'blocked' ? genState.safetyTitle               : null;
  const safetyMessage   = genState.phase === 'blocked' ? genState.safetyMessage             : null;
  const readinessScore  = genState.phase === 'success' || genState.phase === 'blocked' ? genState.readinessScore : null;
  const adaptations     = genState.phase === 'success' ? genState.adaptations               : ([] as string[]);
  // adaptations is free text from the same AI call as the exercise names —
  // when exerciseNamesLocale diverges from the client's real app language
  // (keep-English-names toggle on, non-English app), the WHOLE response
  // comes back in exerciseNamesLocale (single-locale AI contract, api/
  // generate-smart-workout.ts), not just the names. Translate it back to
  // what's actually displayed here. Unlike useTranslatedExerciseNamesByRow,
  // useTranslatedExerciseContent has no same-locale short-circuit of its
  // own (verified live: it round-trips pt->pt through the translation API
  // and back unchanged) — so the common, no-divergence case is short-
  // circuited here instead, by not feeding it any text to look up.
  const translateAdaptation = useTranslatedExerciseContent(
    exerciseNamesLocale === (i18n.language as AppLanguage) ? [] : adaptations,
    undefined,
    exerciseNamesLocale,
  );

  // Soft, client-side time-fit check: neither generation endpoint validates
  // its own totalDurationMin against the requested window server-side (see
  // system audit follow-up, 2026-07-10) — this is informational only, never
  // blocks starting the workout.
  const estimatedPlanMinutes = React.useMemo(() => {
    if (!plan?.length) return 0;
    return Math.ceil(estimateSessionMinutes(plan));
  }, [plan]);
  const availableMinutes = activeCheckin.minutes ?? 0;
  const planMayOverrun = estimatedPlanMinutes > 0 && availableMinutes > 0
    && estimatedPlanMinutes > availableMinutes * 1.2;
  // Symmetric case: a plan capped by a plan-tier exercise limit (e.g. Free's
  // maxExercises=6) genuinely cannot fill a long window even fully padded —
  // real, not a bug (docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md Fase 6,
  // "Opção 3": accept the shorter session, say so plainly, don't invent
  // exercises past the tier's own limit or force-fit numbers that aren't real.
  const planMayUnderrun = estimatedPlanMinutes > 0 && availableMinutes > 0
    && estimatedPlanMinutes < availableMinutes * 0.8;

  // Derive current cycle phase — only for female users with cycle tracking data
  const getCycleContext = () => {
    if (user?.gender !== 'female') return null;
    if (!cycleConfig?.length) return null;
    const day = Math.min(cycleConfig.length, Math.max(1, (cycleConfig.lastStartOffset || 0) + 1));
    const phases = computeCyclePhases(cycleConfig.length, t);
    const phase = phases.find(p => day >= p.range[0] && day <= p.range[1]);
    return phase ? { phase: phase.name, day, cycleLength: cycleConfig.length } : null;
  };

  const persistGeneratedPlan = React.useCallback(async (
    exercises: Exercise[],
    sourceCheckin: CheckIn,
    cycleContext: CycleContext | null,
    physicalProfile: Json | null,
    // Provenance of the names in `exercises` (D7 — registered at write time,
    // never inferred). Pass the resolved client locale for AI-generated
    // names (the model was asked to write in it); pass null for the local
    // fallback template, whose own per-exercise locale tagging is separate
    // scope (Fase 2/4 of docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md).
    nameSourceLocale: AppLanguage | null,
  ) => {
    if (!user?.id) return;

    try {
      const aiNotesParts = [];
      if (cycleContext) aiNotesParts.push(`Phase: ${cycleContext.phase}, Day ${cycleContext.day}/${cycleContext.cycleLength}`);
      if (source === 'trainer_timeout') aiNotesParts.push('trainer_timeout: true');

      const { data: planRow, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          assigned_to: user.id,
          created_by:  user.id,
          source:      'ai_generated',
          status:      'active',
          ai_notes:    aiNotesParts.length > 0 ? aiNotesParts.join(' | ') : null,
          scheduled_date: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single();

      if (planError) throw planError;
      if (!planRow?.id) return;

      setGenState(prev => prev.phase === 'success' ? { ...prev, planId: planRow.id } : prev);

      const { error: exercisesError } = await supabase.from('plan_exercises').insert(
        exercises.map((ex, i) => ({
          plan_id:          planRow.id,
          exercise_name:    ex.exercise_name,
          muscle_group:     ex.muscle_group,
          sets:             ex.sets,
          reps:             ex.reps,
          duration_seconds: ex.duration_seconds,
          load_kg:          ex.load_kg,
          rest_seconds:     ex.rest_seconds,
          notes:            ex.notes ?? null,
          order_index:      i,
          phase:            ex.phase ?? null,
          name_source_locale: nameSourceLocale,
          exercise_category: ex.category ?? null,
        }))
      );

      if (exercisesError) throw exercisesError;

      const { error: suggestionError } = await supabase.from('ai_suggestions').insert({
        user_id:    user.id,
        plan_id:    planRow.id,
        checkin_id: null,
        context:    { checkin: sourceCheckin, cycleContext, physicalProfile } as unknown as Json,
        suggestion: JSON.stringify(exercises),
        accepted:   null,
      });

      if (suggestionError) throw suggestionError;

      // Notify trainer when client trained autonomously due to timeout
      if (source === 'trainer_timeout' && linkedTrainerId) {
        void notifyLinkedTrainer(
          user.id,
          tr('inbox.trainer_timeout_workout.title', { name: user.name || tr('client.workout.notificationYourClient') }),
          tr('inbox.trainer_timeout_workout.body',  { name: user.name || tr('client.workout.notificationYourClient') }),
          { type: 'trainer_timeout_workout', templateKey: 'trainer_timeout_workout',
            params: { name: user.name || '', gender: user.gender ?? '' },
            entityType: 'workout_plan', entityId: planRow.id },
        );
      }
    } catch (err) {
      console.error('[start-workout] failed to persist generated plan', err);
    }
  }, [user?.id, source, linkedTrainerId]);

  const mountedRef = React.useRef(true);

  const fetchPlan = async () => {
    if (!mountedRef.current) return;
    setGenState({ phase: 'loading' });
    setTrainerPlans([]);
    // Auto-cancel stale plans (>10 days); notify trainer
    if (user?.id) void autoExpirePlans(user.id, 'client');
    try {
      const physicalProfile: Json | null = null;
      let resolvedCheckin = checkin;
      if (user?.id) {
        // Load ALL actionable trainer plans (sent / active / postponed) into one unified list.
        // Status is NOT mutated here — a plan only becomes 'active' when the workout actually starts.
        const { data: planRows } = await supabase
          .from('workout_plans')
          .select('id, created_at, created_by, status, plan_exercises(id, exercise_name, muscle_group, sets, reps, duration_seconds, load_kg, rest_seconds, notes, order_index, exercise_category, phase, name_source_locale)')
          .eq('assigned_to', user.id)
          .eq('source', 'manual')
          .in('status', ['sent', 'active', 'postponed'])
          .order('created_at', { ascending: false });

        const actionable = (planRows ?? []).filter(p => (p.plan_exercises?.length ?? 0) > 0);

        // Auto-heal: active plans whose session was actually completed (legacy data before lifecycle fix)
        const activePlanIds = actionable.filter(p => p.status === 'active').map(p => p.id);
        let completedPlanIds = new Set<string>();
        if (activePlanIds.length) {
          const { data: doneSessions } = await supabase
            .from('workout_sessions')
            .select('plan_id')
            .in('plan_id', activePlanIds)
            .eq('status', 'completed');
          if (doneSessions?.length) {
            completedPlanIds = new Set(doneSessions.map(s => s.plan_id as string));
            void supabase.from('workout_plans').update({ status: 'completed' }).in('id', [...completedPlanIds]);
          }
        }

        const stillActionable = actionable.filter(p => !completedPlanIds.has(p.id));

        if (stillActionable.length) {
          setTrainerPlans(stillActionable.map(p => ({
            id:        p.id,
            sentAt:    p.created_at,
            status:    p.status ?? 'sent',
            exercises: ([...(p.plan_exercises ?? [])] as PlanCard['exercises'])
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
          })));
          setPlanSource('trainer');

          // Trainer name + avatar from the most recent plan
          const newest = stillActionable[0];
          if (newest?.created_by) {
            supabase.from('profiles').select('name, avatar_url').eq('id', newest.created_by).maybeSingle()
              .then(({ data: trainerProfile }) => {
                if (trainerProfile?.name) setTrainerName(trainerProfile.name.split(' ')[0] ?? null);
                if (trainerProfile?.avatar_url) setTrainerAvatarUrl(trainerProfile.avatar_url);
              });
          }

          return;
        }
      }
      if (user?.id) {
        // ── Fetch all data in parallel ──────────────────────────────────────
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const sevenDaysAgo  = new Date(Date.now() -  7 * 86_400_000).toISOString();

        const [profileRes, checkinRes, sessionsRes, checkinHistRes, trainerRes] =
          await Promise.allSettled([
            // Full profile_v2 — ALL sections for safety context
            supabase.from('profile_v2').select('*').eq('user_id', user.id).maybeSingle(),
            // Latest check-in with safety gate
            supabase.from('checkin_prontidao')
              .select('occurred_at, variant, readiness_score, energy_level, fatigue_level, pain_present, pain_intensity, sleep_quality, available_minutes, training_location, ai_led_blocked, safety_gate, quick_data, detailed_data')
              .eq('user_id', user.id)
              .order('occurred_at', { ascending: false })
              .limit(1).maybeSingle(),
            // Recent sessions for stats
            supabase.from('workout_sessions')
              .select('started_at, status')
              .eq('user_id', user.id)
              .gte('started_at', thirtyDaysAgo),
            // Recent check-ins for avg energy / readiness
            supabase.from('checkin_prontidao')
              .select('energy_level, readiness_score')
              .eq('user_id', user.id)
              .gte('occurred_at', sevenDaysAgo)
              .order('occurred_at', { ascending: false }).limit(7),
            // Trainer Coach DNA (if linked)
            linkedTrainerId
              ? supabase.from('coach_dna').select('*').eq('trainer_id', linkedTrainerId).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);

        // ── Build SmartWorkoutRequest ───────────────────────────────────────

        // 1. ClientContext from full profile_v2
        const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
        // Also build legacy resolvedCheckin for UI display and persist
        const ciData = checkinRes.status === 'fulfilled' ? checkinRes.value.data : null;
        if (ciData) {
          const qd = ciData.quick_data as { pain?: { present?: boolean; region?: string }; fatigue?: number } | null;
          resolvedCheckin = {
            energy:        ciData.energy_level       ?? checkin.energy,
            soreness:      qd?.pain?.present && qd.pain.region ? [qd.pain.region] : checkin.soreness,
            minutes:       ciData.available_minutes  ?? checkin.minutes,
            goal:          checkin.goal,
            location:      (ciData.training_location ?? checkin.location) as typeof checkin.location,
            sleep_quality: (ciData.sleep_quality     ?? checkin.sleep_quality) as typeof checkin.sleep_quality,
            equipment:     checkin.equipment,
          };
          const gate = ciData.safety_gate as { status?: string } | null;
          fallbackContextRef.current = {
            readinessScore: ciData.readiness_score ?? null,
            painRegions:    resolvedCheckin.soreness ?? [],
            safetyStatus:   gate?.status ?? 'clear',
            aiLedBlocked:   !!ciData.ai_led_blocked,
            minutes:        resolvedCheckin.minutes ?? null,
            goal:           resolvedCheckin.goal ?? null,
          };
        }
        setLatestCheckin(resolvedCheckin);

        // 2. Cycle context
        const cycleContext = getCycleContext();
        setCycleCtx(cycleContext);

        // 3. Weekly cap applies before every autonomous path, including the
        // legacy generator used when a profile is incomplete. This is a UX
        // fast-path; generate-smart-workout remains authoritative server-side.
        const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : [];
        if (sessionsPerWeekCap !== null) {
          const weekStart = startOfWeek();
          const weekCount = sessions.filter((s: any) =>
            new Date(s.started_at) >= weekStart
          ).length;
          if (weekCount >= sessionsPerWeekCap) {
            setGenState({ phase: 'weekly-limit', limit: sessionsPerWeekCap });
            return;
          }
        }

        // If no profile, fall back to legacy endpoint only after the weekly
        // entitlement has been checked.
        if (!profileData) {
          const exercises = await requestWorkoutPlan({ checkin: resolvedCheckin, physicalProfile, cycleContext, locale: exerciseNamesLocale });
          setGenState({ phase: 'success', plan: exercises, planId: '', readinessScore: -1, adaptations: [] });
          void persistGeneratedPlan(exercises, resolvedCheckin, cycleContext, physicalProfile, exerciseNamesLocale);
          return;
        }

        const clientCtx = buildClientContext(profileData as any);

        // 4. TodayContext from full check-in
        const todayCtx = ciData
          ? buildTodayContext(ciData as any)
          : {
              checkinAt: new Date().toISOString(), variant: 'quick',
              readinessScore: 60, energyLevel: checkin.energy, sleepQuality: checkin.sleep_quality ?? 'regular',
              fatigueLevel: 3, painPresent: false, painIntensity: 0, painRegions: [],
              safetyStatus: 'clear', aiLedBlocked: false, safetySignals: [],
              availableMinutes: checkin.minutes, location: checkin.location ?? 'gym',
              ...(cycleContext ? { cycleActive: true, cyclePhase: cycleContext.phase } : {}),
            };

        // 5. StatsContext from fetched data
        const checkinHist = checkinHistRes.status === 'fulfilled' ? (checkinHistRes.value.data ?? []) : [];
        const avgEnergy = checkinHist.length
          ? Math.round(checkinHist.reduce((s, c) => s + (c.energy_level ?? 0), 0) / checkinHist.length * 10) / 10 : 0;
        const avgReadiness = checkinHist.length
          ? Math.round(checkinHist.reduce((s, c) => s + (c.readiness_score ?? 0), 0) / checkinHist.length) : 60;
        const completed = sessions.filter((s: any) => s.status === 'completed').length;
        // Real stats, not placeholders (Fase 5.1 achado: this was hardcoded —
        // progressionReadiness/fatigueRisk/avgRPELast3/workoutStreak/
        // painEvents14d were constant for every user, always — buildStatsContext
        // already existed for this exact purpose and was simply never called
        // here). Falls back to the same neutral placeholders only if m5 data
        // never resolved (e.g. fetch error) — generation must never block on it.
        const statsCtx = m5.data ? buildStatsContext(m5.data) : {
          adherenceRate: sessions.length > 0 ? completed / sessions.length : 0,
          workoutStreak: 0, sessionsLast30d: sessions.length,
          avgEnergy7d: avgEnergy, avgReadiness7d: avgReadiness, avgRPELast3: 0,
          painEvents14d: 0, painRecurrenceAlert: false,
          predictiveScores: { progressionReadiness: 50, fatigueRisk: 20, painRecurrence: 10, sessionCompletion: 70, planFit: 70, acuteLoad: 50, trainingForm: 60, trainingStrain: 20 },
        };

        // 5. TrainerContext — Coach DNA if linked, else DEFAULT_AI_TRAINER + client prefs.
        // trainer_timeout: trainer did not respond — use DEFAULT_AI_TRAINER regardless of Coach DNA.
        const isTrainerTimeout = source === 'trainer_timeout';
        const coachDNA    = (!isTrainerTimeout && trainerRes.status === 'fulfilled') ? (trainerRes.value as any).data : null;
        const trainerCtx  = resolveTrainerContext(coachDNA, prefs);

        // 6. LibraryContext — profile-declared equipment is the baseline
        //    (stable "what I have"), today's check-in equipment is the
        //    session-specific addition/override (e.g. travelling, hotel gym).
        //    Soreness/pain exclusions stay check-in-only: that's real-time
        //    state the profile cannot know about.
        const equipmentUnion = Array.from(new Set([
          ...(clientCtx.equipment ?? []),
          ...(resolvedCheckin.equipment ?? []),
        ]));
        const libraryCtx = buildLibraryContext({
          excludedRegions:  resolvedCheckin.soreness ?? [],
          clientEquipment:  equipmentUnion,
          trainerFavorites: trainerCtx.favoriteExercises,
          trainerAvoid:     trainerCtx.avoidExercises,
        });

        // 7. TaskContext — includes plan-gated limits
        const taskCtx: TaskContext = {
          type: 'generate_workout',
          durationMin:       resolvedCheckin.minutes ?? clientCtx.sessionDuration,
          maxExercises:      exercisesPerSession ?? undefined,
          fitnessOnly:       fitnessOnlyWorkout,
          adjustmentAllowed: aiCheckinAllowed,
        };

        // ── Call smart endpoint ─────────────────────────────────────────────
        // ai.workout_generation gate: whether the AI creates the workout at
        // all (docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md Fase 0). Separate
        // from ai.checkin_adjustment, which only modifies HOW — passed above
        // as adjustmentAllowed, never gates creation itself.
        // ai.advanced_analysis gate: ai_fitness gets smart workout but without M5 predictive scores.
        const useSmart = aiWorkoutGenerationAllowed && (prefs?.aiPersonalization !== false || !!linkedTrainerId);

        // Strip advanced predictive scores from stats context when not allowed —
        // avoids leaking premium signals to the AI prompt for free/ai_fitness clients.
        const gatedStatsCtx = aiAdvancedAllowed ? statsCtx : {
          ...statsCtx,
          predictiveScores: {
            progressionReadiness: 50,
            fatigueRisk:          20,
            painRecurrence:       10,
            sessionCompletion:    70,
            planFit:              70,
            acuteLoad:            50,
            trainingForm:         60,
            trainingStrain:       20,
          },
        };

        // When useSmart is false (free tier, AI personalization disabled, or no
        // trainer link), the client still gets a real workout from the local
        // mirror (Fase 4 of the continuity plan) — a seeded selection out of
        // 129 exercises, never an empty plan, and never a workout at all when
        // the Safety Gate is active (generateLocalFallbackPlan enforces this
        // itself, mirroring the server-side gate in generate-smart-workout.ts).
        const result = useSmart
          ? await requestSmartWorkout({
              trainer: trainerCtx, client: clientCtx,
              today: todayCtx as any, stats: gatedStatsCtx,
              library: libraryCtx, task: taskCtx,
              locale: exerciseNamesLocale,
            })
          : (() => {
              const local = generateLocalFallbackPlan({
                goal:            resolvedCheckin.goal,
                targetMinutes:   taskCtx.durationMin ?? 30,
                locale:          exerciseNamesLocale,
                excludedRegions: toContraindicationRegions(todayCtx.painRegions),
                maxExercises:    exercisesPerSession ?? undefined,
                fitnessOnly:     fitnessOnlyWorkout,
                seed:            Date.now(),
                safety:          { aiLedBlocked: todayCtx.aiLedBlocked, safetyStatus: todayCtx.safetyStatus },
              });
              return local.blocked
                ? { exercises: [] as GeneratedWorkoutExercise[], readinessScore: todayCtx.readinessScore, blocked: true, adaptations: [] as string[], safetyTitle: null as any, safetyMessage: null as any }
                : { exercises: local.exercises, readinessScore: todayCtx.readinessScore, blocked: false, adaptations: [] as string[], safetyTitle: null as any, safetyMessage: null as any };
            })();

        const readiness   = result.readinessScore;
        const adaptResult = result.adaptations;

        if (result.blocked) {
          setGenState({
            phase: 'blocked',
            readinessScore: readiness,
            safetyTitle:    result.safetyTitle    ?? tr('client.workout.safetyGateTitle'),
            safetyMessage:  result.safetyMessage  ?? tr('client.workout.safetyGateMsg'),
          });
          return;
        }

        setGenState({
          phase:          'success',
          plan:           result.exercises,
          planId:         '',
          readinessScore: readiness,
          adaptations:    adaptResult,
        });
        setPlanSource(useSmart ? 'ai' : 'fallback');
        // Both paths now emit names already in exerciseNamesLocale — the
        // smart endpoint via its own `locale` param, the local generator via
        // the curated translations embedded in the Fase 3 mirror (Fase 4).
        void persistGeneratedPlan(result.exercises, resolvedCheckin, cycleContext, physicalProfile, exerciseNamesLocale);
      } // end if (user?.id)
    } catch (err: unknown) {
      // The server is authoritative for this entitlement. A confirmed weekly
      // limit is a product state, not an outage: never generate a local
      // fallback that could turn the cap into a bypass.
      if (err instanceof SmartWorkoutRequestError && err.code === 'sessions_per_week_limit_reached') {
        setGenState({ phase: 'weekly-limit', limit: sessionsPerWeekCap ?? 1 });
        return;
      }
      console.warn('[start-workout] AI generation failed — using fallback plan', err);
      // `todayCtx` is out of scope here (declared inside the try above), and
      // `activeCheckin`/`latestCheckin` state is stale within this same
      // execution (see fallbackContextRef's own comment) — the ref is the
      // only reliably fresh source of goal/duration/safety here.
      const ctx = fallbackContextRef.current;
      const local = generateLocalFallbackPlan({
        goal:            ctx.goal ?? activeCheckin.goal,
        targetMinutes:   ctx.minutes ?? activeCheckin.minutes ?? 30,
        locale:          exerciseNamesLocale,
        excludedRegions: toContraindicationRegions(ctx.painRegions),
        maxExercises:    exercisesPerSession ?? undefined,
        fitnessOnly:     fitnessOnlyWorkout,
        seed:            Date.now(),
        safety:          ctx,
      });
      if (local.blocked) {
        setGenState({
          phase: 'blocked',
          readinessScore: ctx.readinessScore ?? 60,
          safetyTitle:    tr('client.workout.safetyGateTitle'),
          safetyMessage:  tr('client.workout.safetyGateMsg'),
        });
        return;
      }
      setGenState({
        phase:          'success',
        plan:           local.exercises,
        planId:         '',
        readinessScore: ctx.readinessScore ?? 60,
        adaptations:    [],
      });
      setPlanSource('fallback');
    }
  };

  // Wait for the feature-permission matrix to resolve before generating.
  // useFeatureAccessMap always starts as { allowed: false, loading: true } —
  // firing fetchPlan() on an empty-deps mount effect would permanently
  // capture that unresolved `false` for aiWorkoutGenerationAllowed (stale
  // closure), forcing useSmart to false and silently persisting a
  // zero-exercise plan for every client (most visibly trainer-less ones,
  // whose only path is this AI branch — see system audit follow-up,
  // 2026-07-09). Tracks ai.workout_generation, the gate useSmart now reads
  // (was ai.checkin_adjustment before Fase 0 of WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md).
  const aiPermsLoading = aiAccessMap['ai.workout_generation']?.loading ?? true;
  const fetchFiredRef = React.useRef(false);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  React.useEffect(() => {
    // Also wait for m5 (real training-load stats, Fase 5.1) — both fetches run
    // in parallel from mount, so this rarely adds real latency, but it means
    // generation never fires against the fake-placeholder branch by a race.
    if (aiPermsLoading || m5.loading || fetchFiredRef.current) return;
    fetchFiredRef.current = true;
    const fetch = async () => {
      try { await fetchPlan(); } catch { /* caught internally */ }
    };
    void fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPermsLoading, m5.loading]);

  // Live: a new plan sent by the trainer while this screen is open
  React.useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`workout-incoming:${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'workout_plans', filter: `assigned_to=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { status?: string; source?: string };
          if (row?.status === 'sent' && row?.source === 'manual') setNewPlanArrived(true);
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  const sore = (activeCheckin.soreness || []).filter(s => s !== 'None');

  const [confirmCancelPlan, setConfirmCancelPlan] = React.useState<PlanCard | null>(null);

  // Guards against firing duplicate trainer notifications when a user double-clicks/double-taps
  // a plan action before the card is removed/re-rendered (each plan id notifies at most once).
  const notifiedPlanActionsRef = React.useRef<Set<string>>(new Set());

  // ── Unified plan-card actions ────────────────────────────────────────────────
  const STATUS_META: Record<string, { label: string; color: string }> = {
    sent:      { label: tr('client.workout.planStatus.sent'),      color: t.primary },
    active:    { label: tr('client.workout.planStatus.active'),    color: '#F5A623' },
    postponed: { label: tr('client.workout.planStatus.postponed'), color: t.amber },
  };

  const notifyTrainerAction = (p: PlanCard, kind: 'cancelled' | 'postponed') => {
    if (!user?.id) return;
    const dedupeKey = `${p.id}:${kind}`;
    if (notifiedPlanActionsRef.current.has(dedupeKey)) return;
    notifiedPlanActionsRef.current.add(dedupeKey);
    const planDate = p.sentAt ? new Date(p.sentAt).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : tr('client.workout.notificationUnknownDate');
    const title    = kind === 'cancelled' ? tr('client.workout.notificationPlanCancelled') : tr('client.workout.notificationPlanPostponed');
    const body     = tr(`client.workout.notificationBody${kind === 'cancelled' ? 'Cancelled' : 'Postponed'}`, { name: user.name || tr('client.workout.notificationYourClient'), planDate: planDate.toString() });
    const template = kind === 'cancelled' ? 'plan_cancelled' : 'plan_postponed';
    void notifyLinkedTrainer(user.id, title, body, { type: kind === 'cancelled' ? 'plan_cancelled' : 'plan_postponed', templateKey: template, params: { name: user.name || tr('client.workout.notificationYourClient'), planDate: planDate.toString() }, entityType: 'workout_plan', entityId: p.id });
  };

  const startPlan = (p: PlanCard) => {
    supabase.from('workout_plans').update({ status: 'active' }).eq('id', p.id).then(({ error }) => { if (error) console.error('[plan start]', error); });
    nav('workoutMode', {
      planId:    p.id,
      exercises: p.exercises.map(ex => ({
        exercise_name:    ex.exercise_name,
        muscle_group:     ex.muscle_group  ?? '',
        sets:             ex.sets          ?? null,
        reps:             ex.reps          ?? null,
        duration_seconds: ex.duration_seconds ?? null,
        load_kg:          ex.load_kg       ?? null,
        rest_seconds:     ex.rest_seconds  ?? null,
        notes:            ex.notes         ?? null,
        phase:            ex.phase         ?? null,
        name_source_locale: ex.name_source_locale ?? null,
      })),
    });
  };

  const postponePlan = (p: PlanCard) => {
    supabase.from('workout_plans').update({ status: 'postponed' }).eq('id', p.id).then(({ error }) => { if (error) console.error('[plan postpone]', error); });
    setTrainerPlans(prev => prev.map(x => x.id === p.id ? { ...x, status: 'postponed' } : x));
    setExpandedPlan(null);
    notifyTrainerAction(p, 'postponed');
  };

  const cancelPlan = (p: PlanCard) => {
    supabase.from('workout_plans').update({ status: 'cancelled' }).eq('id', p.id).then(({ error }) => { if (error) console.error('[plan cancel]', error); });
    setTrainerPlans(prev => prev.filter(x => x.id !== p.id));
    if (expandedPlan === p.id) setExpandedPlan(null);
    notifyTrainerAction(p, 'cancelled');
  };

  return (
    <>
      <ScreenTitle dark={dark}>{tr('client.workout.title')}</ScreenTitle>

      {/* Trainer timeout banner — AI taking over */}
      {source === 'trainer_timeout' && (
        <div style={{
          margin: '0 22px 12px',
          padding: '10px 14px', borderRadius: 12,
          background: `${t.amber ?? '#F5A623'}14`,
          border: `1px solid ${t.amber ?? '#F5A623'}44`,
          fontSize: 11.5, color: t.amber ?? '#F5A623', lineHeight: 1.5,
        }}>
          {tr('client.workout.trainerTimeoutBanner')}
        </div>
      )}

      {/* Live: new plan arrived from the trainer while on this screen */}
      {newPlanArrived && (
        <div style={{ padding: '0 22px 12px' }}>
          <button
            onClick={() => { setNewPlanArrived(false); void fetchPlan(); }}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: t.liveAction, color: '#fff', border: 'none',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 6px 18px ${t.liveAction}55`,
            }}
          >
            <Icon name="sparkle" size={15} color="#fff" stroke={2.4}/>
            {tr('client.workout.newPlanFromTrainer')}
          </button>
        </div>
      )}

      <div style={{ padding: '0 22px 16px' }}>
        <div style={{
          borderRadius: 18, padding: '22px 18px',
          background: 'var(--sunken)',
          border: `1.5px solid ${t.primary}33`,
          display: 'flex', alignItems: 'center', gap: 14,
          minHeight: 100,
        }}>
          {/* Trainer avatar, or a distinct AI mark when no human trainer generated this plan */}
          {planSource === 'trainer' ? (
            <AvatarImage
              url={trainerAvatarUrl}
              label={trainerName ?? tr('client.workout.trainerFallback')}
              w={64} h={64}
              radius={16}
              dark={dark}
            />
          ) : (
            <img
              src={aiPlanIcon}
              alt={planSource === 'fallback'
                ? tr('client.workout.localFallbackPlan')
                : tr('client.workout.aiPoweredPlan')}
              style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', flexShrink: 0 }}
            />
          )}

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 9, fontWeight: 700,
                letterSpacing: '.07em', textTransform: 'uppercase',
                background: `${t.primary}22`, color: t.primary,
              }}>
                {planSource === 'trainer'
                  ? tr('client.workout.yourTrainer')
                  : planSource === 'fallback'
                    ? tr('client.workout.localFallback')
                    : tr('client.workout.aiPlan')}
              </div>
            </div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: inkPri(dark),
              fontFamily: '"Plus Jakarta Sans",sans-serif', letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {planSource === 'trainer'
                ? tr('client.workout.trainerPlan')
                : planSource === 'fallback'
                  ? tr('client.workout.localFallbackPlan')
                  : tr('client.workout.aiPoweredPlan')}
            </div>
            <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.55)' : 'rgba(14,26,43,.5)', marginTop: 2 }}>
              {planSource === 'fallback' ? (
                tr('client.workout.localFallbackNote')
              ) : hasTrainerPlans ? (
                <>{trainerName ? `${tr('client.workout.by')}${trainerName} · ` : ''}{trainerPlans.length === 1 ? tr('client.workout.planCount_one', { count: trainerPlans.length }) : tr('client.workout.planCount_other', { count: trainerPlans.length })}</>

              ) : (
                <>{activeCheckin.goal} · {activeCheckin.minutes} min · {activeCheckin.location || tr('client.workout.gymFallback')}</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Your Plans — unified trainer-plan list (sent / active / postponed) */}
      {hasTrainerPlans && source !== 'trainer_timeout' && (
        <div style={{ padding: '0 22px 14px' }}>
          <SectionLabel dark={dark}>{tr('client.workout.yourPlans')}</SectionLabel>

          <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${t.primary}33` }}>
            {trainerPlans.map((p, i) => {
              const isOpen = expandedPlan === p.id;
              const meta = STATUS_META[p.status] ?? STATUS_META.sent!;
              const dateLabel = p.sentAt
                ? new Date(p.sentAt).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric' })
                : tr('client.workout.plan');
              const startLabel = p.status === 'sent' ? tr('client.workout.startLabel') : tr('client.workout.resumeLabel');
              return (
                <div key={p.id} style={{ borderTop: i > 0 ? `1px solid ${t.primary}22` : undefined }}>

                  {/* Row — cancel badge inline, click row to expand */}
                  <div style={{
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--sunken)',
                  }}>
                    <button onClick={() => setExpandedPlan(isOpen ? null : p.id)} style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: inkPri(dark) }}>{dateLabel}</span>
                        <span style={{ fontSize: 11.5, color: dark ? 'rgba(255,255,255,.5)' : '#6b7a90', marginLeft: 8 }}>
                          {p.exercises.length === 1
                            ? tr('client.workout.exerciseCount_one', { count: p.exercises.length })
                            : tr('client.workout.exerciseCount_other', { count: p.exercises.length })}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: '.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,.4)' : '#aab' }}>{isOpen ? '▲' : '▼'}</span>
                    </button>

                    <button
                      title={tr('client.workout.cancelPlan')}
                      onClick={() => setConfirmCancelPlan(p)}
                      style={{
                        flexShrink: 0, padding: '3px 9px', borderRadius: 999,
                        background: `${t.criticalRed}22`, color: t.criticalRed,
                        border: `1px solid ${t.criticalRed}44`, fontSize: 10, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.04em',
                      }}
                    >
                      {tr('client.workout.cancelLabel')}
                    </button>
                  </div>

                  {/* Expanded: exercise list + contextual actions */}
                  {isOpen && (
                    <div style={{ padding: '0 14px 12px', background: 'var(--sunken)' }}>
                      {(() => {
                        // Same grouping the trainer already sees in the plan
                        // editor (STRUCTURE_BLOCKS canonical order), extended
                        // to the client's plan-card preview.
                        const sorted = sortBySessionBlock(p.exercises);
                        return sorted.map((ex, ei) => {
                          const block = ex.phase ? STRUCTURE_BLOCKS.find(b => b.key === ex.phase) : undefined;
                          const isFirstOfBlock = block && (ei === 0 || sorted[ei - 1]?.phase !== ex.phase);
                          return (
                            <React.Fragment key={ex.id}>
                              {isFirstOfBlock && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: ei === 0 ? '0 0 6px' : '12px 0 6px' }}>
                                  <Icon name={block.icon} size={11} color={block.color} />
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: block.color, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                                    {tr(`coachDna.step10.blocks.${block.key}.label`)}
                                  </span>
                                </div>
                              )}
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '7px 10px', borderRadius: 9, marginBottom: 5,
                                background: 'var(--sunken)',
                                border: `1px solid ${t.primary}22`,
                              }}>
                                <div style={{
                                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                  background: `${t.primary}22`, fontSize: 9, fontWeight: 700,
                                  color: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{ei + 1}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: inkPri(dark) }}>{translateName({ name: ex.exercise_name, name_source_locale: ex.name_source_locale })}</div>
                                  <div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,.5)' : '#6b7a90', marginTop: 1 }}>
                                    {[
                                      ex.sets        ? `${ex.sets} sets`         : null,
                                      ex.reps        ? `${ex.reps} reps`
                                        : ex.duration_seconds ? tr('common.units.holdSec', { seconds: ex.duration_seconds })
                                        : null,
                                      ex.load_kg     ? `${ex.load_kg} kg`        : null,
                                      ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
                                    ].filter(Boolean).join(' · ')}
                                    {ex.muscle_group ? ` — ${translateMuscleGroup(ex.muscle_group)}` : ''}
                                  </div>
                                  {ex.notes && <div style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,.35)' : '#9aa', marginTop: 1, fontStyle: 'italic' }}>{translateNote(ex.notes)}</div>}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        });
                      })()}

                      {/* Actions — Postpone only offered while the plan is still 'sent' */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {p.status === 'sent' && (
                          <button
                            onClick={() => postponePlan(p)}
                            style={{
                              flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${t.amber}55`,
                              background: `${t.amber}18`, color: t.amber, fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            {tr('client.workout.postpone')}
                          </button>
                        )}
                        <button
                          onClick={() => startPlan(p)}
                          data-testid="start-plan-btn"
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                            background: t.primary,
                            color: '#0E1A2B',
                            fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          {startLabel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Safety Gate block — shown when ai_led_blocked */}
      {safetyBlocked && (
        <div style={{ margin: '0 22px 16px', padding: '18px 18px', borderRadius: 16, background: `${t.accent}12`, border: `1.5px solid ${t.accent}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="heart" size={18} color={t.accent} stroke={2.2}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.accent }}>{safetyTitle}</div>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: textSec(dark), lineHeight: 1.6 }}>{safetyMessage}</p>
          {readinessScore !== null && (
            <div style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>
              {tr('client.workout.readinessScoreLabel')}{readinessScore}/100
            </div>
          )}
        </div>
      )}

      {/* Adaptations banner — shown when smart endpoint provides adjustments */}
      {!safetyBlocked && adaptations.length > 0 && (
        <div style={{ margin: '0 22px 10px', padding: '8px 12px', borderRadius: 10, background: `${t.primary}14`, border: `1px solid ${t.primary}33` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: t.primary, marginBottom: 4 }}>{tr('client.workout.sessionAdapted')}</div>
          {adaptations.map((a, i) => <div key={i} style={{ fontSize: 11.5, color: textSec(dark) }}>· {translateAdaptation(a)}</div>)}
        </div>
      )}

      {/* Today's AI plan — only when no actionable trainer plan exists */}
      {!hasTrainerPlans && (
      <div style={{ padding: '4px 22px 0' }}>
        {!aiCheckinAllowed && (
          <div style={{
            padding: '12px 14px', borderRadius: 12, marginBottom: 10,
            background: `${t.primary}10`, border: `1px solid ${t.primary}33`,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Icon name="sparkle" size={15} color={t.primary} stroke={2}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: textPri(dark), marginBottom: 2 }}>
                {tr('client.workout.aiLockedFree')}
              </div>
              <div style={{ fontSize: 11.5, color: textSec(dark), lineHeight: 1.5, marginBottom: 8 }}>
                {tr('client.workout.aiLockedFreeNote')}
              </div>
              <button
                onClick={() => nav('plans', { source: 'manage' })}
                style={{
                  padding: '8px 18px', borderRadius: 999, border: 'none',
                  background: t.primary, color: '#fff',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {tr('client.workout.aiLockedFreeCta')}
              </button>
            </div>
          </div>
        )}
        <SectionLabel dark={dark}>{tr('client.workout.todaysAiPlan')}</SectionLabel>

        {loading && (
          <div style={{
            padding: '28px 0', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12,
          }}>
            <Spinner size={32} thickness={3} color={t.primary} trackColor={dark ? '#1F2E45' : '#E5EAF1'} />
            <div style={{ fontSize: 13, color: textSec(dark) }}>{tr('client.workout.generating')}</div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '16px', borderRadius: 14,
            background: `${t.accent}1a`, border: `1px solid ${t.accent}55`,
          }}>
            <div style={{ fontSize: 13, color: t.accent, marginBottom: 10 }}>{error}</div>
            <button onClick={fetchPlan} style={{
              padding: '8px 18px', borderRadius: 999, border: 'none',
              background: t.accent, color: '#fff',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}>{tr('client.workout.retry')}</button>
          </div>
        )}

        {genState.phase === 'weekly-limit' && (
          <div style={{
            padding: '16px', borderRadius: 14,
            background: `${t.primary}12`, border: `1px solid ${t.primary}55`,
          }}>
            <div style={{ fontSize: 13, color: textPri(dark), marginBottom: 8 }}>
              {tr('client.workout.limitWeekly', { n: genState.limit })}
            </div>
            <div style={{ fontSize: 11.5, color: textSec(dark), lineHeight: 1.5, marginBottom: 12 }}>
              {tr('client.workout.limitWeeklyNote')}
            </div>
            <button onClick={() => nav('plans', { source: 'weekly-limit' })} style={{
              padding: '8px 18px', borderRadius: 999, border: 'none',
              background: t.primary, color: '#fff',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}>{tr('client.workout.limitWeeklyCta')}</button>
          </div>
        )}

        {plan && !loading && (
          <div style={{
            padding: 14, borderRadius: 14,
            background: `${t.primary}${dark ? '14' : '10'}`,
            border: `1px solid ${t.primary}55`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: cycleCtx ? 6 : 8 }}>
              <Icon name="sparkle" size={16} color={t.primary} stroke={2.3}/>
              <div style={{ fontSize: 13, fontWeight: 700, color: textPri(dark) }}>
                {activeCheckin.goal} · {activeCheckin.minutes} min
              </div>
            </div>
            {cycleCtx && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginBottom: 10, padding: '4px 10px', borderRadius: 999,
                background: `${t.lavender}22`, border: `1px solid ${t.lavender}55`,
              }}>
                <span style={{ fontSize: 11 }}>🌙</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: t.lavender }}>
                  {tr('client.workout.phaseDay', { phase: cycleCtx.phase, day: cycleCtx.day, length: cycleCtx.cycleLength })}{tr('client.workout.cycleAdapted')}
                </span>
              </div>
            )}
            {planMayOverrun && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 6,
                marginBottom: 10, padding: '6px 10px', borderRadius: 10,
                background: `${t.accent}18`, border: `1px solid ${t.accent}44`,
              }}>
                <span style={{ fontSize: 11 }}>⏱️</span>
                <span style={{ fontSize: 11.5, color: t.accent, lineHeight: 1.4 }}>
                  {tr('client.workout.timeMayOverrun', { estimated: estimatedPlanMinutes, available: availableMinutes })}
                </span>
              </div>
            )}
            {planMayUnderrun && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 6,
                marginBottom: 10, padding: '6px 10px', borderRadius: 10,
                background: `${t.accent}18`, border: `1px solid ${t.accent}44`,
              }}>
                <span style={{ fontSize: 11 }}>⏱️</span>
                <span style={{ fontSize: 11.5, color: t.accent, lineHeight: 1.4 }}>
                  {tr('client.workout.timeMayUnderrun', { estimated: estimatedPlanMinutes, available: availableMinutes })}
                </span>
              </div>
            )}
            {plan.map((ex, i) => (
              <PlanRow
                key={i}
                label={ex.exercise_name}
                detail={[
                  ex.sets && ex.reps ? `${ex.sets}×${ex.reps}`
                    : ex.duration_seconds ? `${ex.sets ?? 1}× ${tr('common.units.holdSec', { seconds: ex.duration_seconds })}`
                    : null,
                  ex.load_kg ? `${ex.load_kg} kg` : null,
                  ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
                  translateMuscleGroup(ex.muscle_group),
                ].filter(Boolean).join(' · ')}
                t={t} dark={dark}
              />
            ))}
            {sore.length > 0 && (
              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: `${t.accent}1a`, color: t.accent, fontSize: 11.5, fontWeight: 600 }}>
                {tr('client.workout.adjustedFor')}{sore.join(', ').toLowerCase()}
              </div>
            )}

          </div>
        )}
      </div>
      )}

      {/* Bottom CTA — drives the AI plan only; trainer plans start from their own card */}
      {!hasTrainerPlans && (
        <div style={{ padding: '16px 22px 28px' }}>
          <button
            onClick={() => nav('workoutMode', { planId: planId || null, exercises: plan, plannedDurationMin: activeCheckin.minutes ?? undefined })}
            disabled={!plan || plan.length === 0 || loading || safetyBlocked}
            data-testid="start-ai-plan-btn"
            style={{
              ...primaryBtn(t.primary),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (!plan || loading) ? 0.5 : 1,
            }}
          >
            <Icon name="play" size={14} color="#0E1A2B"/> {tr('client.workout.startBtn')}
          </button>
        </div>
      )}
      {/* Cancel confirmation modal */}
      {confirmCancelPlan && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setConfirmCancelPlan(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: 'var(--surface)',
              borderRadius: '20px 20px 0 0',
              padding: '24px 22px calc(28px + env(safe-area-inset-bottom, 0px))',
              border: `1px solid ${borderSubtle(dark)}`,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: inkPri(dark), marginBottom: 8, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
              {tr('client.workout.cancelModalTitle')}
            </div>
            <div style={{ fontSize: 13, color: textSec(dark), lineHeight: 1.55, marginBottom: 22 }}>
              {tr('client.workout.cancelModalFrom')}
              <b style={{ color: inkPri(dark) }}>
                {confirmCancelPlan.sentAt
                  ? new Date(confirmCancelPlan.sentAt).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric' })
                  : tr('client.workout.cancelModalYourTrainer')}
              </b>
              {tr('client.workout.cancelModalWillBeCanceled')}
              {tr('client.workout.cancelModalCannotUndo')}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmCancelPlan(null)}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 14,
                  background: 'transparent', border: `1.5px solid ${borderSubtle(dark)}`,
                  color: inkPri(dark), fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {tr('client.workout.keepIt')}
              </button>
              <button
                onClick={() => { cancelPlan(confirmCancelPlan); setConfirmCancelPlan(null); }}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 14,
                  background: t.criticalRed, border: 'none',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {tr('client.workout.yesCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

interface PlanRowProps {
  label: string;
  detail: string;
  t: Theme;
  dark: boolean;
}

function PlanRow({ label, detail, t, dark }: PlanRowProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0',
      borderBottom: `1px dashed ${borderSubtle(dark)}`,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.primary, marginTop: 6, flexShrink: 0 }}/>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: textPri(dark), lineHeight: 1.35, wordBreak: 'break-word' }}>{label}</div>
        {detail && <div style={{ fontSize: 12, color: textSec(dark), marginTop: 2 }}>{detail}</div>}
      </div>
    </div>
  );
}
