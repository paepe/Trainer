import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { supabase } from '../../supabase';
import { Icon } from '../../components';
import { surfRaised, borderSubtle, textPri, textSec, textMute, primaryBtn } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary: string;
  accent:  string;
}

interface AppUser { id: string | null }

interface PostWorkoutSummaryScreenProps {
  nav:                     NavFn;
  t:                       Theme;
  dark:                    boolean;
  user:                    AppUser;
  sessionId:               string | null;
  durationMin:             number;
  completedCount:          number;
  total:                   number;
  totalSets:               number;
  startedAt?:              string;
  forClientName?:          string;
  forClientId?:            string;
  savePostWorkoutFeedback: (data: { session_id: string; overall_feeling: number; energy_after: number | null; notes: string | null; forUserId?: string }) => Promise<{ error: unknown }>;
}

const FEELING_ICONS  = ['😩',       '😕',  '😐',    '😊',   '🤩'];

export function PostWorkoutSummaryScreen({
  nav, t, dark, sessionId,
  durationMin: durationMinProp, completedCount: completedCountProp,
  total: totalProp, totalSets: totalSetsProp,
  startedAt: startedAtProp, forClientName, forClientId,
  savePostWorkoutFeedback,
}: PostWorkoutSummaryScreenProps) {
  const { t: tr } = useTranslation();
  const feelingLabels = React.useMemo(
    () => tr('postWorkout.feelings', { returnObjects: true }) as string[],
    [tr],
  );
  const [feeling,   setFeeling]   = React.useState(4);
  const [energy,    setEnergy]    = React.useState<number | null>(null);
  const [notes,     setNotes]     = React.useState('');
  const [saving,    setSaving]    = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  // Stats — use nav props when available, otherwise load from DB (History → "View Progress")
  const [durationMin,    setDurationMin]    = React.useState(durationMinProp);
  const [completedCount, setCompletedCount] = React.useState(completedCountProp);
  const [total,          setTotal]          = React.useState(totalProp);
  const [totalSets,      setTotalSets]      = React.useState(totalSetsProp);
  const [startedAt,      setStartedAt]      = React.useState(startedAtProp);
  // null = unknown (loading), 'completed' = done, anything else = not completed
  const [sessionStatus, setSessionStatus] = React.useState<string | null>(
    totalProp > 0 ? 'completed' : null
  );

  const isTrainerSession = Boolean(forClientName);

  // Load stats + status from DB when not provided via nav (History → "View Progress" path)
  React.useEffect(() => {
    if (!sessionId || totalProp > 0) return;
    supabase
      .from('workout_sessions')
      .select('status, completed_at, total_duration_min, started_at')
      .eq('id', sessionId)
      .maybeSingle()
      .then(({ data: s }) => {
        if (!s) { setSessionStatus('unknown'); return; }
        setSessionStatus(s.completed_at ? 'completed' : (s.status ?? 'unknown'));
        if (s.total_duration_min) setDurationMin(s.total_duration_min);
        if (s.started_at && !startedAtProp) setStartedAt(s.started_at);
      });
    supabase
      .from('workout_session_exercises')
      .select('id, status')
      .eq('session_id', sessionId)
      .then(({ data: exs }) => {
        if (!exs?.length) return;
        setTotal(exs.length);
        setCompletedCount(exs.filter(e => e.status === 'completed').length);
      });
    supabase
      .from('workout_set_logs')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .then(({ count }) => { if (count) setTotalSets(count); });
  }, [sessionId, totalProp, startedAtProp]);

  // Pre-populate with previously saved feedback so re-submissions don't overwrite stored data
  React.useEffect(() => {
    if (!sessionId) return;
    supabase
      .from('post_workout_feedback')
      .select('overall_feeling, energy_after, notes')
      .eq('session_id', sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.overall_feeling != null) setFeeling(data.overall_feeling);
        if (data.energy_after   != null) setEnergy(data.energy_after);
        if (data.notes          != null) setNotes(data.notes);
      });
  }, [sessionId]);

  const isCompleted = sessionStatus === 'completed';

  const handleSubmit = async () => {
    setSaving(true);
    if (sessionId) {
      await savePostWorkoutFeedback({
        session_id:      sessionId,
        overall_feeling: feeling,
        energy_after:    energy,
        notes:           notes.trim() || null,
        ...(forClientId ? { forUserId: forClientId } : {}),
      });
    }
    setSubmitted(true);
    setSaving(false);
    // Immediate post-workout → celebrate on GoalAchievedScreen
    // History review path → back to History (no celebration for past sessions)
    if (isTrainerSession) {
      nav('trainerDashboard');
    } else if (totalProp > 0) {
      nav('goal', { durationMinutes: durationMin, completedCount, total });
    } else {
      nav('history');
    }
  };

  // Loading state while DB query resolves (History path only)
  if (sessionStatus === null) {
    return (
      <div style={{ padding: '60px 22px', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
        {tr('postWorkout.loading')}
      </div>
    );
  }

  return (
    <>
      {/* Hero — adapts to completion status */}
      <div style={{ padding: '16px 22px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 6 }}>{isCompleted ? '🏆' : '📋'}</div>
        <div style={{
          fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 22, fontWeight: 700, color: dark ? '#fff' : '#0E1A2B',
        }}>
          {isCompleted ? tr('postWorkout.title') : tr('postWorkout.titleIncomplete')}
        </div>
        <div style={{ fontSize: 13, color: textSec(dark), marginTop: 4 }}>
          {isCompleted ? <>{tr('postWorkout.subtitleComplete')}</> : tr('postWorkout.subtitleIncomplete')}
          {startedAt && (
            <span style={{ color: textMute(dark) }}>
              {' · '}{new Date(startedAt).toLocaleDateString(i18n.language || 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}{new Date(startedAt).toLocaleTimeString(i18n.language || 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          )}
        </div>
      </div>

      {/* Stats — always visible */}
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10,
          background: surfRaised(dark), borderRadius: 16,
          border: `1px solid ${borderSubtle(dark)}`,
          padding: 16,
        }}>
          <StatTile label={tr('postWorkout.duration')}  value={durationMin ? `${durationMin} min` : '—'} icon="history" t={t} dark={dark}/>
          <StatTile label={tr('postWorkout.exercises')} value={total > 0 ? `${completedCount}/${total}` : '—'} icon="play" t={t} dark={dark}/>
          <StatTile label={tr('postWorkout.setsDone')} value={totalSets > 0 ? String(totalSets) : '—'} icon="chart" t={t} dark={dark}/>
          <StatTile label={tr('postWorkout.score')}     value={total > 0 ? `${Math.round((completedCount / total) * 100)}%` : '—'} icon="target" t={t} dark={dark}/>
        </div>
      </div>

      {/* Not completed — info banner + back, no feedback form */}
      {!isCompleted && (
        <div style={{ padding: '0 22px 32px' }}>
          <div style={{
            padding: '14px 16px', borderRadius: 14, marginBottom: 16,
            background: 'color-mix(in srgb, var(--border) 53%, transparent)', border: `1px solid ${borderSubtle(dark)}`,
            fontSize: 13, color: textSec(dark), lineHeight: 1.55,
          }}>
            {tr('postWorkout.feedbackOnlyCompleted')}
          </div>
          <button
            onClick={() => nav('history')}
            style={{
              ...primaryBtn(t.primary),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {tr('postWorkout.backToHistory')}
          </button>
        </div>
      )}

      {/* Completed — full feedback form */}
      {isCompleted && (
        <>
          {/* Trainer context banner */}
          {isTrainerSession && (
            <div style={{ padding: '0 22px 14px' }}>
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: `${t.primary}12`, border: `1px solid ${t.primary}33`,
                fontSize: 11, color: t.primary, fontWeight: 600,
              }}>
                {tr('postWorkout.trainerSessionNote', { client: forClientName ?? tr('postWorkout.clientFallback') })}
              </div>
            </div>
          )}

          {/* How did you feel? */}
          <div style={{ padding: '0 22px 18px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 12 }}>
              {tr('postWorkout.howDidYouFeel')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setFeeling(n)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                  background: feeling === n ? `${t.primary}22` : surfRaised(dark),
                  outline: `1.5px solid ${feeling === n ? t.primary : borderSubtle(dark)}`,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 20 }}>{FEELING_ICONS[n - 1]}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: feeling === n ? t.primary : textMute(dark) }}>
                    {feelingLabels[n - 1]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy after */}
          <div style={{ padding: '0 22px 18px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
              {tr('postWorkout.energyLevelAfter', { energy: energy ?? '—' })}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setEnergy(n)} style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: energy === n ? t.primary : surfRaised(dark),
                  color: energy === n ? '#0E1A2B' : textPri(dark),
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  outline: `1.5px solid ${energy === n ? t.primary : borderSubtle(dark)}`,
                }}>{n}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ padding: '0 22px 18px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
              {tr('postWorkout.notesOptional')}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={tr('postWorkout.sessionPlaceholder')}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', borderRadius: 12,
                border: `1.5px solid ${borderSubtle(dark)}`,
                background: surfRaised(dark), color: textPri(dark),
                fontFamily: 'inherit', fontSize: 14, resize: 'none', outline: 'none',
              }}
            />
          </div>

          <div style={{ padding: '0 22px 32px' }}>
            <button
              onClick={() => void handleSubmit()}
              disabled={saving || submitted}
              style={{
                ...primaryBtn(t.primary),
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: (saving || submitted) ? 0.65 : 1,
              }}
            >
              <Icon name="check" size={15} color="#0E1A2B" stroke={2.5}/>
              {saving ? tr('postWorkout.saveSaving') : isTrainerSession ? tr('postWorkout.saveTrainerDashboard') : tr('postWorkout.saveContinue')}
            </button>
          </div>
        </>
      )}
    </>
  );
}

function StatTile({ label, value, icon, t, dark }: { label: string; value: string; icon: string; t: { primary: string }; dark: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={13} color={t.primary} stroke={2}/>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: textMute(dark), textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: dark ? '#fff' : '#0E1A2B' }}>{value}</div>
    </div>
  );
}
