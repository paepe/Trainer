import React from 'react';
import { supabase } from '../../supabase';
import { Icon, TopBar, SectionLabel } from '../../components';
import { surfRaised, borderSubtle, textPri, textSec, textMute, primaryBtn } from '../../theme';
import type { NavFn } from '../../types';
import type { Exercise } from './StartWorkoutScreen';

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
}

interface WorkoutInProgressScreenProps {
  nav:                 NavFn;
  t:                   Theme;
  dark:                boolean;
  user:                AppUser;
  planId:              string | null;
  exercises:           Exercise[] | null;
  logWorkoutSession?: (d: {
    plan_id:           string | null;
    started_at:        string;
    completed_at:      string;
    duration_minutes:  number;
    performance_score: number | null;
  }) => Promise<{ error: unknown }>;
}

export function WorkoutInProgressScreen({
  nav, t, dark, user, planId, exercises, logWorkoutSession,
}: WorkoutInProgressScreenProps) {
  const [startedAt]  = React.useState<Date>(() => new Date());
  const [elapsed,    setElapsed]    = React.useState<number>(0);
  const [done,       setDone]       = React.useState<boolean[]>(() => (exercises || []).map(() => false));
  const [finishing,  setFinishing]  = React.useState<boolean>(false);

  React.useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const completedCount = done.filter(Boolean).length;
  const total = (exercises || []).length;

  const finish = async () => {
    setFinishing(true);
    const completedAt = new Date();
    const durationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60_000) || 1;

    if (logWorkoutSession) {
      await logWorkoutSession({
        plan_id:          planId || null,
        started_at:       startedAt.toISOString(),
        completed_at:     completedAt.toISOString(),
        duration_minutes: durationMinutes,
        performance_score: total > 0 ? +(completedCount / total * 10).toFixed(1) : null,
      });
    }

    // Mark plan_exercises as completed for the ones the user ticked
    if (planId && exercises?.length) {
      const { data: rows } = await supabase
        .from('plan_exercises')
        .select('id, order_index')
        .eq('plan_id', planId)
        .order('order_index');
      if (rows?.length) {
        await Promise.all(
          rows.map((row, i) =>
            supabase.from('plan_exercises')
              .update({ completed: done[i] ?? false })
              .eq('id', row.id)
          )
        );
      }
    }

    nav('goal', { durationMinutes, completedCount, total, startedAt: startedAt.toISOString() });
  };

  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent}/>

      {/* Timer hero */}
      <div style={{ padding: '8px 22px 16px', textAlign: 'center' }}>
        <div style={{
          fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 64, fontWeight: 700, letterSpacing: '-0.03em',
          color: t.primary, lineHeight: 1,
        }}>{mm}:{ss}</div>
        <div style={{ fontSize: 12.5, color: textSec(dark), marginTop: 4 }}>
          {completedCount} / {total} exercises done
        </div>
        <div style={{
          marginTop: 10, height: 4, borderRadius: 4,
          background: dark ? '#1F2E45' : '#E5EAF1',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: t.primary,
            width: total > 0 ? `${(completedCount / total) * 100}%` : '0%',
            transition: 'width .3s ease',
          }}/>
        </div>
      </div>

      {/* Exercise checklist */}
      <div style={{ padding: '0 22px 16px' }}>
        <SectionLabel dark={dark}>Exercises</SectionLabel>
        <div style={{
          background: surfRaised(dark), borderRadius: 16,
          border: `1px solid ${borderSubtle(dark)}`, overflow: 'hidden',
        }}>
          {(exercises || []).map((ex, i) => (
            <div key={i} onClick={() => {
              const next = [...done];
              next[i] = !next[i];
              setDone(next);
            }} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '14px 16px',
              borderBottom: i < ((exercises?.length || 0) - 1) ? `1px solid ${borderSubtle(dark)}` : 'none',
              cursor: 'pointer',
              opacity: done[i] ? 0.55 : 1,
              transition: 'opacity .2s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                border: `2px solid ${done[i] ? t.primary : (dark ? '#2a3a52' : '#C8D0DB')}`,
                background: done[i] ? t.primary : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}>
                {done[i] && <Icon name="check" size={13} color="#0E1A2B" stroke={3}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: textPri(dark),
                  textDecoration: done[i] ? 'line-through' : 'none',
                }}>{ex.exercise_name}</div>
                <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>
                  {[
                    ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : null,
                    ex.load_kg ? `${ex.load_kg} kg` : null,
                    ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
                    ex.muscle_group,
                  ].filter(Boolean).join(' · ')}
                </div>
                {ex.notes && (
                  <div style={{ fontSize: 11, color: t.primary, marginTop: 3, fontStyle: 'italic' }}>{ex.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Finish CTA */}
      <div style={{ padding: '0 22px 28px' }}>
        <button
          onClick={finish}
          disabled={finishing}
          style={{
            ...primaryBtn(t.primary),
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: finishing ? 0.6 : 1,
          }}
        >
          <Icon name="trophy" size={16} color="#0E1A2B"/>
          {finishing ? 'Saving…' : 'Finish Workout'}
        </button>
      </div>
    </>
  );
}
