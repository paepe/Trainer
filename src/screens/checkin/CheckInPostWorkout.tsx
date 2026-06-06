import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../theme';
import type { CheckInPostWorkout as PostWorkoutData, SensationRating, WorkoutCompletionStatus } from '../../types/checkin-v2';

interface CheckInPostWorkoutProps {
  dark:     boolean;
  primary:  string;
  accent:   string;
  sessionInfo?: { id: string; startedAt: string; durationMin: number | null } | null;
  onSubmit: (data: PostWorkoutData) => void;
  onBack:   () => void;
}

const SENSATION_VALS: SensationRating[] = ['excellent', 'good', 'ok', 'hard', 'very_hard'];
const SENSATION_EMOJIS: Record<SensationRating, string> = {
  excellent: '😄', good: '😊', ok: '😐', hard: '😓', very_hard: '😖',
};

export function CheckInPostWorkout({ dark, primary, accent, sessionInfo, onSubmit, onBack }: CheckInPostWorkoutProps) {
  const { t: tr } = useTranslation();
  const sensations = React.useMemo(() => SENSATION_VALS.map(v => ({
    value: v, label: tr(`checkin.postWorkout.sensations.${v}`), emoji: SENSATION_EMOJIS[v],
  })), [tr]);
  const completions: { value: WorkoutCompletionStatus; label: string }[] = React.useMemo(() => [
    { value: 'yes',       label: tr('checkin.postWorkout.completion.yes') },
    { value: 'partially', label: tr('checkin.postWorkout.completion.partially') },
    { value: 'no',        label: tr('checkin.postWorkout.completion.no') },
  ], [tr]);

  const [sensation, setSensation]     = React.useState<SensationRating | undefined>(undefined);
  const [completion, setCompletion]   = React.useState<WorkoutCompletionStatus | undefined>(undefined);
  const [rpe, setRpe]                 = React.useState(5);
  const [painAfter, setPainAfter]     = React.useState(false);
  const [notes, setNotes]             = React.useState('');
  const [saving, setSaving]           = React.useState(false);
  const [saved, setSaved]             = React.useState(false);

  const canSubmit = sensation != null && completion != null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    const data: PostWorkoutData = {
      session_id:           sessionInfo?.id ?? crypto.randomUUID(),
      sensation,
      completion_status:    completion,
      perceived_effort:     rpe,
      pain_during_or_after: painAfter,
      ...(notes.trim() ? { notes_for_ai: notes.trim() } : {}),
    };

    await new Promise(r => setTimeout(r, 600));
    onSubmit(data);
    setSaving(false);
    setSaved(true);
  };

  const btnBase = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    background: active ? primary : surfRaised(dark),
    border: `1.5px solid ${active ? primary : borderSubtle(dark)}`,
    color: active ? '#0E1A2B' : textPri(dark),
    transition: 'background .15s',
  });

  if (saved) {
    return (
      <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: `${primary}22`, border: `2px solid ${primary}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          fontSize: 28,
        }}>
          ✓
        </div>
        <h2 style={{
          margin: '0 0 8px', fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 22, fontWeight: 700, color: textPri(dark), textAlign: 'center',
        }}>
          {tr('checkin.postWorkout.feedbackSaved')}
        </h2>
        <p style={{ fontSize: 13, color: textSec(dark), textAlign: 'center', lineHeight: 1.55, margin: 0 }}>
          {tr('checkin.postWorkout.feedbackSavedSub')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, marginBottom: 8 }}>
        {tr('checkin.postWorkout.kicker')}
      </div>
      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('checkin.postWorkout.title')}
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 24px', lineHeight: 1.55 }}>
        {tr('checkin.postWorkout.subtitle')}
      </p>
      {sessionInfo && (
        <div style={{ fontSize: 11.5, color: primary, margin: '-12px 0 20px', fontWeight: 600 }}>
          {tr('checkin.postWorkout.evaluatingSession', {
            time: new Date(sessionInfo.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            duration: sessionInfo.durationMin ? `${sessionInfo.durationMin} min` : '',
          })}
        </div>
      )}

      <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 14 }}>
          {tr('checkin.postWorkout.overallFeeling')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {sensations.map(s => (
            <button
              key={s.value}
              onClick={() => setSensation(s.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '10px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                background: sensation === s.value ? `${primary}18` : 'none',
                border: `1.5px solid ${sensation === s.value ? primary : 'transparent'}`,
                flex: 1, margin: '0 3px',
              }}
            >
              <span style={{ fontSize: 22 }}>{s.emoji}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: textSec(dark), textAlign: 'center', lineHeight: 1.2 }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 12 }}>
          {tr('checkin.postWorkout.completedEverything')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {completions.map(c => (
            <button key={c.value} onClick={() => setCompletion(c.value)} style={{ ...btnBase(completion === c.value), flex: 1 }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 12 }}>
          {tr('checkin.postWorkout.rpe')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="range" min={1} max={10} value={rpe}
            onChange={e => setRpe(Number(e.target.value))}
            style={{ flex: 1, accentColor: primary }}
          />
          <span style={{ fontSize: 16, fontWeight: 700, color: textPri(dark), minWidth: 40, textAlign: 'right' }}>
            {rpe}<span style={{ fontSize: 11, fontWeight: 400, color: textMute(dark) }}>/10</span>
          </span>
        </div>
      </div>

      <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: textPri(dark), marginBottom: 3 }}>
              {tr('checkin.postWorkout.painDuringAfter')}
              {painAfter && <span style={{ fontSize: 12, marginLeft: 6 }}>⚠️</span>}
            </div>
            <div style={{ fontSize: 11, color: textSec(dark), lineHeight: 1.45 }}>
              {tr('checkin.postWorkout.painEngineNote')}
            </div>
          </div>
          <button
            onClick={() => setPainAfter(v => !v)}
            style={{
              width: 44, height: 26, borderRadius: 999, cursor: 'pointer', border: 'none',
              background: painAfter ? accent : borderSubtle(dark),
              position: 'relative', transition: 'background .2s', flexShrink: 0, marginLeft: 12,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3, left: painAfter ? 21 : 3, transition: 'left .2s',
            }}/>
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 24, background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 10 }}>
          {tr('checkin.postWorkout.noteLabel')}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={tr('checkin.postWorkout.notePlaceholder')}
          rows={3}
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none', resize: 'none',
            fontSize: 13, color: textPri(dark), fontFamily: 'inherit', lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: primary, fontFamily: 'inherit', fontWeight: 600, padding: 0,
        }}>
          {tr('checkin.postWorkout.back')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          style={{
            flex: 1, padding: '16px', borderRadius: 14,
            background: canSubmit ? primary : `${primary}44`,
            border: 'none', color: '#0E1A2B',
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
            cursor: canSubmit ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? tr('checkin.postWorkout.saving') : tr('checkin.postWorkout.saveBtn')}
        </button>
      </div>
    </div>
  );
}
