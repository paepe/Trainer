import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon }        from '../../components/Icon';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { PrivacyNote } from '../components/PrivacyNote';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';
import { STYLES }      from '../constants';

interface Step05Props {
  style:    string[];
  onChange: (style: string[]) => void;
}

export const Step05Style: React.FC<Step05Props> = ({ style, onChange }) => {
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const styleLabel = (key: string) => tr(`coachDna.step05.styles.${key}`);
  const toggle = (key: string) => {
    onChange(
      style.includes(key) ? style.filter(s => s !== key) : [...style, key],
    );
  };

  return (
    <div>
      <StepHeader
        idx={5} total={12}
        title={tr('coachDna.step05.title')}
        sub={tr('coachDna.step05.sub')}
        badge={tr('coachDna.step05.badge')}
      />
      <Hint>{tr('coachDna.step05.hint')}</Hint>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {STYLES.map(s => {
          const active = style.includes(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              style={{
                display:      'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                padding:      '16px 10px',
                borderRadius: 14,
                border:       `1.5px solid ${active ? theme.accent : DARK.border}`,
                background:   active ? `${theme.accent}1c` : DARK.surface,
                cursor:       'pointer', fontFamily: 'inherit',
                transition:   'background .15s, border-color .15s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: active ? `${theme.accent}22` : `${DARK.border}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={s.icon} size={18} color={active ? theme.accent : DARK.textSec}/>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: active ? DARK.textPri : DARK.textSec,
                textAlign: 'center', lineHeight: 1.3,
              }}>
                {styleLabel(s.key)}
              </span>
            </button>
          );
        })}
      </div>

      <PrivacyNote tone="coach">
        {tr('coachDna.step05.privacyNote')}
      </PrivacyNote>
    </div>
  );
};
