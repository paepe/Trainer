import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { PrivacyNote } from '../components/PrivacyNote';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';
import { PRINCIPLES }  from '../constants';

const MAX = 3;

interface Step06Props {
  principles: string[];
  onChange:   (principles: string[]) => void;
}

export const Step06Principles: React.FC<Step06Props> = ({ principles, onChange }) => {
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const principleLabel = (key: string) => tr(`coachDna.step06.principles.${key}`);
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
        title={tr('coachDna.step06.title')}
        sub={tr('coachDna.step06.sub')}
        badge={tr('coachDna.step06.badge', { max: MAX })}
      />
      <Hint>{tr('coachDna.step06.hint')}</Hint>

      {/* counter */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        marginBottom: 12,
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        fontSize: 11, color: atMax ? theme.accent : DARK.textMute,
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
                border:       `1.5px solid ${active ? theme.accent : DARK.border}`,
                background:   active ? `${theme.accent}14` : DARK.surface,
                cursor:       dimmed ? 'not-allowed' : 'pointer',
                opacity:      dimmed ? 0.4 : 1,
                fontFamily:   'inherit', textAlign: 'left',
                transition:   'background .15s, border-color .15s, opacity .15s',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                border:     `1.5px solid ${active ? theme.accent : DARK.border}`,
                background: active ? theme.accent : 'transparent',
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
                {principleLabel(p.key)}
              </span>
            </button>
          );
        })}
      </div>

      <PrivacyNote tone="coach">
        {tr('coachDna.step06.privacyNote')}
      </PrivacyNote>
    </div>
  );
};
