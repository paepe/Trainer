import React from 'react';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { FieldLabel }  from '../components/FieldLabel';
import { VoiceBar }    from '../components/VoiceBar';
import { PrivacyNote } from '../components/PrivacyNote';
import { Icon }        from '../../components/Icon';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';
import type { CoachDNAExercises } from '../../types/coach-dna';

interface Step08Props {
  exercises: CoachDNAExercises;
  onChange:  (exercises: CoachDNAExercises) => void;
}

function TagInput({ tags, placeholder, onAdd, onRemove, color }: {
  tags:        string[];
  placeholder: string;
  color:       string;
  onAdd:       (t: string) => void;
  onRemove:    (t: string) => void;
}) {
  const [val, setVal] = React.useState('');
  const submit = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) onAdd(t);
    setVal('');
  };
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); submit(); } }}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            border: `1.5px solid ${DARK.border}`, background: DARK.surface,
            color: DARK.textPri, fontSize: 13, fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          onClick={submit}
          disabled={!val.trim()}
          style={{
            padding: '0 16px', borderRadius: 10, border: 'none',
            background: color, color: '#fff', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', opacity: val.trim() ? 1 : 0.35, flexShrink: 0,
          }}
        >+</button>
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map(t => (
            <div key={t} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 20,
              background: `${color}18`, border: `1px solid ${color}40`,
            }}>
              <span style={{ fontSize: 12.5, color: DARK.textPri }}>{t}</span>
              <button
                onClick={() => onRemove(t)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                }}
              >
                <Icon name="minus" size={11} color={color}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Step08Exercises: React.FC<Step08Props> = ({ exercises, onChange }) => {
  const { t } = useTheme();
  return (
  <div>
    <StepHeader
      idx={8} total={12}
      title="Exercises & repertoire"
      sub="Your movement vocabulary defines your identity as a coach."
      badge="Coach DNA"
    />
    <Hint>Add the exercises you use most and the ones you avoid. Press Enter or comma to confirm.</Hint>

    <FieldLabel hint="unlimited">Favorite exercises</FieldLabel>
    <TagInput
      tags={exercises.favorites}
      placeholder="e.g. Back Squat, Turkish Get-Up…"
      color={t.accent}
      onAdd={t  => onChange({ ...exercises, favorites: [...exercises.favorites, t] })}
      onRemove={t => onChange({ ...exercises, favorites: exercises.favorites.filter(x => x !== t) })}
    />
    <VoiceBar
      hint="Dictate favorite exercises"
      onTranscript={text => {
        const parts = text.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
        const next  = [...exercises.favorites];
        parts.forEach(p => { if (!next.includes(p)) next.push(p); });
        onChange({ ...exercises, favorites: next });
      }}
    />

    <div style={{ marginTop: 24 }}>
      <FieldLabel hint="optional">Exercises to avoid / not use</FieldLabel>
      <TagInput
        tags={exercises.avoid}
        placeholder="e.g. Leg Press, traditional sit-up…"
        color={DARK.textSec}
        onAdd={t  => onChange({ ...exercises, avoid: [...exercises.avoid, t] })}
        onRemove={t => onChange({ ...exercises, avoid: exercises.avoid.filter(x => x !== t) })}
      />
    </div>

    <PrivacyNote tone="optional">
      This repertoire feeds the automatic exercise selection by the AI Coach Engine.
    </PrivacyNote>
  </div>
  );
};
