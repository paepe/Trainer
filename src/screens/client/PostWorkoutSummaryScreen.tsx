import React from 'react';
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

const FEELING_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Great'];
const FEELING_ICONS  = ['😩',       '😕',  '😐',    '😊',   '🤩'];

export function PostWorkoutSummaryScreen({
  nav, t, dark, sessionId,
  durationMin, completedCount, total, totalSets,
  startedAt, forClientName, forClientId,
  savePostWorkoutFeedback,
}: PostWorkoutSummaryScreenProps) {
  const [feeling,   setFeeling]   = React.useState(4);
  const [energy,    setEnergy]    = React.useState<number | null>(null);
  const [notes,     setNotes]     = React.useState('');
  const [saving,    setSaving]    = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const isTrainerSession = Boolean(forClientName);

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
    nav(isTrainerSession ? 'trainerDashboard' : 'goal', { durationMinutes: durationMin, completedCount, total });
  };

  return (
    <>

      {/* Hero */}
      <div style={{ padding: '16px 22px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 6 }}>🏆</div>
        <div style={{
          fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 22, fontWeight: 700, color: dark ? '#fff' : '#0E1A2B',
        }}>Workout Complete!</div>
        <div style={{ fontSize: 13, color: textSec(dark), marginTop: 4 }}>
          Great effort — here&rsquo;s your session summary
          {startedAt && (
            <span style={{ color: textMute(dark) }}>
              {' · '}{new Date(startedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}{new Date(startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10,
          background: surfRaised(dark), borderRadius: 16,
          border: `1px solid ${borderSubtle(dark)}`,
          padding: 16,
        }}>
          <StatTile label="Duration"  value={`${durationMin} min`}    icon="history" t={t} dark={dark}/>
          <StatTile label="Exercises" value={`${completedCount}/${total}`} icon="play"  t={t} dark={dark}/>
          <StatTile label="Sets done" value={String(totalSets)}         icon="chart"   t={t} dark={dark}/>
          <StatTile label="Score"     value={total > 0 ? `${Math.round((completedCount / total) * 100)}%` : '—'} icon="target" t={t} dark={dark}/>
        </div>
      </div>

      {/* Trainer context banner */}
      {isTrainerSession && (
        <div style={{ padding: '0 22px 14px' }}>
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: `${t.primary}12`, border: `1px solid ${t.primary}33`,
            fontSize: 11, color: t.primary, fontWeight: 600,
          }}>
            Recording on behalf of {forClientName ?? 'client'} · feedback saved under client's profile
          </div>
        </div>
      )}

      {/* How did you feel? */}
      <div style={{ padding: '0 22px 18px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 12 }}>
          How did you feel?
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
                {FEELING_LABELS[n - 1]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Energy after */}
      <div style={{ padding: '0 22px 18px' }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
          Energy level after — {energy ?? '—'}/10
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
          Notes (optional)
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="How was the session?"
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
          {saving ? 'Saving…' : isTrainerSession ? 'Save & Back to Dashboard' : 'Save & Continue'}
        </button>
      </div>
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
