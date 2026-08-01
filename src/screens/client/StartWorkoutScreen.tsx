import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { supabase } from '../../supabase';
import { Icon, AvatarImage, ScreenTitle, SectionLabel } from '../../components';
import { Spinner } from '../../ui';
import { borderSubtle, textPri, textSec, primaryBtn } from '../../theme';
import type { NavFn, CheckIn, Subscription } from '../../types';
import type { ExerciseCategory } from '../../types/workout';
import type { Json } from '../../types/supabase';
import { requestSmartWorkout, requestWorkoutPlan } from '../../lib/workoutGeneration';
import type { CycleContext, GeneratedWorkoutExercise } from '../../lib/workoutGeneration';
import { buildClientContext, buildTodayContext, buildLibraryContext, resolveTrainerContext } from '../../ai/buildAIContext';
import type { TrainerContext, TaskContext } from '../../ai/types';
import { useFeatureAccessMap, useEffectivePlanKey } from '../../hooks/useFeatureAccess';
import { useExerciseClassification } from '../../hooks/useExerciseClassification';
import { computeCyclePhases } from './CycleScreen';
import { autoExpirePlans }   from '../../lib/autoExpirePlans';
import { translateMuscleGroup } from '../../lib/translateMuscleGroup';
import { useTranslatedExerciseContent } from '../../hooks/useTranslatedExerciseContent';
import { useTranslatedExerciseNamesByRow } from '../../hooks/useTranslatedExerciseNamesByRow';
import { resolveExerciseNameLocale } from '../../lib/exerciseNameLocale';
import type { AppLanguage } from '../../i18n';
import { notifyLinkedTrainer } from '../../lib/notify';

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
  | { phase: 'blocked'; safetyTitle: string; safetyMessage: string; readinessScore: number };

// ── Fallback plan generator ──────────────────────────────────────────────────
// Activated when the AI workout API is unreachable (DeepSeek outage, timeout, etc.)
// Produces a basic bodyweight circuit based on the user's goal and available time.
// reps XOR durationSeconds — hold/static/continuous exercises (Plank Hold,
// Jogging in Place, ...) specify durationSeconds instead of a meaningless rep
// count; countable-motion exercises specify reps as before.
type FallbackTemplate =
  | { name: string; muscle: string; sets: number; reps: number; durationSeconds?: undefined; rest: number }
  | { name: string; muscle: string; sets: number; reps?: undefined; durationSeconds: number; rest: number };

