import React from 'react';
import { supabase } from '../../supabase';
import { Icon, AvatarImage, ScreenTitle, SectionLabel } from '../../components';
import { borderSubtle, textPri, textSec, primaryBtn } from '../../theme';
import type { NavFn, CheckIn } from '../../types';
import type { Json } from '../../types/supabase';
import { requestSmartWorkout, requestWorkoutPlan } from '../../lib/workoutGeneration';
import type { CycleContext, GeneratedWorkoutExercise } from '../../lib/workoutGeneration';
import { buildClientContext, buildTodayContext, buildLibraryContext } from '../../ai/buildAIContext';
import type { TrainerContext, TaskContext } from '../../ai/types';
import { computeCyclePhases } from './CycleScreen';
import { autoExpirePlans }   from '../../lib/autoExpirePlans';
import { notify }            from '../../lib/notify';

// Default AI trainer used when client has no linked trainer
const DEFAULT_AI_TRAINER: TrainerContext = {
  id: 'ai-coach', name: 'AI Coach', archetype: 'performance',
  coachingStyles: ['functional', 'science_based'], coreValues: ['safety', 'progression'],
  coachVoice: 'Encouraging and evidence-based', motto: 'Train smart, progress safely',
  methods: ['compound_movements', 'periodization'], environments: ['gym', 'home', 'outdoor'],
  intensity: 'moderate', focus: { strength:5, endurance:5, mobility:5, athletic:4, coord:3, balance:3 },
  preferredFormats: ['circuit', 'straight_sets'], intensityCurve: 'pyramid',
  sessionOrder: ['warmup', 'main', 'cooldown'], communicationTone: ['encouraging', 'clear'],
  clientProfiles: ['general_population'], favoriteExercises: [], avoidExercises: [],
};

interface Theme {
  primary:     string;
  primarySoft: string;
  accent:      string;
}

interface AppUser {
  id:         string | null;
  name:       string;
  email:      string;
  role:       string;
  avatar_url: string | null;
  gender?:    string;
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
}

