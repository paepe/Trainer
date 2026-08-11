import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { AvatarImage } from '../../components/Avatar';
import { RefreshChip } from '../../components/RefreshChip';
import {
  surfRaised,
  borderSubtle,
  textPri,
  textSec,
  textMute,
  ghostBtn,
  iconBtn,
} from '../../theme';
import type { NavFn } from '../../types';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTrainerTheme }  from '../../hooks/useTrainerTheme';
import { autoExpirePlans } from '../../lib/autoExpirePlans';
import { parseCheckinData } from '../../lib/parseCheckinData';
import { notify } from '../../lib/notify';
import type { ConsentCategory, ConsentMatrix } from '../../types/profile-v2';
import { applyConsentToProfile, type CategoryRender } from '../../profile/consentVisibility';

const PROFILE_VALUE_MAP: Record<string, string> = {
  // Bio
  female: 'wizard.step02.sex.female', male: 'wizard.step02.sex.male',
  intersex: 'wizard.step02.sex.intersex', prefer_not_to_say: 'wizard.step02.sex.preferNot',
  // Goals
  hypertrophy: 'wizard.goals.hypertrophy', weight_loss: 'wizard.goals.weight_loss',
  strength_gain: 'wizard.goals.strength_gain', conditioning: 'wizard.goals.conditioning',
  mobility: 'wizard.goals.mobility', longevity: 'wizard.goals.longevity',
  return_to_training: 'wizard.goals.return_to_training', emotional_wellbeing: 'wizard.goals.emotional_wellbeing',
  daily_autonomy: 'wizard.goals.daily_autonomy', body_composition: 'wizard.goals.body_composition',
  sports_performance: 'wizard.goals.sports_performance', balance: 'wizard.goals.balance',
  consistency: 'wizard.goals.consistency',
  // Movement
  irregular: 'wizard.step04.frequencies.irregular', sometimes: 'wizard.step04.frequencies.sometimes',
  not_training: 'wizard.step04.frequencies.not_training',
  beginner: 'wizard.step04.levels.beginner', intermediate: 'wizard.step04.levels.intermediate',
  advanced: 'wizard.step04.levels.advanced',
  weight_training: 'wizard.step04.modalities.weight_training', running: 'wizard.step04.modalities.running',
  walking: 'wizard.step04.modalities.walking', yoga: 'wizard.step04.modalities.yoga',
  pilates: 'wizard.step04.modalities.pilates', cycling: 'wizard.step04.modalities.cycling',
  swimming: 'wizard.step04.modalities.swimming', functional: 'wizard.step04.modalities.functional',
  martial_arts: 'wizard.step04.modalities.martial_arts', dance: 'wizard.step04.modalities.dance',
  crossfit: 'wizard.step04.modalities.crossfit', other: 'wizard.step04.modalities.other',
  // Abandon
  lack_of_time: 'wizard.step04.dropoutReasons.lack_of_time', injury: 'wizard.step04.dropoutReasons.injury',
  lack_of_results: 'wizard.step04.dropoutReasons.lack_of_results', demotivation: 'wizard.step04.dropoutReasons.demotivation',
  cost: 'wizard.step04.dropoutReasons.cost', routine_change: 'wizard.step04.dropoutReasons.routine_change',
  discomfort: 'wizard.step04.dropoutReasons.discomfort',
  // Intensity
  gradual: 'wizard.step13.intensities.gradual', moderate: 'wizard.step13.intensities.moderate',
  intense: 'wizard.step13.intensities.intense',
  // Health categories
  cardiovascular: 'wizard.step05.categories.cardiovascular', metabolic: 'wizard.step05.categories.metabolic',
  renal: 'wizard.step05.categories.renal', respiratory: 'wizard.step05.categories.respiratory',
  musculoskeletal: 'wizard.step05.categories.musculoskeletal', neurological: 'wizard.step05.categories.neurological',
  chronic_pain: 'wizard.step05.categories.chronic_pain', emotional_health: 'wizard.step05.categories.emotional_health',
  pregnancy_postpartum: 'wizard.step05.categories.pregnancy_postpartum', post_operative: 'wizard.step05.categories.post_operative',
  physical_disability: 'wizard.step05.categories.physical_disability',
  // Comorbidities
  hypertension: 'wizard.step06.conditions.hypertension', type1_diabetes: 'wizard.step06.conditions.type1_diabetes',
  asthma: 'wizard.step06.conditions.asthma', obesity: 'wizard.step06.conditions.obesity',
  osteoporosis: 'wizard.step06.conditions.osteoporosis', osteopenia: 'wizard.step06.conditions.osteopenia',
  fibromyalgia: 'wizard.step06.conditions.fibromyalgia', renal_condition: 'wizard.step06.conditions.renal_condition',
  pregnancy: 'wizard.step06.conditions.pregnancy', postpartum: 'wizard.step06.conditions.postpartum',
  // Functional
  low: 'wizard.step07.mobilityLevels.low', good: 'wizard.step07.mobilityLevels.good',
  unstable: 'wizard.step07.balanceLevels.unstable', assisted: 'wizard.step07.balanceLevels.assisted',
  stable: 'wizard.step07.balanceLevels.stable',
  partial: 'wizard.step07.autonomyLevels.partial', independent: 'wizard.step07.autonomyLevels.independent',
  mild: 'wizard.step07.painLevels.mild', none: 'wizard.step07.painLevels.none',
  severe: 'wizard.step07.painLevels.severe',
  full: 'wizard.step07.accessLevels.full', limited: 'wizard.step07.accessLevels.limited',
  wheelchair: 'wizard.step07.supports.wheelchair', cane: 'wizard.step07.supports.cane',
  walker: 'wizard.step07.supports.walker', prosthesis: 'wizard.step07.supports.prosthesis',
  nearby_support: 'wizard.step07.supports.nearby_support',
  visual: 'wizard.step07.instructionFormats.visual', auditory: 'wizard.step07.instructionFormats.auditory',
  simplified_text: 'wizard.step07.instructionFormats.simplified_text', vibration: 'wizard.step07.instructionFormats.vibration',
  standard: 'wizard.step07.instructionFormats.standard',
  // Habits
  sedentary_prolonged: 'wizard.step08.habits.sedentary', low_hydration: 'wizard.step08.habits.low_hydration',
  executive_routine: 'wizard.step08.habits.intense_routine', chronic_stress: 'wizard.step08.habits.high_stress',
  irregular_meals: 'wizard.step08.habits.irregular_eating', frequent_travel: 'wizard.step08.habits.frequent_travel',
  caregiver_duty: 'wizard.step08.habits.caregiving', smoking: 'wizard.step08.habits.smoking',
  regular_alcohol: 'wizard.step08.habits.alcohol', transport_barriers: 'wizard.step08.habits.transport',
  sleep_disorder: 'wizard.step08.habits.irregular_sleep', chronic_fatigue: 'wizard.step08.habits.fatigue',
  emotional_eating: 'wizard.step08.habits.emotional_eating', sedentary_commute: 'wizard.step08.habits.sedentary_work',
  financial_stress: 'wizard.step08.habits.financial_stress',
  // Environment
  home: 'wizard.step11.locations.home', gym: 'wizard.step11.locations.gym',
  studio: 'wizard.step11.locations.studio', park: 'wizard.step11.locations.park',
  condo: 'wizard.step11.locations.condo', online: 'wizard.step11.locations.online',
  dumbbells: 'wizard.step11.equipment.dumbbells', resistance_bands: 'wizard.step11.equipment.resistance_bands',
  barbell: 'wizard.step11.equipment.barbell', bench: 'wizard.step11.equipment.bench',
  treadmill: 'wizard.step11.equipment.treadmill', bike: 'wizard.step11.equipment.bike',
  machines: 'wizard.step11.equipment.machines', kettlebell: 'wizard.step11.equipment.kettlebell',
  cable_pulley: 'wizard.step11.equipment.cable_pulley',
  // Availability
  morning: 'wizard.step12.times.morning', afternoon: 'wizard.step12.times.afternoon',
  evening: 'wizard.step12.times.evening', variable: 'wizard.step12.times.variable',
  night_shift: 'wizard.step12.barrierItems.night_shift', family_care: 'wizard.step12.barrierItems.family_care',
  treatment_radiation: 'wizard.step12.barrierItems.treatment_radiation', transport: 'wizard.step12.barrierItems.transport',
  emotional: 'wizard.step12.barrierItems.emotional', time_constraint: 'wizard.step12.barrierItems.time_constraint',
  // Preferences
  solo: 'wizard.step13.company.solo', accompanied: 'wizard.step13.company.accompanied',
  indifferent: 'wizard.step13.company.indifferent',
  direct: 'wizard.step13.languages.direct', explanatory: 'wizard.step13.languages.explanatory',
  technical: 'wizard.step13.languages.technical',
  simple: 'wizard.step13.explanations.simple', detailed: 'wizard.step13.explanations.detailed',
  performance: 'wizard.step13.focuses.performance', health: 'wizard.step13.focuses.health',
  aesthetics: 'wizard.step13.focuses.aesthetics',
  autonomous: 'wizard.step13.supports.autonomous', guided: 'wizard.step13.supports.guided',
  // Disclosure
  yes: 'wizard.step05.discloseYes', no: 'wizard.step05.discloseNo', prefer_not: 'wizard.step05.disclosePrefer',
  // Adaptation
  maintain_normal: 'wizard.step10.adaptations.maintain', reduce_intensity: 'wizard.step10.adaptations.reduce_intensity',
  reduce_impact: 'wizard.step10.adaptations.reduce_impact', increase_rest: 'wizard.step10.adaptations.increase_rest',
  shorten_session: 'wizard.step10.adaptations.shorten', prioritize_mobility: 'wizard.step10.adaptations.prioritize_mobility',
  postpone_training: 'wizard.step10.adaptations.postpone', regenerative: 'wizard.step10.adaptations.regenerative',
};