const GOAL_TEMPLATES: Record<string, FallbackTemplate[]> = {
  hypertrophy: [
    { name: 'Push-up',            muscle: 'Chest',      sets: 4, reps: 12, rest: 60 },
    { name: 'Bodyweight Squat',   muscle: 'Quadriceps', sets: 4, reps: 15, rest: 60 },
    { name: 'Glute Bridge',       muscle: 'Glutes',     sets: 3, reps: 15, rest: 45 },
    { name: 'Plank Hold',         muscle: 'Core',       sets: 3, durationSeconds: 30, rest: 45 },
    { name: 'Lunges',             muscle: 'Quadriceps', sets: 3, reps: 12, rest: 45 },
    { name: 'Tricep Dip',         muscle: 'Triceps',    sets: 3, reps: 12, rest: 45 },
  ],
  weight_loss: [
    { name: 'Burpees',            muscle: 'Full Body',  sets: 4, reps: 12, rest: 30 },
    { name: 'Mountain Climbers',  muscle: 'Core',       sets: 4, reps: 20, rest: 30 },
    { name: 'Jump Squats',        muscle: 'Quadriceps', sets: 3, reps: 15, rest: 45 },
    { name: 'High Knees',         muscle: 'Cardio',     sets: 3, reps: 30, rest: 30 },
    { name: 'Bicycle Crunches',   muscle: 'Core',       sets: 3, reps: 20, rest: 30 },
    { name: 'Jumping Jacks',      muscle: 'Full Body',  sets: 3, reps: 30, rest: 20 },
  ],
  endurance: [
    { name: 'Jogging in Place',   muscle: 'Cardio',     sets: 1, durationSeconds: 60, rest: 0 },
    { name: 'Bodyweight Squat',  muscle: 'Quadriceps', sets: 3, reps: 20, rest: 30 },
    { name: 'Push-up',            muscle: 'Chest',      sets: 3, reps: 15, rest: 30 },
    { name: 'Plank Hold',         muscle: 'Core',       sets: 3, durationSeconds: 40, rest: 30 },
    { name: 'Walking Lunges',     muscle: 'Quadriceps', sets: 3, reps: 16, rest: 30 },
    { name: 'Glute Bridge',       muscle: 'Glutes',     sets: 3, reps: 20, rest: 30 },
  ],
  mobility: [
    { name: 'Cat-Cow Stretch',    muscle: 'Spine',      sets: 2, reps: 10, rest: 20 },
    { name: 'Hip Circles',        muscle: 'Hips',       sets: 2, reps: 10, rest: 20 },
    { name: 'World\'s Greatest Stretch', muscle: 'Full Body', sets: 2, reps: 6, rest: 30 },
    { name: 'Downward Dog',       muscle: 'Shoulders',  sets: 2, durationSeconds: 30, rest: 20 },
    { name: 'Child\'s Pose',      muscle: 'Back',       sets: 2, durationSeconds: 30, rest: 20 },
    { name: 'Thoracic Rotation',  muscle: 'Spine',      sets: 2, reps: 8, rest: 20 },
  ],
  strength: [
    { name: 'Push-up',            muscle: 'Chest',      sets: 4, reps: 10, rest: 75 },
    { name: 'Bodyweight Squat',   muscle: 'Quadriceps', sets: 4, reps: 20, rest: 60 },
    { name: 'Pull-up or Row',     muscle: 'Back',       sets: 3, reps: 8,  rest: 75 },
    { name: 'Plank Hold',         muscle: 'Core',       sets: 3, durationSeconds: 45, rest: 45 },
    { name: 'Bulgarian Split Squat', muscle: 'Quadriceps', sets: 3, reps: 10, rest: 60 },
    { name: 'Pike Push-up',       muscle: 'Shoulders',  sets: 3, reps: 10, rest: 60 },
  ],
  general: [
    { name: 'Push-up',            muscle: 'Chest',      sets: 3, reps: 12, rest: 45 },
    { name: 'Bodyweight Squat',   muscle: 'Quadriceps', sets: 3, reps: 15, rest: 45 },
    { name: 'Plank Hold',         muscle: 'Core',       sets: 3, durationSeconds: 30, rest: 45 },
    { name: 'Lunges',             muscle: 'Quadriceps', sets: 3, reps: 10, rest: 45 },
    { name: 'Glute Bridge',       muscle: 'Glutes',     sets: 3, reps: 15, rest: 45 },
    { name: 'Superman Hold',      muscle: 'Back',       sets: 3, durationSeconds: 15, rest: 45 },
  ],
};

function generateFallbackPlan(
  goal: string | undefined,
  availableMinutes: number,
): GeneratedWorkoutExercise[] {
  const g = (goal ?? '').toLowerCase();
  let category: keyof typeof GOAL_TEMPLATES = 'general';
  if (g.includes('hypertrophy'))       category = 'hypertrophy';
  else if (g.includes('weight') || g.includes('loss') || g.includes('perda') || g.includes('emagrecimento')) category = 'weight_loss';
  else if (g.includes('strength') || g.includes('força') || g.includes('forca')) category = 'strength';
  else if (g.includes('endurance') || g.includes('conditioning') || g.includes('resistência') || g.includes('condicionamento')) category = 'endurance';
  else if (g.includes('mobility') || g.includes('mobilidade') || g.includes('flexibility') || g.includes('alongamento')) category = 'mobility';

  const templates = (GOAL_TEMPLATES[category] ?? GOAL_TEMPLATES.general) as FallbackTemplate[];
  const exerciseCount = Math.min(templates.length, Math.max(3, Math.floor(availableMinutes / 7)));

  return templates.slice(0, exerciseCount).map(t => ({
    exercise_name:    t.name,
    muscle_group:     t.muscle,
    sets:             t.sets,
    reps:             t.reps ?? null,
    duration_seconds: t.durationSeconds ?? null,
    load_kg:          null,
    rest_seconds:     t.rest,
    notes:            null,
  }));
}