export function StartWorkoutScreen({ nav, t, dark, checkin, user, cycleConfig, linkedTrainerId = '' }: StartWorkoutScreenProps) {
  const [plan,       setPlan]       = React.useState<Exercise[] | null>(null);  // AI-generated plan only
  const [planId,     setPlanId]     = React.useState<string | null>(null);
  const [planSource, setPlanSource] = React.useState<string | null>(null);
  const [trainerName,      setTrainerName]      = React.useState<string | null>(null);
  const [trainerAvatarUrl, setTrainerAvatarUrl] = React.useState<string | null>(null);
  const [cycleCtx,   setCycleCtx]   = React.useState<CycleContext | null>(null);
  const [latestCheckin, setLatestCheckin] = React.useState<CheckIn | null>(null);
  const [loading,    setLoading]    = React.useState<boolean>(false);
  const [error,      setError]      = React.useState<string | null>(null);
  const [safetyBlocked,  setSafetyBlocked]  = React.useState(false);
  const [safetyTitle,    setSafetyTitle]    = React.useState<string | null>(null);
  const [safetyMessage,  setSafetyMessage]  = React.useState<string | null>(null);
  const [readinessScore, setReadinessScore] = React.useState<number | null>(null);
  const [adaptations,    setAdaptations]    = React.useState<string[]>([]);
  interface PlanCard {
    id:        string;
    sentAt:    string | null;
    status:    string;  // 'sent' | 'active' | 'postponed'
    exercises: Array<{id:string; exercise_name:string; muscle_group?:string|null; sets?:number|null; reps?:number|null; load_kg?:number|null; rest_seconds?:number|null; notes?:string|null; order_index?:number|null}>;
  }
  const [trainerPlans, setTrainerPlans] = React.useState<PlanCard[]>([]);
  const [expandedPlan,  setExpandedPlan] = React.useState<string | null>(null);
  const [newPlanArrived, setNewPlanArrived] = React.useState(false);
  const activeCheckin = latestCheckin ?? checkin;
  const hasTrainerPlans = trainerPlans.length > 0;

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
      const { data: planRow, error: planError } = await supabase
        .from('workout_plans')
        .insert({
          assigned_to: user.id,
          created_by:  user.id,
          source:      'ai_generated',
          status:      'active',
          ai_notes:    cycleContext ? `Phase: ${cycleContext.phase}, Day ${cycleContext.day}/${cycleContext.cycleLength}` : null,
          scheduled_date: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single();

      if (planError) throw planError;
      if (!planRow?.id) return;

      setPlanId(planRow.id);

      const { error: exercisesError } = await supabase.from('plan_exercises').insert(
        exercises.map((ex, i) => ({
          plan_id:       planRow.id,
          exercise_name: ex.exercise_name,
          muscle_group:  ex.muscle_group,
          sets:          ex.sets,
          reps:          ex.reps,
          load_kg:       ex.load_kg,
          rest_seconds:  ex.rest_seconds,
          notes:         ex.notes ?? null,
          order_index:   i,
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
    } catch (err) {
      console.error('[start-workout] failed to persist generated plan', err);
    }
  }, [user?.id]);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    setPlanId(null);
    setTrainerPlans([]);
    // Auto-cancel stale plans (>10 days); notify trainer
    if (user?.id) void autoExpirePlans(user.id, 'client');
    try {
      let physicalProfile: Json | null = null;
      let resolvedCheckin = checkin;
      if (user?.id) {
        // Load ALL actionable trainer plans (sent / active / postponed) into one unified list.
        // Status is NOT mutated here — a plan only becomes 'active' when the workout actually starts.
        const { data: planRows } = await supabase
          .from('workout_plans')
          .select('id, created_at, created_by, status, plan_exercises(id, exercise_name, muscle_group, sets, reps, load_kg, rest_seconds, notes, order_index)')
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
          const exercises = await requestWorkoutPlan({ checkin: resolvedCheckin, physicalProfile, cycleContext });
          setPlan(exercises);
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

        // 5. TrainerContext — Coach DNA if available, else AI default
        let trainerCtx: TrainerContext = DEFAULT_AI_TRAINER;
        const coachDNA = trainerRes.status === 'fulfilled' ? (trainerRes.value as any).data : null;
        if (coachDNA) {
          const { buildTrainerContext } = await import('../../ai/buildAIContext');
          trainerCtx = buildTrainerContext(coachDNA);
        }

        // 6. LibraryContext
        const libraryCtx = buildLibraryContext({
          excludedRegions:  resolvedCheckin.soreness ?? [],
          clientEquipment:  resolvedCheckin.equipment ?? [],
          trainerFavorites: trainerCtx.favoriteExercises,
          trainerAvoid:     trainerCtx.avoidExercises,
        });

        // 7. TaskContext
        const taskCtx: TaskContext = {
          type: 'generate_workout',
          durationMin: resolvedCheckin.minutes ?? clientCtx.sessionDuration,
        };

        // ── Call smart endpoint ─────────────────────────────────────────────
        const result = await requestSmartWorkout({
          trainer: trainerCtx, client: clientCtx,
          today: todayCtx as any, stats: statsCtx,
          library: libraryCtx, task: taskCtx,
        });

        // Update readiness/safety display
        setReadinessScore(result.readinessScore);
        setAdaptations(result.adaptations);

        if (result.blocked) {
          setSafetyBlocked(true);
          setSafetyTitle(result.safetyTitle ?? 'Safety Gate Active');
          setSafetyMessage(result.safetyMessage ?? 'Your check-in indicates this is not a safe moment for an AI-led session.');
          setLoading(false);
          return;
        }

        setPlan(result.exercises);
        setPlanSource('ai');
        void persistGeneratedPlan(result.exercises, resolvedCheckin, cycleContext, physicalProfile);
      } // end if (user?.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try { await fetchPlan(); } catch { /* caught internally */ }
      if (!cancelled) return;
    };
    void fetch();
    return () => { cancelled = true; };
  }, []);

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

  // ── Unified plan-card actions ────────────────────────────────────────────────
  const STATUS_META: Record<string, { label: string; color: string }> = {
    sent:      { label: 'Sent',       color: t.primary },
    active:    { label: 'Incomplete', color: '#F5A623' },
    postponed: { label: 'Postponed',  color: '#F5B45A' },
  };

  const notifyTrainerAction = (p: PlanCard, kind: 'cancelled' | 'postponed') => {
    if (!user?.id) return;
    void supabase.from('trainer_clients').select('trainer_id').eq('client_id', user.id).eq('status', 'active').maybeSingle()
      .then(({ data: tc }) => {
        if (!tc?.trainer_id) return;
        const planDate = p.sentAt ? new Date(p.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'unknown date';
        const title = kind === 'cancelled' ? 'Plan cancelled by client' : 'Plan postponed by client';
        const body  = `${user.name || 'Your client'} ${kind} the workout plan from ${planDate}.`;
        notify(tc.trainer_id, title, body, undefined, { type: kind === 'cancelled' ? 'plan_cancelled' : 'plan_postponed', entityType: 'workout_plan', entityId: p.id, ...(user.id ? { fromUserId: user.id } : {}) });
      });
  };

  const startPlan = (p: PlanCard) => {
    supabase.from('workout_plans').update({ status: 'active' }).eq('id', p.id).then(({ error }) => { if (error) console.error('[plan start]', error); });
    nav('workoutMode', {
      planId:    p.id,
      exercises: p.exercises.map(ex => ({
        exercise_name: ex.exercise_name,
        muscle_group:  ex.muscle_group  ?? '',
        sets:          ex.sets          ?? null,
        reps:          ex.reps          ?? null,
        load_kg:       ex.load_kg       ?? null,
        rest_seconds:  ex.rest_seconds  ?? null,
        notes:         ex.notes         ?? null,
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
      <ScreenTitle dark={dark}>Start Workout</ScreenTitle>

      {/* Live: new plan arrived from the trainer while on this screen */}
      {newPlanArrived && (
        <div style={{ padding: '0 22px 12px' }}>
          <button
            onClick={() => { setNewPlanArrived(false); void fetchPlan(); }}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: '#10B981', color: '#fff', border: 'none',
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 6px 18px #10B98155',
            }}
          >
            <Icon name="sparkle" size={15} color="#fff" stroke={2.4}/>
            New plan from your trainer — tap to load
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
            label={trainerName ?? 'Trainer'}
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
                {planSource === 'trainer' ? 'Your Trainer' : 'AI Plan'}
              </div>
            </div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: dark ? '#fff' : '#0E1A2B',
              fontFamily: '"Plus Jakarta Sans",sans-serif', letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {planSource === 'trainer' ? "Trainer's Plan" : 'AI-Powered Plan'}
            </div>
            <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,.55)' : 'rgba(14,26,43,.5)', marginTop: 2 }}>
              {hasTrainerPlans ? (
                <>{trainerName ? `by ${trainerName} · ` : ''}{trainerPlans.length} plan{trainerPlans.length !== 1 ? 's' : ''} waiting</>
              ) : (
                <>{activeCheckin.goal} · {activeCheckin.minutes} min · {activeCheckin.location || 'gym'}</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Your Plans — unified trainer-plan list (sent / active / postponed) */}
      {hasTrainerPlans && (
        <div style={{ padding: '0 22px 14px' }}>
          <SectionLabel dark={dark}>Your Plans</SectionLabel>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${t.primary}33` }}>
            {trainerPlans.map((p, i) => {
              const isOpen = expandedPlan === p.id;
              const meta = STATUS_META[p.status] ?? STATUS_META.sent!;
              const dateLabel = p.sentAt
                ? new Date(p.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : 'Plan';
              const startLabel = p.status === 'sent' ? '▶ Start' : '▶ Resume';
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
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: dark ? '#fff' : '#0E1A2B' }}>{dateLabel}</span>
                        <span style={{ fontSize: 11.5, color: dark ? 'rgba(255,255,255,.5)' : '#6b7a90', marginLeft: 8 }}>
                          {p.exercises.length} exercise{p.exercises.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: '.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,.4)' : '#aab' }}>{isOpen ? '▲' : '▼'}</span>
                    </button>

                    <button
                      title="Cancel this plan"
                      onClick={() => setConfirmCancelPlan(p)}
                      style={{
                        flexShrink: 0, padding: '3px 9px', borderRadius: 999,
                        background: '#FF4D4D22', color: '#FF4D4D',
                        border: '1px solid #FF4D4D44', fontSize: 10, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.04em',
                      }}
                    >
                      Cancel
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
                            <div style={{ fontSize: 12, fontWeight: 700, color: dark ? '#fff' : '#0E1A2B' }}>{ex.exercise_name}</div>
                            <div style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,.5)' : '#6b7a90', marginTop: 1 }}>
                              {[
                                ex.sets        ? `${ex.sets} sets`         : null,
                                ex.reps        ? `${ex.reps} reps`         : null,
                                ex.load_kg     ? `${ex.load_kg} kg`        : null,
                                ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
                              ].filter(Boolean).join(' · ')}
                              {ex.muscle_group ? ` — ${ex.muscle_group}` : ''}
                            </div>
                            {ex.notes && <div style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,.35)' : '#9aa', marginTop: 1, fontStyle: 'italic' }}>{ex.notes}</div>}
                          </div>
                        </div>
                      ))}

                      {/* Actions — Postpone only offered while the plan is still 'sent' */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {p.status === 'sent' && (
                          <button
                            onClick={() => postponePlan(p)}
                            style={{
                              flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid #F5B45A55`,
                              background: '#F5B45A18', color: '#F5B45A', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            Postpone
                          </button>
                        )}
                        <button
                          onClick={() => startPlan(p)}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                            background: t.primary, color: '#0E1A2B', fontSize: 12, fontWeight: 700,
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
        <div style={{ margin: '0 22px 16px', padding: '18px 18px', borderRadius: 16, background: '#EF5B3C12', border: '1.5px solid #EF5B3C44' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EF5B3C22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="heart" size={18} color="#EF5B3C" stroke={2.2}/>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#EF5B3C' }}>{safetyTitle}</div>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: textSec(dark), lineHeight: 1.6 }}>{safetyMessage}</p>
          {readinessScore !== null && (
            <div style={{ fontSize: 11, color: '#EF5B3C', fontWeight: 600 }}>
              Readiness score: {readinessScore}/100
            </div>
          )}
        </div>
      )}

      {/* Adaptations banner — shown when smart endpoint provides adjustments */}
      {!safetyBlocked && adaptations.length > 0 && (
        <div style={{ margin: '0 22px 10px', padding: '8px 12px', borderRadius: 10, background: `${t.primary}14`, border: `1px solid ${t.primary}33` }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: t.primary, marginBottom: 4 }}>Session adapted</div>
          {adaptations.map((a, i) => <div key={i} style={{ fontSize: 11.5, color: textSec(dark) }}>· {a}</div>)}
        </div>
      )}

      {/* Today's AI plan — only when no actionable trainer plan exists */}
      {!hasTrainerPlans && (
      <div style={{ padding: '4px 22px 0' }}>
        <SectionLabel dark={dark}>Today&apos;s AI plan</SectionLabel>

        {loading && (
          <div style={{
            padding: '28px 0', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `3px solid ${dark ? '#1F2E45' : '#E5EAF1'}`,
              borderTopColor: t.primary,
              animation: 'spin 0.7s linear infinite',
            }}/>
            <div style={{ fontSize: 13, color: textSec(dark) }}>Generating your plan…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
            }}>Retry</button>
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
                background: '#A78BFA22', border: '1px solid #A78BFA55',
              }}>
                <span style={{ fontSize: 11 }}>🌙</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#A78BFA' }}>
                  {cycleCtx.phase} phase · Day {cycleCtx.day}/{cycleCtx.cycleLength} · Cycle-adapted
                </span>
              </div>
            )}
            {plan.map((ex, i) => (
              <PlanRow
                key={i}
                label={ex.exercise_name}
                detail={[
                  ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : null,
                  ex.load_kg ? `${ex.load_kg} kg` : null,
                  ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
                  ex.muscle_group,
                ].filter(Boolean).join(' · ')}
                t={t} dark={dark}
              />
            ))}
            {sore.length > 0 && (
              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: `${t.accent}1a`, color: t.accent, fontSize: 11.5, fontWeight: 600 }}>
                Adjusted for: {sore.join(', ').toLowerCase()}
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
            onClick={() => nav('workoutMode', { planId, exercises: plan, plannedDurationMin: activeCheckin.minutes ?? undefined })}
            disabled={!plan || loading || safetyBlocked}
            style={{
              ...primaryBtn(t.primary),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: (!plan || loading) ? 0.5 : 1,
            }}
          >
            <Icon name="play" size={14} color="#0E1A2B"/> Start Workout
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
            <div style={{ fontSize: 17, fontWeight: 700, color: dark ? '#fff' : '#0E1A2B', marginBottom: 8, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>
              Cancel this plan?
            </div>
            <div style={{ fontSize: 13, color: textSec(dark), lineHeight: 1.55, marginBottom: 22 }}>
              The plan from{' '}
              <b style={{ color: dark ? '#fff' : '#0E1A2B' }}>
                {confirmCancelPlan.sentAt
                  ? new Date(confirmCancelPlan.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'your trainer'}
              </b>
              {' '}will be cancelled and your trainer will be notified.
              This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmCancelPlan(null)}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 14,
                  background: 'transparent', border: `1.5px solid ${borderSubtle(dark)}`,
                  color: dark ? '#fff' : '#0E1A2B', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Keep it
              </button>
              <button
                onClick={() => { cancelPlan(confirmCancelPlan); setConfirmCancelPlan(null); }}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 14,
                  background: '#FF4D4D', border: 'none',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Yes, cancel
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
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
      borderBottom: `1px dashed ${borderSubtle(dark)}`,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.primary }}/>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: textPri(dark), minWidth: 80 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: textSec(dark), flex: 1 }}>{detail}</div>
    </div>
  );
}