interface ReadinessDecision {
  id:          string;
  response:    string;        // 'approved' | 'rejected'
  response_at: string | null;
  created_at:  string;
  body:        string;
}

interface ClientProfile {
  id:         string;
  name:       string;
  email:      string;
  avatar_url: string | null;
}

interface SetLog {
  set_number: number;
  reps_done:  number | null;
  load_kg:    number | null;
  rpe:        number | null;
}

interface SessionExercise {
  id:                  string;
  exercise_name:       string;
  muscle_group?:       string | null;
  sets_prescribed?:    number | null;
  reps_prescribed?:    number | null;
  load_kg_prescribed?: number | null;
  rest_seconds?:       number | null;
  notes?:              string | null;
  status:              string;
  order_index:         number;
  workout_set_logs?:   SetLog[];
}

interface WorkoutSession {
  id:                           string;
  plan_id?:                     string | null;
  started_at?:                  string | null;
  created_at?:                  string | null;
  completed_at?:                string | null;
  // duration_minutes is a dead column (1/233 rows populated, docs/
  // LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md Fase 5) — the
  // completion path (workoutSyncQueue.ts) writes total_duration_min instead.
  total_duration_min?:          number | null;
  performance_score?:           number | null;
  status?:                      string | null;
  workout_session_exercises?:   SessionExercise[];
}

interface PostWorkoutFeedback {
  session_id:      string;
  overall_feeling: number;
  energy_after:    number | null;
  notes:           string | null;
  submitted_at:    string;
}

interface PlanExercise {
  id:                string;
  exercise_name:     string;
  muscle_group?:     string | null;
  sets?:             number | null;
  reps?:             number | null;
  duration_seconds?: number | null;
  load_kg?:          number | null;
  rest_seconds?:     number | null;
  notes?:            string | null;
  order_index?:      number | null;
}

interface WorkoutPlan {
  id:              string;
  status:          string | null;
  autonomous_origin?: string | null;
  coach_dna_applied?: boolean;
  scheduled_date?: string | null;
  created_at:      string | null;
  trainer_notes?:  string | null;
  plan_exercises?: PlanExercise[];
}

interface ProfileV2Row {
  basic_data:          Record<string, unknown> | null;
  objectives:          Record<string, unknown> | null;
  movement_history:    Record<string, unknown> | null;
  functional_capacity: Record<string, unknown> | null;
  environment:         Record<string, unknown> | null;
  availability:        Record<string, unknown> | null;
  preferences:         Record<string, unknown> | null;
  habits:              Record<string, unknown> | null;
  comorbidities:       Record<string, unknown> | null;
  declared_health:     Record<string, unknown> | null;
  sensitive_factors:   Record<string, unknown> | null;
  body_rhythm:         Record<string, unknown> | null;
  consent:             ConsentMatrix | null;
  completed_at:        string | null;
}

