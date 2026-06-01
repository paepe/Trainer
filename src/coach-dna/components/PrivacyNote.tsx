import React from 'react';
import { Icon } from '../../components/Icon';
import { DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';

type Tone = 'default' | 'coach' | 'optional';

interface PrivacyNoteProps {
  tone?:     Tone;
  children:  React.ReactNode;
}

export const PrivacyNote: React.FC<PrivacyNoteProps> = ({ tone = 'default', children }) => {
  const { t } = useTheme();
  const CONFIG: Record<Tone, { color: string; icon: string }> = {
    default:  { color: t.primary,  icon: 'sparkle'     },
    coach:    { color: t.accent,   icon: 'fingerprint' },
    optional: { color: t.lavender, icon: 'brain'       },
  };
  const { color, icon } = CONFIG[tone];
  return (
    <div style={{
      display:      'flex',
      gap:          10,
      padding:      '12px 14px',
      borderRadius: 12,
      background:   `${color}12`,
      border:       `1px solid ${color}30`,
      marginTop:    16,
    }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <Icon name={icon} size={15} color={color}/>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: DARK.textSec, lineHeight: 1.5 }}>
        {children}
      </p>
    </div>
  );
};
