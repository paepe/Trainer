import React from 'react';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { PrivacyNote } from '../components/PrivacyNote';
import { DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';
import { PRINCIPLES }  from '../constants';

const MAX = 3;

interface Step06Props {
  principles: string[];
  onChange:   (principles: string[]) => void;
}

export const Step06Principles: React.FC<Step06Props> = ({ principles, onChange }) => {
  const { t } = useTheme();
  const toggle = (key: string) => {
    if (principles.includes(key)) {
      onChange(principles.filter(p => p !== key));
    } else if (principles.length < MAX) {
      onChange([...principles, key]);
    }
  };

  const atMax = principles.length >= MAX;

  return (
    <div>
      <StepHeader
        idx={6} total={12}
        title="Core principles"
        sub="The beliefs that guide your prescription decisions."
        badge={`Choose up to ${MAX}`}
      />
      <Hint>What is your training philosophy at its core?</Hint>

      {/* counter */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        marginBottom: 12,
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        fontSize: 11, color: atMax ? t.accent : DARK.textMute,
      }}>
        {principles.length}/{MAX}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {PRINCIPLES.map(p => {
          const rank    = principles.indexOf(p.key) + 1;
          const active  = rank > 0;
          const dimmed  = !active && atMax;

          return (
            <button
              key={p.key}
              onClick={() => toggle(p.key)}
              disabled={dimmed}
              style={{
                display:      'flex', alignItems: 'center', gap: 12,
                padding:      '13px 14px', borderRadius: 12,
                border:       `1.5px solid ${active ? t.accent : DARK.border}`,
                background:   active ? `${t.accent}14` : DARK.surface,
                cursor:       dimmed ? 'not-allowed' : 'pointer',
                opacity:      dimmed ? 0.4 : 1,
                fontFamily:   'inherit', textAlign: 'left',
                transition:   'background .15s, border-color .15s, opacity .15s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                border:     `1.5px solid ${active ? t.accent : DARK.border}`,
                background: active ? t.accent : 'transparent',
                display:    'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: '"Plus Jakarta Sans","Inter",sans-serif',
                fontSize:   12, fontWeight: 800,
                color:      active ? '#0E1A2B' : DARK.textMute,
                transition: 'background .15s, border-color .15s',
              }}>
                {active ? rank : ''}
              </div>

              <span style={{
                fontSize: 13.5, fontWeight: active ? 600 : 400,
                color:    active ? DARK.textPri : DARK.textSec,
                flex:     1,
              }}>
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      <PrivacyNote tone="coach">
        The selected principles set absolute priorities in the generator — what appears first in every prescription.
      </PrivacyNote>
    </div>
  );
};