interface TrainerDashboardUser {
  id:    string;
  name?: string;
  email?: string;
}

interface AccessGrant {
  id:       string;
  category: string;
  status:   string;
}

interface CheckInReadiness {
  id:                string;
  occurred_at:       string | null;
  readiness_score:   number | null;
  energy_level:      number | null;
  fatigue_level:     number | null;
  pain_present:      boolean | null;
  pain_intensity:    number | null;
  sleep_quality:     string | null;
  available_minutes: number | null;
  training_location: string | null;
  input_source:      string | null;
  variant:           string;
  quick_data:        Record<string, unknown> | null;
  detailed_data:     Record<string, unknown> | null;
}

interface TrainerClientDetailScreenProps {
  nav:             NavFn;
  user:            TrainerDashboardUser | null;
  selectedClient?: ClientProfile | null;
  dashboardLimit?: number;
}

// Readiness/energy 3-tier scale (good/moderate/low) — repeated across the
// readiness chart, its legend, and the per-checkin readiness label. `t.accent`
// is the brand "low" tone (coral); '#4ade80'/'#F5A623' are the matching
// good/moderate tones without brand-token equivalents.
// Read-only trainer view of the student's own post-workout self-evaluation.
// "quem executou avalia" — trainer never edits this, only sees it (parity with HistoryScreen → PostWorkoutSummaryScreen).
const renderPostWorkoutFeedback = (
  session: { status?: string | null; completed_at?: string | null },
  feedback: PostWorkoutFeedback | undefined,
  dark: boolean,
  tr: (key: string) => string,
): React.ReactNode => {
  const isDone = session.status === 'completed' || !!session.completed_at;
  if (!isDone) return null;
  if (!feedback) {
    return (
      <div style={{ fontSize: 10.5, color: textMute(dark), marginTop: 3, fontStyle: 'italic' }}>
        {tr('trainer.detail.notYetEvaluated')}
      </div>
    );
  }
  const truncatedNotes = feedback.notes && feedback.notes.length > 60
    ? `${feedback.notes.slice(0, 60)}…`
    : feedback.notes;
  return (
    <div style={{ fontSize: 10.5, color: textSec(dark), marginTop: 3 }}>
      {tr('trainer.detail.postWorkoutFeedback')}: {'⭐'.repeat(Math.max(0, Math.min(5, feedback.overall_feeling)))}
      {feedback.energy_after != null ? ` · ${tr('trainer.detail.energyAfter')} ${feedback.energy_after}/10` : ''}
      {truncatedNotes ? <span style={{ color: textMute(dark), fontStyle: 'italic' }}> — "{truncatedNotes}"</span> : null}
    </div>
  );
};

const tierColor = (value: number, t: { accent: string }): string =>
  value >= 70 ? '#4ade80' : value >= 40 ? '#F5A623' : t.accent;

