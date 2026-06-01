import React from 'react';
import { supabase } from '../../supabase';
import { Icon, AvatarImage, PhotoSlot, ScreenTitle, SectionLabel } from '../../components';
import { borderSubtle, textPri, textSec, primaryBtn } from '../../theme';
import type { NavFn, CheckIn } from '../../types';
import type { Json } from '../../types/supabase';
import { requestWorkoutPlan } from '../../lib/workoutGeneration';
import type { CycleContext, GeneratedWorkoutExercise } from '../../lib/workoutGeneration';
import { computeCyclePhases } from './CycleScreen';

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
  nav:          NavFn;
  t:            Theme;
  dark: boolean;
  checkin:      CheckIn;
  user:         AppUser;
  cycleConfig:  AppCycleConfig | null;
}

export function StartWorkoutScreen({ nav, t, dark, checkin, user, cycleConfig }: StartWorkoutScreenProps) {
  const [plan,       setPlan]       = React.useState<Exercise[] | null>(null);
  const [planId,     setPlanId]     = React.useState<string | null>(null);
  const [planSource, setPlanSource] = React.useState<string | null>(null);
  const [trainerName,      setTrainerName]      = React.useState<string | null>(null);
  const [trainerAvatarUrl, setTrainerAvatarUrl] = React.useState<string | null>(null);
  const [planSentAt, setPlanSentAt] = React.useState<string | null>(null);
  const [cycleCtx,   setCycleCtx]   = React.useState<CycleContext | null>(null);
  const [latestCheckin, setLatestCheckin] = React.useState<CheckIn | null>(null);
  const [loading,    setLoading]    = React.useState<boolean>(false);
  const [error,      setError]      = React.useState<string | null>(null);
  interface PendingPlan {
    id:            string;
    sentAt:        string | null;
    status:        string;
    exercises:     Array<{id:string; exercise_name:string; muscle_group?:string|null; sets?:number|null; reps?:number|null; load_kg?:number|null; rest_seconds?:number|null; notes?:string|null; order_index?:number|null}>;
  }
  const [otherPending, setOtherPending] = React.useState<PendingPlan[]>([]);
  const [showPendingList, setShowPendingList] = React.useState(false);
  const [expandedPending, setExpandedPending] = React.useState<string | null>(null);
  const activeCheckin = latestCheckin ?? checkin;

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
    try {
      let physicalProfile: Json | null = null;
      let resolvedCheckin = checkin;
      if (user?.id) {
        // First check for a trainer-sent plan
        const { data: sentPlan } = await supabase
          .from('workout_plans')
          .select('id, created_at, created_by, plan_exercises(id, exercise_name, muscle_group, sets, reps, load_kg, rest_seconds, notes, order_index)')
          .eq('assigned_to', user.id)
          .eq('source', 'manual')
          .eq('status', 'sent')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sentPlan?.plan_exercises?.length) {
          // Use the trainer's plan — do NOT change status yet; only mark active when workout actually starts
          const planExercises = sentPlan.plan_exercises as Array<{
            id: string; exercise_name: string; muscle_group?: string;
            sets?: number; reps?: number; load_kg?: number;
            rest_seconds?: number; notes?: string; order_index?: number;
          }>;
          const sorted = [...planExercises].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
          const exercises = sorted.map(ex => ({
            exercise_name: ex.exercise_name,
            muscle_group:  ex.muscle_group ?? '',
            sets:          ex.sets as number | null ?? null,
            reps:          ex.reps as number | null ?? null,
            load_kg:       ex.load_kg as number | null ?? null,
            rest_seconds:  ex.rest_seconds as number | null ?? null,
            notes:         ex.notes ?? null,
          }));
          setPlan(exercises);
          setPlanId(sentPlan.id);
          setPlanSource('trainer');
          setPlanSentAt(sentPlan.created_at ?? null);

          // Look up trainer name + avatar
          if (sentPlan.created_by) {
            supabase.from('profiles').select('name, avatar_url').eq('id', sentPlan.created_by).maybeSingle()
              .then(({ data: trainerProfile }) => {
                if (trainerProfile?.name) setTrainerName(trainerProfile.name.split(' ')[0] ?? null);
                if (trainerProfile?.avatar_url) setTrainerAvatarUrl(trainerProfile.avatar_url);
              });
          }

          // Load other pending trainer plans (sent or postponed, not the one being shown)
          supabase.from('workout_plans')
            .select('id, created_at, status, plan_exercises(id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,notes,order_index)')
            .eq('assigned_to', user.id)
            .eq('source', 'manual')
            .in('status', ['sent', 'postponed'])
            .neq('id', sentPlan.id)
            .order('created_at', { ascending: false })
            .then(({ data: others }) => {
              if (others?.length) {
                setOtherPending(others.map(p => ({
                  id:        p.id,
                  sentAt:    p.created_at,
                  status:    p.status ?? 'sent',
                  exercises: ([...(p.plan_exercises ?? [])] as PendingPlan['exercises'])
                    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
                })));
              }
            });

          setLoading(false);
          return;
        }
      }
      if (user?.id) {
        const [profileRes, checkinRes] = await Promise.allSettled([
          supabase
            .from('profile_v2')
            .select('objectives, movement_history, environment, availability')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('checkin_prontidao')
            .select('energy_level, sleep_quality, available_minutes, training_location, quick_data')
            .eq('user_id', user.id)
            .order('occurred_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileRes.status === 'fulfilled') {
          if (profileRes.value.error) {
            console.error('[start-workout] failed to load profile_v2', profileRes.value.error);
          } else if (profileRes.value.data) {
            const pv2 = profileRes.value.data as {
              objectives?:       { primary_goal?: string } | null;
              movement_history?: { fitness_level?: string } | null;
              environment?:      { equipment?: string[] }   | null;
              availability?:     { session_duration_min?: number } | null;
            };
            physicalProfile = {
              primary_goal:      pv2.objectives?.primary_goal      ?? null,
              fitness_level:     pv2.movement_history?.fitness_level ?? null,
              available_minutes: pv2.availability?.session_duration_min ?? null,
              equipment:         pv2.environment?.equipment         ?? [],
            } as unknown as Json;
          }
        } else {
          console.error('[start-workout] profile_v2 request crashed', profileRes.reason);
        }

        if (checkinRes.status === 'fulfilled') {
          if (checkinRes.value.error) {
            console.error('[start-workout] failed to load latest check-in', checkinRes.value.error);
          } else if (checkinRes.value.data) {
            const ci  = checkinRes.value.data;
            const qd  = ci.quick_data as { pain?: { present?: boolean; region?: string }; fatigue?: number } | null;
            resolvedCheckin = {
              energy:        ci.energy_level        ?? checkin.energy,
              soreness:      qd?.pain?.present && qd.pain.region ? [qd.pain.region] : checkin.soreness,
              minutes:       ci.available_minutes   ?? checkin.minutes,
              goal:          checkin.goal,
              location:      (ci.training_location  ?? checkin.location) as typeof checkin.location,
              sleep_quality: (ci.sleep_quality      ?? checkin.sleep_quality) as typeof checkin.sleep_quality,
              equipment:     checkin.equipment,
            };
          }
        } else {
          console.error('[start-workout] latest check-in request crashed', checkinRes.reason);
        }
      }

      setLatestCheckin(resolvedCheckin);

      const cycleContext = getCycleContext();
      setCycleCtx(cycleContext);
      const exercises = await requestWorkoutPlan({
        checkin: resolvedCheckin,
        physicalProfile,
        cycleContext,
      });
      setPlan(exercises);
      void persistGeneratedPlan(exercises, resolvedCheckin, cycleContext, physicalProfile);
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

  const sore = (activeCheckin.soreness || []).filter(s => s !== 'None');

  return (
    <>
      <ScreenTitle dark={dark}>Start Workout</ScreenTitle>

      <div style={{ padding: '0 22px 16px' }}>
        <div style={{
          borderRadius: 18, padding: '22px 18px',
          background: dark ? '#0F1E30' : '#f4f8fd',
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
              {planSource === 'trainer' && trainerName ? (
                <>by {trainerName}{planSentAt ? ` · ${new Date(planSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</>
              ) : (
                <>{activeCheckin.goal} · {activeCheckin.minutes} min · {activeCheckin.location || 'gym'}</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pending plans badge */}
      {otherPending.length > 0 && !showPendingList && (
        <div style={{ padding: '0 22px 10px' }}>
          <button onClick={() => setShowPendingList(true)} style={{
            width: '100%', padding: '9px 14px', borderRadius: 10, border: 'none',
            background: `${t.primary}18`, color: t.primary,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="history" size={13} color={t.primary} stroke={2}/>
            +{otherPending.length} more plan{otherPending.length > 1 ? 's' : ''} pending from your trainer
          </button>
        </div>
      )}

      {/* Pending plans list */}
      {showPendingList && otherPending.length > 0 && (
        <div style={{ margin: '0 22px 14px', borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.primary}33` }}>
          <div style={{
            padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: `${t.primary}14`,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.primary }}>
              Other pending plans
            </span>
            <button onClick={() => setShowPendingList(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
              fontSize: 12, color: t.primary, fontFamily: 'inherit',
            }}>✕</button>
          </div>
          {otherPending.map((p, i) => {
            const isOpen = expandedPending === p.id;
            const dateLabel = p.sentAt
              ? new Date(p.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'Plan';
            const statusColor = p.status === 'postponed' ? '#F5B45A' : t.primary;
            return (
              <div key={p.id} style={{ borderTop: i > 0 ? `1px solid ${t.primary}22` : undefined }}>

                {/* Row — cancel badge inline, click row to expand */}
                <div style={{
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  background: dark ? '#0F1E30' : '#f4f8fd',
                }}>
                  {/* Clickable main area */}
                  <button onClick={() => setExpandedPending(isOpen ? null : p.id)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: dark ? '#fff' : '#0E1A2B' }}>{dateLabel}</span>
                      <span style={{ fontSize: 11.5, color: dark ? 'rgba(255,255,255,.5)' : '#6b7a90', marginLeft: 8 }}>
                        {p.exercises.length} exercise{p.exercises.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, letterSpacing: '.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                      {p.status === 'postponed' ? 'Postponed' : 'Pending'}
                    </span>
                    <span style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,.4)' : '#aab' }}>{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Cancel badge — no need to open card */}
                  <button
                    title="Cancel this plan"
                    onClick={() => {
                      void supabase.from('workout_plans').update({ status: 'cancelled' }).eq('id', p.id);
                      setOtherPending(prev => prev.filter(x => x.id !== p.id));
                      if (isOpen) setExpandedPending(null);
                    }}
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

                {/* Expanded: exercise list + Postpone / Start */}
                {isOpen && (
                  <div style={{ padding: '0 14px 12px', background: dark ? '#0a1626' : '#eef1f8' }}>
                    {p.exercises.map((ex, ei) => (
                      <div key={ex.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px', borderRadius: 9, marginBottom: 5,
                        background: dark ? '#0F1E30' : '#f4f8fd',
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

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => {
                          void supabase.from('workout_plans').update({ status: 'postponed' }).eq('id', p.id);
                          setOtherPending(prev => prev.map(x => x.id === p.id ? { ...x, status: 'postponed' } : x));
                          setExpandedPending(null);
                        }}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid #F5B45A55`,
                          background: '#F5B45A18', color: '#F5B45A', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Postpone
                      </button>
                      <button
                        onClick={() => {
                          void supabase.from('workout_plans').update({ status: 'active' }).eq('id', p.id);
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
                        }}
                        style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                          background: t.primary, color: '#0E1A2B', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        ▶ Start
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Today's AI plan */}
      <div style={{ padding: '4px 22px 0' }}>
        <SectionLabel dark={dark}>{planSource === 'trainer' ? 'From your trainer' : 'Today\'s AI plan'}</SectionLabel>

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

      <div style={{ padding: '16px 22px 28px' }}>
        <button
          onClick={() => {
            // Mark as active only when the workout actually starts
            if (planId && planSource === 'trainer') {
              void supabase.from('workout_plans').update({ status: 'active' }).eq('id', planId);
            }
            nav('workoutMode', { planId, exercises: plan });
          }}
          disabled={!plan || loading}
          style={{
            ...primaryBtn(t.primary),
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: (!plan || loading) ? 0.5 : 1,
          }}
        >
          <Icon name="play" size={14} color="#0E1A2B"/> Start Workout
        </button>
      </div>
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