export function StartWorkoutScreen({ nav, t, dark, checkin, user, cycleConfig, linkedTrainerId = '', source, prefs }: StartWorkoutScreenProps) {
  const { t: tr } = useTranslation();

  // Feature gate: trainers viewing a client always get full AI; clients follow the matrix.
  const isTrainerView    = !!linkedTrainerId && user.role !== 'client';
  const effectivePlanKey = useEffectivePlanKey(user.subscription ?? null);
  const aiAccessMap = useFeatureAccessMap(
    effectivePlanKey,
    ['ai.checkin_adjustment', 'ai.advanced_analysis',
     'workout.sessions_per_week', 'workout.exercises_per_session', 'workout.exercise_type',
     'trainer_plan.days_per_week'],
    isTrainerView,
  );
  const aiCheckinAllowed    = aiAccessMap['ai.checkin_adjustment']?.allowed    ?? false;
  const aiAdvancedAllowed   = aiAccessMap['ai.advanced_analysis']?.allowed     ?? false;
  const sessionsPerWeekCap  = aiAccessMap['workout.sessions_per_week']?.limitValue  ?? null; // null = unlimited
  const exercisesPerSession = aiAccessMap['workout.exercises_per_session']?.limitValue ?? null;
  // workout.exercise_type: limit_value 0 = fitness only, null = all
  const fitnessOnlyWorkout  = (aiAccessMap['workout.exercise_type']?.limitValue ?? null) === 0;
  // trainer_plan.days_per_week: max plans the client can execute per week (null = unlimited)
  const trainerPlanDaysCap  = aiAccessMap['trainer_plan.days_per_week']?.limitValue ?? null;
  const [genState, setGenState] = React.useState<GenState>({ phase: 'idle' });
  const [planSource, setPlanSource] = React.useState<string | null>(null);
  const [trainerName,      setTrainerName]      = React.useState<string | null>(null);
  const [trainerAvatarUrl, setTrainerAvatarUrl] = React.useState<string | null>(null);
  const [cycleCtx,   setCycleCtx]   = React.useState<CycleContext | null>(null);
  const [latestCheckin, setLatestCheckin] = React.useState<CheckIn | null>(null);
  const [trainerPlans, setTrainerPlans] = React.useState<PlanCard[]>([]);
  const [trainerPlanLocked, setTrainerPlanLocked] = React.useState(false);
  const [expandedPlan,  setExpandedPlan] = React.useState<string | null>(null);
  const [newPlanArrived, setNewPlanArrived] = React.useState(false);
  const activeCheckin = latestCheckin ?? checkin;

  // Flatten all trainer plan exercises for classification
  const allTrainerExercises = React.useMemo(
    () => trainerPlans.flatMap(p => p.exercises.map(e => ({
      id:                e.id,
      name:              e.exercise_name,
      muscle_group:      e.muscle_group ?? '',
      exercise_category: (e.exercise_category as ExerciseCategory | null) ?? null,
    }))),
    [trainerPlans],
  );
  const { classificationMap } = useExerciseClassification(
    fitnessOnlyWorkout && !isTrainerView ? allTrainerExercises : [],
  );
  // Translates exercise names on the plan-card preview for this client's own
  // locale — every row now carries its own name_source_locale (AI-generated,
  // catalog, or hand-typed, D7), grouped and translated only where it
  // diverges from what this client should see. Only the name respects the
  // keep-English-names toggle (docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md,
  // D1) — notes (translateNote below) always follow the client's own app
  // language, untouched by that toggle.
  const translateName = useTranslatedExerciseNamesByRow(
    trainerPlans.flatMap(p => p.exercises.map(e => ({ name: e.exercise_name, name_source_locale: e.name_source_locale }))),
    resolveExerciseNameLocale({
      keepExerciseNamesInEnglish: prefs?.keepExerciseNamesInEnglish ?? true,
      language: i18n.language as AppLanguage,
    }),
  );
  const translateNote = useTranslatedExerciseContent(
    trainerPlans.flatMap(p => p.exercises.map(e => e.notes)),
  );

  // When fitnessOnlyWorkout: filter performance exercises from trainer plans
  // Plans that end up with 0 exercises are removed entirely (avoid empty plan cards)
  const filteredTrainerPlans = React.useMemo(() => {
    if (!fitnessOnlyWorkout || isTrainerView) return trainerPlans;
    return trainerPlans
      .map(p => ({
        ...p,
        exercises: p.exercises.filter(e => {
          const cat = classificationMap[e.id] ?? (e.exercise_category as string | null) ?? null;
          return cat !== 'performance';
        }),
      }))
      .filter(p => p.exercises.length > 0);
  }, [trainerPlans, fitnessOnlyWorkout, isTrainerView, classificationMap]);

  const filteredCount = React.useMemo(() => {
    if (!fitnessOnlyWorkout || isTrainerView) return 0;
    return trainerPlans.reduce((acc, p) => {
      return acc + p.exercises.filter(e => {
        const cat = classificationMap[e.id] ?? (e.exercise_category as string | null) ?? null;
        return cat === 'performance';
      }).length;
    }, 0);
  }, [trainerPlans, fitnessOnlyWorkout, isTrainerView, classificationMap]);

  const hasTrainerPlans = filteredTrainerPlans.length > 0;

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

  // Soft, client-side time-fit check: neither generation endpoint validates
  // its own totalDurationMin against the requested window server-side (see
  // system audit follow-up, 2026-07-10) — this is informational only, never
  // blocks starting the workout.
  const estimatedPlanMinutes = React.useMemo(() => {
    if (!plan?.length) return 0;
    const totalSeconds = plan.reduce((sum, ex) => {
      const sets         = ex.sets ?? 1;
      const perSetActive = ex.duration_seconds ?? (ex.reps ? 40 : 30);
      const perSetRest   = ex.rest_seconds ?? 30;
      return sum + sets * (perSetActive + perSetRest);
    }, 0);
    return Math.ceil(totalSeconds / 60);
  }, [plan]);
  const availableMinutes = activeCheckin.minutes ?? 0;
  const planMayOverrun = estimatedPlanMinutes > 0 && availableMinutes > 0
    && estimatedPlanMinutes > availableMinutes * 1.2;

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
        }
        setLatestCheckin(resolvedCheckin);

        // 2. Cycle context
        const cycleContext = getCycleContext();
        setCycleCtx(cycleContext);

        // If no profile, fall back to legacy endpoint
        if (!profileData) {
          const           exercises = await requestWorkoutPlan({ checkin: resolvedCheckin, physicalProfile, cycleContext, locale: i18n.language });
          setGenState({ phase: 'success', plan: exercises, planId: '', readinessScore: -1, adaptations: [] });
          void persistGeneratedPlan(exercises, resolvedCheckin, cycleContext, physicalProfile);
          return;
        }

        const clientCtx = buildClientContext(profileData as any);

        // 3. TodayContext from full check-in
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

        // 4. StatsContext from fetched data
        const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : [];

        // ── Weekly session cap (workout.sessions_per_week gate) ────────────────
        // Count sessions started this calendar week (Monday–Sunday).
        if (sessionsPerWeekCap !== null) {
          const now = new Date();
          const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon … 6=Sun
          const weekStart = new Date(now);
          weekStart.setHours(0, 0, 0, 0);
          weekStart.setDate(now.getDate() - dayOfWeek);
          const weekCount = sessions.filter((s: any) =>
            new Date(s.started_at) >= weekStart
          ).length;
          if (weekCount >= sessionsPerWeekCap) {
            setGenState({
              phase:         'error',
              error:         tr('client.workout.limitWeekly', { n: sessionsPerWeekCap }),
            });
            return;
          }
        }
        const checkinHist = checkinHistRes.status === 'fulfilled' ? (checkinHistRes.value.data ?? []) : [];
        const avgEnergy = checkinHist.length
          ? Math.round(checkinHist.reduce((s, c) => s + (c.energy_level ?? 0), 0) / checkinHist.length * 10) / 10 : 0;
        const avgReadiness = checkinHist.length
          ? Math.round(checkinHist.reduce((s, c) => s + (c.readiness_score ?? 0), 0) / checkinHist.length) : 60;
        const completed = sessions.filter((s: any) => s.status === 'completed').length;
        const statsCtx = {
          adherenceRate: sessions.length > 0 ? completed / sessions.length : 0,
          workoutStreak: 0, sessionsLast30d: sessions.length,
          avgEnergy7d: avgEnergy, avgReadiness7d: avgReadiness, avgRPELast3: 0,
          painEvents14d: 0, painRecurrenceAlert: false,
          predictiveScores: { progressionReadiness: 50, fatigueRisk: 20, painRecurrence: 10, sessionCompletion: 70, planFit: 70 },
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
        };

        // ── Call smart endpoint ─────────────────────────────────────────────
        // ai.checkin_adjustment gate: free plan always gets the template fallback.
        // ai.advanced_analysis gate: ai_fitness gets smart workout but without M5 predictive scores.
        const useSmart = aiCheckinAllowed && (prefs?.aiPersonalization !== false || !!linkedTrainerId);

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
          },
        };

        // When useSmart is false (free tier, AI personalization disabled, or no
        // trainer link), the client still gets a real workout — a deterministic
        // template plan, not an empty one (see generateFallbackPlan above).
        const result = useSmart
          ? await requestSmartWorkout({
              trainer: trainerCtx, client: clientCtx,
              today: todayCtx as any, stats: gatedStatsCtx,
              library: libraryCtx, task: taskCtx,
              locale: i18n.language,
            })
          : {
              exercises:      generateFallbackPlan(resolvedCheckin.goal, taskCtx.durationMin ?? 30),
              readinessScore: todayCtx.readinessScore || 60,
              blocked:        false,
              adaptations:    [] as string[],
              safetyTitle:    null as any,
              safetyMessage:  null as any,
            };

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
        setPlanSource('ai');
        void persistGeneratedPlan(result.exercises, resolvedCheckin, cycleContext, physicalProfile);
      } // end if (user?.id)
    } catch (err: unknown) {
      console.warn('[start-workout] AI generation failed — using fallback plan', err);
      const goal    = activeCheckin.goal;
      const minutes = activeCheckin.minutes ?? 30;
      const fallback = generateFallbackPlan(goal, minutes);
      setGenState({
        phase:          'success',
        plan:           fallback,
        planId:         '',
        readinessScore: 60,
        adaptations:    [],
      });
      setPlanSource('ai');
    }
  };

  // Wait for the feature-permission matrix to resolve before generating.
  // useFeatureAccessMap always starts as { allowed: false, loading: true } —
  // firing fetchPlan() on an empty-deps mount effect would permanently
  // capture that unresolved `false` for aiCheckinAllowed (stale closure),
  // forcing useSmart to false and silently persisting a zero-exercise plan
  // for every client (most visibly trainer-less ones, whose only path is
  // this AI branch — see system audit follow-up, 2026-07-09).
  const aiPermsLoading = aiAccessMap['ai.checkin_adjustment']?.loading ?? true;
  const fetchFiredRef = React.useRef(false);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  React.useEffect(() => {
    if (aiPermsLoading || fetchFiredRef.current) return;
    fetchFiredRef.current = true;
    const fetch = async () => {
      try { await fetchPlan(); } catch { /* caught internally */ }
    };
    void fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiPermsLoading]);

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
          {/* Trainer avatar */}
          <AvatarImage
            url={trainerAvatarUrl}
            label={trainerName ?? tr('client.workout.trainerFallback')}
            w={64} h={64}
            radius={16}
            dark={dark}
          />

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <div style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 9, fontWeight: 700,
                letterSpacing: '.07em', textTransform: 'uppercase',
                background: `${t.primary}22`, color: t.primary,
              }}>
                {planSource === 'trainer' ? tr('client.workout.yourTrainer') : tr('client.workout.aiPlan')}
              </div>
            </div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: inkPri(dark),
              fontFamily: '"Plus Jakarta Sans",sans-serif', letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {planSource === 'trainer' ? tr('client.workout.trainerPlan') : tr('client.workout.aiPoweredPlan')}
            </div>
            <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.55)' : 'rgba(14,26,43,.5)', marginTop: 2 }}>
              {hasTrainerPlans ? (
                <>{trainerName ? `${tr('client.workout.by')}${trainerName} · ` : ''}{filteredTrainerPlans.length === 1 ? tr('client.workout.planCount_one', { count: filteredTrainerPlans.length }) : tr('client.workout.planCount_other', { count: filteredTrainerPlans.length })}</>

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

          {/* Filtered performance exercises notice */}
          {fitnessOnlyWorkout && filteredCount > 0 && (
            <div style={{
              marginBottom: 10, padding: '10px 12px', borderRadius: 10,
              background: `${t.primary}0d`, border: `1px solid ${t.primary}2a`,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>ℹ️</span>
              <div style={{ fontSize: 11, color: textSec(dark), lineHeight: 1.5 }}>
                {tr('client.trainerPlan.exercisesFiltered', { count: filteredCount })}
              </div>
            </div>
          )}

          <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${t.primary}33` }}>
            {filteredTrainerPlans.map((p, i) => {
              const isOpen = expandedPlan === p.id;
              const meta = STATUS_META[p.status] ?? STATUS_META.sent!;
              const dateLabel = p.sentAt
                ? new Date(p.sentAt).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric' })
                : tr('client.workout.plan');
              const startLabel = p.status === 'sent' ? tr('client.workout.startLabel') : tr('client.workout.resumeLabel');
              // Plan is locked when plan index exceeds the weekly cap (0-based: cap=1 → only index 0 is free)
              const isPlanLocked = trainerPlanDaysCap !== null && i >= trainerPlanDaysCap;
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
                      {p.exercises.map((ex, ei) => (
                        <div key={ex.id} style={{
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
                      ))}

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
                          onClick={() => isPlanLocked ? setTrainerPlanLocked(true) : startPlan(p)}
                          data-testid="start-plan-btn"
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                            background: isPlanLocked ? 'rgba(255,255,255,.12)' : t.primary,
                            color: isPlanLocked ? 'rgba(255,255,255,.4)' : '#0E1A2B',
                            fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          {isPlanLocked ? '🔒' : ''}{startLabel}
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
          {adaptations.map((a, i) => <div key={i} style={{ fontSize: 11.5, color: textSec(dark) }}>· {a}</div>)}
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
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: t.primary, color: '#fff',
                  fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {tr('trainer.dashboard.upgradeNow')}
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

            {/* Performance teaser — visible on FREE and AI Fitness; not shown to trainers or AI Performance clients */}
            {fitnessOnlyWorkout && !isTrainerView && (
              <div style={{
                marginTop: 12, padding: '12px 14px', borderRadius: 12,
                background: `${t.primary}0d`, border: `1px solid ${t.primary}33`,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, color: textSec(dark), lineHeight: 1.5, marginBottom: 6 }}>
                    {tr('client.workout.performanceTeaser')}
                  </div>
                  <button
                    onClick={() => nav('plans', { source: 'performance_teaser' })}
                    style={{
                      fontSize: 11, fontWeight: 700, color: t.primary,
                      background: 'none', border: `1px solid ${t.primary}`,
                      borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                      letterSpacing: '.04em', fontFamily: 'inherit',
                    }}
                  >
                    {tr('client.workout.performanceTeaserCta')}
                  </button>
                </div>
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

      {/* Trainer plan locked — days_per_week cap reached */}
      {trainerPlanLocked && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24,
        }}>
          <div style={{
            background: 'var(--navy)', borderRadius: 18, padding: '28px 24px',
            maxWidth: 340, width: '100%', border: '1px solid rgba(255,255,255,.1)',
          }}>
            <div style={{ fontSize: 24, textAlign: 'center', marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8, textAlign: 'center' }}>
              {tr('client.trainerPlan.dayLocked')}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', lineHeight: 1.55, textAlign: 'center', marginBottom: 20 }}>
              {tr('client.trainerPlan.dayLockedNote', { plan: effectivePlanKey ?? user.plan_key ?? 'free', n: trainerPlanDaysCap ?? 1 })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setTrainerPlanLocked(false)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, fontFamily: 'inherit',
                  background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)',
                  border: '1px solid rgba(255,255,255,.12)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {tr('client.workout.cancelLabel')}
              </button>
              <button
                onClick={() => { setTrainerPlanLocked(false); nav('plans', { source: 'manage' }); }}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10, fontFamily: 'inherit',
                  background: t.primary, color: '#0E1A2B',
                  border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {tr('client.trainerPlan.dayLockedCta')}
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