export function TrainerClientDetailScreen({
  nav,
  user,
  selectedClient,
  dashboardLimit = 10,
}: TrainerClientDetailScreenProps) {
  const { t, dark } = useTrainerTheme();
  const { t: tr } = useTranslation();
  const [sessions, setSessions]     = React.useState<WorkoutSession[]>([]);
  const [plans, setPlans]           = React.useState<WorkoutPlan[]>([]);
  const [profileV2, setProfileV2]   = React.useState<ProfileV2Row | null>(null);
  const [readiness, setReadiness]   = React.useState<CheckInReadiness[]>([]);
  const [decisions, setDecisions]   = React.useState<ReadinessDecision[]>([]);
  const [grants, setGrants]         = React.useState<Map<string, AccessGrant>>(new Map());
  const [loading, setLoading]       = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [expandedPlan, setExpandedPlan] = React.useState<string | null>(null);
  const [feedbackBySession, setFeedbackBySession] = React.useState<Record<string, PostWorkoutFeedback>>({});
  const loggedViewsRef = React.useRef<Set<string>>(new Set());

  const clientId = selectedClient?.id;

  const load = React.useCallback(async (showSpinner = true) => {
    if (!clientId) return;
    if (showSpinner) setLoading(true);
    await autoExpirePlans(clientId, 'trainer');
    const [sessionsRes, plansRes, profV2Res, readinessRes, decisionsRes, feedbackRes, grantsRes] = await Promise.all([
      supabase.from('workout_sessions').select('id,plan_id,started_at,completed_at,total_duration_min,performance_score,status,workout_session_exercises(id,exercise_name,muscle_group,sets_prescribed,reps_prescribed,load_kg_prescribed,rest_seconds,notes,status,order_index,workout_set_logs(set_number,reps_done,load_kg,rpe))').eq('user_id', clientId).order('started_at', { ascending: false }).limit(dashboardLimit),
      supabase.from('workout_plans').select('id,status,scheduled_date,created_at,trainer_notes,autonomous_origin,coach_dna_applied,plan_exercises(id,exercise_name,muscle_group,sets,reps,duration_seconds,load_kg,rest_seconds,notes,order_index)').eq('assigned_to', clientId).order('created_at', { ascending: false }).limit(dashboardLimit),
      supabase.from('profile_v2').select('basic_data,objectives,movement_history,functional_capacity,environment,availability,preferences,habits,comorbidities,declared_health,sensitive_factors,body_rhythm,consent,completed_at').eq('user_id', clientId).maybeSingle(),
      supabase.from('checkin_prontidao').select('id,occurred_at,readiness_score,energy_level,fatigue_level,pain_present,pain_intensity,sleep_quality,available_minutes,training_location,input_source,variant,quick_data,detailed_data').eq('user_id', clientId).order('occurred_at', { ascending: false }).limit(7),
      // C — trainer's past approve/reject decisions for this client (RLS scopes to_user_id = this trainer)
      supabase.from('notification_log').select('id,response,response_at,created_at,body').eq('from_user_id', clientId).eq('type', 'workout_ready').not('response', 'is', null).order('response_at', { ascending: false }).limit(8),
      // Read-only: student's own post-workout self-evaluations (trainer never edits — "quem executou avalia")
      supabase.from('post_workout_feedback').select('session_id,overall_feeling,energy_after,notes,submitted_at').eq('user_id', clientId).order('submitted_at', { ascending: false }),
      // Phase 4 — latest access-grant request per category, for "authorized_only" categories
      supabase.from('profile_access_grants').select('id,category,status').eq('client_id', clientId).eq('trainer_id', user?.id ?? '').order('requested_at', { ascending: false }),
    ]);
    setSessions(sessionsRes.data || []);
    setPlans(plansRes.data || []);
    setProfileV2(profV2Res.data as unknown as ProfileV2Row | null);
    setReadiness((readinessRes.data || []) as CheckInReadiness[]);
    setDecisions((decisionsRes.data || []) as ReadinessDecision[]);
    const feedbackMap: Record<string, PostWorkoutFeedback> = {};
    for (const f of (feedbackRes.data || []) as PostWorkoutFeedback[]) {
      if (!feedbackMap[f.session_id]) feedbackMap[f.session_id] = f;
    }
    setFeedbackBySession(feedbackMap);
    const grantsMap = new Map<string, AccessGrant>();
    for (const g of (grantsRes.data || []) as AccessGrant[]) {
      if (!grantsMap.has(g.category)) grantsMap.set(g.category, g);
    }
    setGrants(grantsMap);
    setLastUpdated(new Date());
    setLoading(false);
  }, [clientId, user?.id, dashboardLimit]);

  // Initial load + Realtime: client check-ins and sessions update the screen live
  React.useEffect(() => {
    if (!clientId) return;
    void load();

    const channel = supabase
      .channel(`client-detail:${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkin_prontidao', filter: `user_id=eq.${clientId}` }, () => void load(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_sessions',  filter: `user_id=eq.${clientId}` }, () => void load(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_plans',      filter: `assigned_to=eq.${clientId}` }, () => void load(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_workout_feedback', filter: `user_id=eq.${clientId}` }, () => void load(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_access_grants', filter: `client_id=eq.${clientId}` }, () => void load(false))
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [clientId, load]);

  // Phase 4 — when maintain_access_log is on, count each view of a granted category once per mount.
  React.useEffect(() => {
    if (!profileV2?.consent?.maintain_access_log) return;
    for (const [category, grant] of grants.entries()) {
      if (grant.status !== 'granted') continue;
      if (loggedViewsRef.current.has(grant.id)) continue;
      if (profileV2.consent?.personal?.[category as keyof ConsentCategory] !== 'authorized_only') continue;
      loggedViewsRef.current.add(grant.id);
      void supabase.rpc('log_profile_access_view', { p_grant_id: grant.id });
    }
  }, [grants, profileV2]);

  if (!selectedClient) {
    return (
      <div style={{ padding: '60px 32px', textAlign: 'center', color: textSec(dark), fontSize: 13 }}>
        {tr('trainer.detail.noClientSelected')}
        <button
          onClick={() => nav('trainerDashboard')}
          style={{ ...ghostBtn(dark), display: 'block', margin: '16px auto 0' }}
        >
          {tr('trainer.detail.backBtn')}
        </button>
      </div>
    );
  }


  const fmtKey = (k: string) =>
    tr(`profileFields.${k}`);

  const translateVal = (raw: string): string => {
    const mapped = PROFILE_VALUE_MAP[raw];
    return mapped ? tr(mapped) : raw;
  };

  const fmtVal = (v: unknown, parentKey?: string): string | null => {
    if (v == null || v === '') return null;
    if (typeof v === 'boolean') return v ? tr('profileFields.yes') : tr('profileFields.no');
    if (Array.isArray(v)) {
      if (parentKey === 'preferred_days') {
        const dayLabels = tr('wizard.step12.days', { returnObjects: true }) as unknown as string[];
        const days = v.filter((x): x is number => typeof x === 'number' && x >= 0 && x <= 6);
        const items = [...days].sort((a, b) => a - b).map(d => dayLabels[d] ?? String(d));
        return items.length > 0 ? items.join(', ') : null;
      }
      const items = v.filter(x => x != null && x !== '').map(x => translateVal(String(x)));
      return items.length > 0 ? items.join(', ') : null;
    }
    if (typeof v === 'object') return null;
    const str = String(v);
    if (/^\d+$/.test(str)) return str;
    if (parentKey === 'has_condition') return tr(`profileDisclosure.${str}`);
    return translateVal(str);
  };

  const renderFields = (data: Record<string, unknown> | null) => {
    if (!data) return null;
    const entries = Object.entries(data)
      .filter(([k]) => (k as string).toLowerCase() !== 'preferred_language' && (k as string).toLowerCase() !== 'language')
      .map(([k, v]): [string, string | null] => [k, fmtVal(v, k)])
      .filter((e): e is [string, string] => e[1] != null);
    if (entries.length === 0) return null;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 9, color: textMute(dark), marginBottom: 1 }}>{fmtKey(k)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: textPri(dark) }}>{v}</div>
          </div>
        ))}
      </div>
    );
  };

  const ps = tr('trainer.detail.profileSections', { returnObjects: true }) as Record<string, string | undefined>;

  // Operational sections — not covered by the consent matrix, always visible.
  const ALWAYS_SECTIONS: [string, Record<string, unknown> | null][] = [
    [ps.basic_data   ?? '', profileV2?.basic_data   ?? null],
    [ps.environment  ?? '', profileV2?.environment  ?? null],
    [ps.availability ?? '', profileV2?.availability ?? null],
    [ps.preferences  ?? '', profileV2?.preferences  ?? null],
    [ps.habits       ?? '', profileV2?.habits       ?? null],
  ];

  // Phase 4 — categories with a granted access request elevate authorized_only → full.
  const grantedCategories = new Set<keyof ConsentCategory>(
    [...grants.entries()].filter(([, g]) => g.status === 'granted').map(([cat]) => cat as keyof ConsentCategory)
  );

  // Visual consent matrix (display-only filter for the trainer). The AI keeps
  // full access regardless — gated only by consent.allow_ai_adaptation.
  const consentView = profileV2 ? applyConsentToProfile(profileV2, 'personal', grantedCategories) : null;
  const CONSENT_SECTIONS: [string, CategoryRender, keyof ConsentCategory][] = consentView ? [
    [tr('wizard.step14.rows.training_objective'),           consentView.training_objective,           'training_objective'],
    [tr('wizard.step14.rows.training_history'),             consentView.training_history,             'training_history'],
    [tr('wizard.step14.rows.pain_operational_restriction'), consentView.pain_operational_restriction, 'pain_operational_restriction'],
    [tr('wizard.step14.rows.relevant_comorbidity'),         consentView.relevant_comorbidity,         'relevant_comorbidity'],
    [tr('wizard.step14.rows.sensitive_medication'),         consentView.sensitive_medication,         'sensitive_medication'],
    [tr('wizard.step14.rows.emotional_psychiatric_health'), consentView.emotional_psychiatric_health, 'emotional_psychiatric_health'],
    [tr('wizard.step14.rows.body_rhythm'),                  consentView.body_rhythm,                  'body_rhythm'],
  ] : [];

  // Phase 4 — trainer requests access to an "authorized_only" category.
  const requestAccess = async (categoryKey: keyof ConsentCategory) => {
    if (!clientId || !user?.id) return;
    const { data, error } = await supabase
      .from('profile_access_grants')
      .insert({ client_id: clientId, trainer_id: user.id, category: categoryKey })
      .select('id, category, status')
      .single();
    if (error || !data) { console.error('[TrainerClientDetailScreen] requestAccess error:', error); return; }
    setGrants(prev => new Map(prev).set(categoryKey, data as AccessGrant));
    notify(clientId, '', '', undefined, {
      type: 'access_request', entityType: 'profile_access_grant', entityId: data.id as string,
      templateKey: 'access_request',
      params: { trainerName: user.name?.split(' ')[0] ?? '', category: categoryKey },
    });
  };

  return (
    <>
      <div style={{ padding: '20px 22px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => nav('trainerDashboard')} style={{ ...iconBtn(dark), marginLeft: -4 }}>
          <Icon name="chevL" size={22} color={textPri(dark)} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.primary }}>
            {tr('trainer.detail.clientProfile')}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: textPri(dark), fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
            {selectedClient.name || tr('trainer.detail.clientFallback')}
          </div>
        </div>
        <RefreshChip onRefresh={() => void load()} loading={loading} lastUpdated={lastUpdated} live color={t.primary} dark={dark} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: textMute(dark), fontSize: 13 }}>{tr('trainer.detail.loading')}</div>
      ) : (
        <div style={{ padding: '16px 22px 100px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Identity */}
          <div style={{
            padding: 16, borderRadius: 16,
            background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <AvatarImage url={selectedClient.avatar_url} label={selectedClient.name || '?'} w={52} h={52} radius={16} dark={dark}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: textPri(dark) }}>{selectedClient.name}</div>
              <div style={{
                fontSize: 12, color: textSec(dark), marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>{selectedClient.email}</div>
            </div>
          </div>

          {/* Profile v2 */}
          {profileV2 && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark) }}>
                  {tr('trainer.detail.smartProfileV2')}
                </div>
                {profileV2.completed_at && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                    background: `${t.accent}20`, color: t.accent, letterSpacing: '.04em',
                  }}>
                    {tr('trainer.detail.complete')}
                  </span>
                )}
              </div>

              {/* Operational sections — always visible */}
              {ALWAYS_SECTIONS.map(([label, data]) => {
                const rendered = renderFields(data);
                if (!rendered) return null;
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: t.primary, marginBottom: 6, letterSpacing: '.04em' }}>
                      {label}
                    </div>
                    {rendered}
                  </div>
                );
              })}

              {/* Visual consent matrix (personal) — full / summary / locked / hidden per category */}
              {CONSENT_SECTIONS.map(([label, cat, categoryKey]) => {
                if (cat.mode === 'hidden') return null;
                if (cat.mode === 'locked') {
                  const pending = grants.get(categoryKey)?.status === 'pending';
                  return (
                    <div key={label} style={{
                      marginBottom: 10, padding: '8px 12px', borderRadius: 10,
                      background: DARK.surface, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontSize: 13 }}>🔒</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: textSec(dark) }}>{label}</div>
                        <div style={{ fontSize: 11, color: textMute(dark) }}>
                          {pending ? tr('trainer.detail.requestPending') : tr('trainer.detail.consentLocked')}
                        </div>
                      </div>
                      {!pending && (
                        <button onClick={() => void requestAccess(categoryKey)} style={{ ...ghostBtn(dark), fontSize: 10, padding: '5px 10px', flexShrink: 0 }}>
                          {tr('trainer.detail.requestAccess')}
                        </button>
                      )}
                    </div>
                  );
                }
                const rendered = renderFields(cat.data);
                if (!rendered) return null;
                return (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: t.primary, marginBottom: 6, letterSpacing: '.04em' }}>
                      {label}
                    </div>
                    {rendered}
                    {cat.mode === 'summary' && (
                      <div style={{ fontSize: 9.5, color: textMute(dark), marginTop: 4, fontStyle: 'italic' }}>
                        {tr('trainer.detail.consentSummaryNote')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Readiness trend */}
          {readiness.length > 0 && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 12 }}>
                {tr('trainer.detail.readinessLast', { n: readiness.length })}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                {[...readiness].reverse().map((r) => {
                  const score     = r.readiness_score ?? 0;
                  const barColor  = tierColor(score, t);
                  const energyColor = r.energy_level != null
                    ? tierColor(r.energy_level * 10, t)
                    : null;
                  return (
                    <div key={r.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      {/* Pain indicator */}
                      <div style={{ height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {r.pain_present && (
                          <span style={{ fontSize: 8, color: t.accent }}>●</span>
                        )}
                      </div>
                      {/* Readiness score */}
                      <div style={{ fontSize: 9, fontWeight: 700, color: barColor }}>{score}</div>
                      {/* Bar */}
                      <div style={{
                        width: '100%', borderRadius: 4,
                        height: `${Math.max(6, (score / 100) * 44)}px`,
                        background: barColor, opacity: 0.85,
                      }} />
                      {/* Energy dot */}
                      {energyColor && (
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: energyColor, marginTop: 1,
                        }} />
                      )}
                      {/* Date */}
                      <div style={{ fontSize: 8, color: textMute(dark), textAlign: 'center' }}>
                        {r.occurred_at
                          ? new Date(r.occurred_at).toLocaleDateString(i18n.language || 'en-US', { day: '2-digit', month: '2-digit' })
                          : '—'}
                      </div>
                      {/* Voice badge */}
                      {r.input_source === 'voice' && (
                        <div style={{ fontSize: 7, color: t.primary, fontWeight: 700 }}>{tr('trainer.detail.voz')}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  { color: t.accent, dot: true, label: tr('trainer.detail.painReported') },
                  { color: '#4ade80', label: tr('trainer.detail.highEnergy') },
                  { color: '#F5A623', label: tr('trainer.detail.moderateEnergy') },
                  { color: t.accent, label: tr('trainer.detail.lowEnergy') },
                ].map(({ color, dot, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {dot
                      ? <span style={{ fontSize: 9, color }}>●</span>
                      : <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }}/>
                    }
                    <span style={{ fontSize: 9, color: textMute(dark) }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C — Readiness decisions log (trainer's past approve/reject for this client) */}
          {decisions.length > 0 && (
            <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
                {tr('trainer.detail.readinessDecisions')}
              </div>
              {decisions.map((d, i) => {
                const approved = d.response === 'approved';
                const color    = approved ? '#4ade80' : t.accent;
                const when     = d.response_at ?? d.created_at;
                return (
                  <div key={d.id} style={{
                    padding: '9px 0', display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: i < decisions.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name={approved ? 'check' : 'close'} size={13} color={color} stroke={2.6} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color }}>{approved ? tr('trainer.detail.approved') : tr('trainer.detail.rejected')}</span>
                      <span style={{ fontSize: 11, color: textMute(dark), marginLeft: 8 }}>
                        {when ? new Date(when).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Check-ins (checkin_prontidao) */}
          <div style={{ padding: 16, borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
              {tr('trainer.detail.recentCheckins')}
            </div>
            {readiness.length === 0 ? (
              <div style={{ color: textMute(dark), fontSize: 12 }}>{tr('trainer.detail.noCheckins')}</div>
            ) : readiness.map((r, i) => {
              const p = parseCheckinData(r);
              return (
                <div key={r.id} style={{
                  padding: '10px 0',
                  borderBottom: i < readiness.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
                  display: 'flex', gap: 12,
                }}>
                  <div style={{ fontSize: 10, color: textMute(dark), minWidth: 72, paddingTop: 2 }}>
                    {r.occurred_at ? new Date(r.occurred_at).toLocaleDateString(i18n.language || 'en-US', { day: '2-digit', month: '2-digit' }) : '—'}
                    {r.input_source === 'voice' && (
                      <div style={{ color: t.primary, fontWeight: 700, fontSize: 9, marginTop: 2 }}>{tr('trainer.detail.voz')}</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    {/* Row 1 — scores */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {p.energy != null && (
                        <span style={{ fontSize: 12, color: textSec(dark) }}>
                          {tr('trainer.detail.energyLabel')}<span style={{ fontWeight: 700, color: t.primary }}>{p.energy}/10</span>
                        </span>
                      )}
                      {p.fatigue != null && (
                        <span style={{ fontSize: 12, color: textSec(dark) }}>
                          {tr('trainer.detail.fatigueLabel')}<span style={{ fontWeight: 700, color: p.fatigue >= 7 ? t.accent : textPri(dark) }}>{p.fatigue}/10</span>
                          {p.fatigue_type && <span style={{ color: textMute(dark) }}> ({p.fatigue_type})</span>}
                        </span>
                      )}
                      {p.readiness_score != null && (
                        <span style={{ fontSize: 12, color: textSec(dark) }}>
                          {tr('trainer.detail.readinessLabel')}<span style={{ fontWeight: 700, color: tierColor(p.readiness_score, t) }}>{p.readiness_score}</span>
                        </span>
                      )}
                    </div>
                    {/* Row 2 — pain, sleep, time, location */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      {p.pain_present && (
                        <span style={{ fontSize: 12, color: t.accent, fontWeight: 600 }}>
                          {tr('trainer.detail.painReportedLabel')}
                          {p.pain_region && ` · ${p.pain_region}`}
                          {p.pain_intensity != null && ` · ${p.pain_intensity}/10`}
                        </span>
                      )}
                      {p.sleep_quality && (
                        <span style={{ fontSize: 12, color: textSec(dark) }}>
                          {tr('trainer.detail.sleepLabel')}{p.sleep_quality}
                          {p.sleep_hours != null && ` · ${p.sleep_hours}h`}
                        </span>
                      )}
                      {p.available_minutes != null && (
                        <span style={{ fontSize: 12, color: textSec(dark) }}>{p.available_minutes} min</span>
                      )}
                      {p.location_today && (
                        <span style={{ fontSize: 12, color: textSec(dark) }}>{p.location_today}</span>
                      )}
                    </div>
                    {/* Row 3 — emotion, adaptation, equipment (detailed only) */}
                    {(p.emotional_state || p.adaptation_preference || p.equipment_today?.length) && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                        {p.emotional_state && (
                          <span style={{ fontSize: 11, color: textMute(dark) }}>{p.emotional_state}</span>
                        )}
                        {p.adaptation_preference && (
                          <span style={{ fontSize: 11, color: textMute(dark) }}>{p.adaptation_preference}</span>
                        )}
                        {p.equipment_today?.length ? (
                          <span style={{ fontSize: 11, color: textMute(dark) }}>{p.equipment_today.join(', ')}</span>
                        ) : null}
                      </div>
                    )}
                    {/* Row 4 — warning signs (highlighted) */}
                    {p.safety_signals && p.safety_signals.length > 0 && (
                      <div style={{
                        marginTop: 6, padding: '4px 8px', borderRadius: 6,
                        background: `${t.accent}18`, border: `1px solid ${t.accent}44`,
                        fontSize: 11, color: t.accent, fontWeight: 600,
                      }}>
                        ⚠ {p.safety_signals.join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plan & Workout — unified timeline */}
          {(() => {
            const freeSessions = sessions.filter(s => !s.plan_id);

            const unifiedStatus = (p: WorkoutPlan, s: WorkoutSession | null): { label: string; color: string } => {
              if (s) {
                if (s.status === 'completed' || s.completed_at) return { label: tr('trainer.detail.sessionStatus.done'),       color: t.liveAction };
                if (s.status === 'active')                       return { label: tr('trainer.detail.sessionStatus.inProgress'), color: t.primary };
                if (s.status === 'abandoned')                    return { label: tr('trainer.detail.sessionStatus.abandoned'), color: '#F5A623' };
              }
              if (p.status === 'completed') return { label: tr('trainer.detail.sessionStatus.done'),       color: t.liveAction };
              if (p.status === 'active')    return { label: tr('trainer.detail.sessionStatus.inProgress'), color: t.primary };
              if (p.status === 'postponed') return { label: tr('trainer.detail.sessionStatus.postponed'),  color: t.amber };
              if (p.status === 'cancelled') return { label: tr('trainer.detail.sessionStatus.cancelled'),  color: t.criticalRed };
              return { label: tr('trainer.detail.sessionStatus.sent'), color: t.primary };
            };

            const renderSessionExercises = (exs: SessionExercise[], sessionColor: string) =>
              exs.map((ex, ei) => {
                const skipped   = ex.status === 'skipped';
                const completed = ex.status === 'completed';
                const exColor  = skipped ? textMute(dark) : textPri(dark);
                const numColor = skipped ? textMute(dark) : completed ? t.liveAction : sessionColor;
                return (
                  <div key={ex.id} style={{
                    padding: '8px 12px', borderRadius: 10, marginBottom: 6,
                    background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                    opacity: skipped ? 0.55 : 1,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: `${numColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: numColor,
                    }}>{ei + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: exColor }}>
                        {ex.exercise_name}
                        {skipped   && <span style={{ fontSize: 10, marginLeft: 6, color: textMute(dark) }}>{tr('trainer.detail.skipped')}</span>}
                        {completed && <span style={{ fontSize: 10, marginLeft: 6, color: t.liveAction }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 11, color: textSec(dark), marginTop: 1 }}>
                        {[
                          ex.sets_prescribed    ? `${ex.sets_prescribed} ${tr('trainer.detail.unitSets')}`    : null,
                          ex.reps_prescribed    ? `${ex.reps_prescribed} ${tr('trainer.detail.unitReps')}`    : null,
                          ex.load_kg_prescribed ? `${ex.load_kg_prescribed} ${tr('trainer.detail.unitKg')}`   : null,
                          ex.rest_seconds       ? `${ex.rest_seconds}${tr('trainer.detail.unitRest')}`      : null,
                        ].filter(Boolean).join(' · ')}
                        {ex.muscle_group ? ` — ${ex.muscle_group}` : ''}
                      </div>
                      {ex.notes && (
                        <div style={{ fontSize: 10.5, color: textMute(dark), marginTop: 2, fontStyle: 'italic' }}>{ex.notes}</div>
                      )}
                      {(ex.workout_set_logs?.length ?? 0) > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {[...(ex.workout_set_logs ?? [])].sort((a, b) => a.set_number - b.set_number).map(log => (
                            <div key={log.set_number} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: textSec(dark) }}>
                              <span style={{ fontWeight: 700, color: numColor, minWidth: 28 }}>S{log.set_number}</span>
                              {log.reps_done != null && (
                                <span>
                                  <b style={{ color: textPri(dark) }}>{log.reps_done}</b>
                                  {ex.reps_prescribed != null && log.reps_done !== ex.reps_prescribed && (
                                    <span style={{ color: textMute(dark) }}>/{ex.reps_prescribed}</span>
                                  )} {tr('trainer.detail.unitReps')}
                                </span>
                              )}
                              {log.load_kg != null && (
                                <span>
                                  <b style={{ color: textPri(dark) }}>{log.load_kg}</b>
                                  {ex.load_kg_prescribed != null && log.load_kg !== ex.load_kg_prescribed && (
                                    <span style={{ color: textMute(dark) }}>/{ex.load_kg_prescribed}</span>
                                  )} {tr('trainer.detail.unitKg')}
                                </span>
                              )}
                              {log.rpe != null && <span style={{ color: textMute(dark) }}>RPE {log.rpe}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              });

            return (
              <>
                {/* Plan-linked cards */}
                <div style={{ borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark) }}>
                    {tr('trainer.detail.planAndWorkout')}
                  </div>
                  {plans.length === 0 ? (
                    <div style={{ padding: '0 16px 14px', color: textMute(dark), fontSize: 12 }}>{tr('trainer.detail.noPlans')}</div>
                  ) : plans.map((p, i) => {
                    const linkedSessions = sessions
                      .filter(s => s.plan_id === p.id)
                      .sort((a, b) => new Date(b.started_at ?? b.created_at ?? '').getTime() - new Date(a.started_at ?? a.created_at ?? '').getTime());
                    const session  = linkedSessions[0] ?? null;
                    const { label: stLabel, color: stColor } = unifiedStatus(p, session);
                    const open     = expandedPlan === p.id;

                    const dateLabel = session?.started_at
                      ? new Date(session.started_at).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : p.scheduled_date
                      ? new Date(p.scheduled_date).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : p.created_at ? new Date(p.created_at).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

                    const sessionExs = session
                      ? [...(session.workout_session_exercises ?? [])].sort((a, b) => a.order_index - b.order_index)
                      : null;
                    const planExs = [...(p.plan_exercises ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                    const exCount  = sessionExs ? sessionExs.length : planExs.length;
                    const autonomousLabel = p.autonomous_origin
                      ? p.coach_dna_applied
                        ? tr('trainer.detail.autonomousCoachDna')
                        : tr('trainer.detail.autonomousAi')
                      : null;

                    return (
                      <div key={p.id} style={{ borderTop: i > 0 ? `1px solid ${borderSubtle(dark)}` : undefined }}>
                        <button
                          onClick={() => setExpandedPlan(open ? null : p.id)}
                          style={{
                            width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center',
                            gap: 10, background: 'transparent', border: 'none', cursor: 'pointer',
                            textAlign: 'left', fontFamily: 'inherit',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: textPri(dark) }}>{dateLabel}</div>
                            <div style={{ fontSize: 11, color: textSec(dark), marginTop: 1 }}>
                              {exCount} exercise{exCount !== 1 ? 's' : ''}
                              {session?.total_duration_min ? ` · ${session.total_duration_min} min` : ''}
                              {session?.performance_score != null ? ` · score ${session.performance_score}%` : ''}
                              {!session && p.trainer_notes ? ` · ${p.trainer_notes.slice(0, 30)}${p.trainer_notes.length > 30 ? '…' : ''}` : ''}
                              {linkedSessions.length > 1 ? ` · ${linkedSessions.length} sessions` : ''}
                            </div>
                            {autonomousLabel && (
                              <div style={{ fontSize: 10.5, color: p.coach_dna_applied ? t.primary : textMute(dark), marginTop: 3, fontWeight: 650 }}>
                                {autonomousLabel}
                              </div>
                            )}
                            {session && renderPostWorkoutFeedback(session, feedbackBySession[session.id], dark, tr)}
                          </div>
                          <span style={{
                            padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                            background: `${stColor}22`, color: stColor, letterSpacing: '.04em', textTransform: 'uppercase',
                            flexShrink: 0,
                          }}>{stLabel}</span>
                          <span style={{ fontSize: 11, color: textMute(dark), flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                        </button>

                        {open && (
                          <div style={{ padding: '0 16px 14px', background: 'var(--sunken)' }}>
                            {sessionExs ? (
                              sessionExs.length === 0
                                ? <div style={{ fontSize: 11, color: textMute(dark) }}>{tr('trainer.detail.noExerciseData')}</div>
                                : renderSessionExercises(sessionExs, stColor)
                            ) : (
                              planExs.length === 0
                                ? <div style={{ fontSize: 11, color: textMute(dark) }}>{tr('trainer.detail.noExercises')}</div>
                                : planExs.map((ex, ei) => (
                                  <div key={ex.id} style={{
                                    padding: '8px 12px', borderRadius: 10, marginBottom: 6,
                                    background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
                                    display: 'flex', alignItems: 'center', gap: 10,
                                  }}>
                                    <div style={{
                                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                      background: `${t.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 10, fontWeight: 700, color: t.primary,
                                    }}>{ei + 1}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12.5, fontWeight: 700, color: textPri(dark) }}>{ex.exercise_name}</div>
                                      <div style={{ fontSize: 11, color: textSec(dark), marginTop: 1 }}>
                                        {[
                                          ex.sets       ? `${ex.sets} ${tr('trainer.detail.unitSets')}`             : null,
                                          ex.reps       ? `${ex.reps} ${tr('trainer.detail.unitReps')}`
                                            : ex.duration_seconds ? tr('common.units.holdSec', { seconds: ex.duration_seconds })
                                            : null,
                                          ex.load_kg    ? `${ex.load_kg} ${tr('trainer.detail.unitKg')}`            : null,
                                          ex.rest_seconds ? `${ex.rest_seconds}${tr('trainer.detail.unitRest')}`  : null,
                                        ].filter(Boolean).join(' · ')}
                                        {ex.muscle_group ? ` — ${ex.muscle_group}` : ''}
                                      </div>
                                      {ex.notes && (
                                        <div style={{ fontSize: 10.5, color: textMute(dark), marginTop: 2, fontStyle: 'italic' }}>{ex.notes}</div>
                                      )}
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Free sessions (no plan) */}
                {freeSessions.length > 0 && (
                  <div style={{ borderRadius: 16, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark) }}>
                      {tr('trainer.detail.freeSessions')}
                    </div>
                    {freeSessions.map((s, i) => {
                      const open = expandedPlan === s.id;
                      const exs  = [...(s.workout_session_exercises ?? [])].sort((a, b) => a.order_index - b.order_index);
                      const date = new Date(s.started_at || s.created_at || '').toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const isDone = s.status === 'completed' || !!s.completed_at;
                      const sc   = isDone ? t.liveAction : t.primary;
                      const slabel = isDone ? tr('trainer.detail.done') : (s.status ?? '—').toUpperCase();
                      return (
                        <div key={s.id} style={{ borderTop: i > 0 ? `1px solid ${borderSubtle(dark)}` : undefined }}>
                          <button
                            onClick={() => setExpandedPlan(open ? null : s.id)}
                            style={{
                              width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center',
                              gap: 10, background: 'transparent', border: 'none', cursor: 'pointer',
                              textAlign: 'left', fontFamily: 'inherit',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: textPri(dark) }}>{date}</div>
                              <div style={{ fontSize: 11, color: textSec(dark), marginTop: 1 }}>
                                {exs.length > 0 ? `${exs.length} exercise${exs.length !== 1 ? 's' : ''}` : 'No exercise data'}
                                {s.total_duration_min ? ` · ${s.total_duration_min} min` : ''}
                              </div>
                              {renderPostWorkoutFeedback(s, feedbackBySession[s.id], dark, tr)}
                            </div>
                            <span style={{
                              padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                              background: `${sc}22`, color: sc, letterSpacing: '.04em', textTransform: 'uppercase', flexShrink: 0,
                            }}>{slabel}</span>
                            <span style={{ fontSize: 11, color: textMute(dark), flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                          </button>
                          {open && (
                            <div style={{ padding: '0 16px 14px', background: 'var(--sunken)' }}>
                              {exs.length === 0
                                ? <div style={{ fontSize: 11, color: textMute(dark) }}>{tr('trainer.detail.noExerciseData')}</div>
                                : renderSessionExercises(exs, sc)
                              }
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Sticky create-plan CTA */}
      <div style={{
        position: 'sticky', bottom: 0,
        padding: '12px 22px calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'color-mix(in srgb, var(--bg) 95%, transparent)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${borderSubtle(dark)}`,
      }}>
        {/* Check-in CTA */}
      {selectedClient && (
        <button onClick={() => nav('checkin', { clientUserId: selectedClient.id, clientName: selectedClient.name })} style={{
          width: '100%', padding: '12px 0', borderRadius: 14, marginBottom: 8,
          background: 'transparent', border: `1.5px solid ${t.accent}55`, color: t.accent,
          fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="sparkle" size={14} color={t.accent}/> {tr('trainer.detail.readinessCheckinFor', { name: selectedClient.name?.split(' ')[0] || 'client' })}
        </button>
      )}
      <button onClick={() => nav('workoutPlanEditor')} style={{
          width: '100%', padding: '14px 0', borderRadius: 14,
          background: t.accent, color: '#FFFFFF',
          border: 'none', fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
        {tr('trainer.detail.createPlan', { name: selectedClient.name?.split(' ')[0] || tr('trainer.detail.clientFallback') })}
      </button>
      </div>
    </>
  );
}
