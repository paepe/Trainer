import React from 'react';
import { supabase } from '../../supabase';
import { Icon, PhotoSlot, TopBar, ScreenTitle, SectionLabel } from '../../components';
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
  const [cycleCtx,   setCycleCtx]   = React.useState<CycleContext | null>(null);
  const [latestCheckin, setLatestCheckin] = React.useState<CheckIn | null>(null);
  const [loading,    setLoading]    = React.useState<boolean>(false);
  const [error,      setError]      = React.useState<string | null>(null);
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
    void fetchPlan();
  }, []);

  const sore = (activeCheckin.soreness || []).filter(s => s !== 'None');

  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>
      <ScreenTitle dark={dark}>Start Workout</ScreenTitle>

      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
          <PhotoSlot label="trainer · gym lift" w="100%" h={170} radius={18} dark/>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: 18, color: '#fff',
            background: 'linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.6))',
          }}>
            <div style={{
              display: 'inline-block', padding: '3px 8px', borderRadius: 6,
              background: t.accent, color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em',
              marginBottom: 6,
            }}>YOUR TRAINER</div>
            <div style={{ fontSize: 19, fontWeight: 600, fontFamily: '"Plus Jakarta Sans",sans-serif' }}>AI-Powered Plan</div>
            <div style={{ fontSize: 12, opacity: .82, marginTop: 2 }}>
              {activeCheckin.goal} · {activeCheckin.minutes} min · {activeCheckin.location || 'gym'}
            </div>
          </div>
        </div>
      </div>

      {/* Today's AI plan */}
      <div style={{ padding: '4px 22px 0' }}>
        <SectionLabel dark={dark}>Today&rsquo;s AI plan</SectionLabel>

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
            background: dark ? 'rgba(45,212,224,.08)' : `${t.primary}10`,
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
          onClick={() => nav('workoutMode', { planId, exercises: plan })}
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
