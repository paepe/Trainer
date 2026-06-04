import React from 'react';
import { Icon } from '../../components/Icon';
import { THEME_VARS as DARK } from '../../theme/tokens';

interface ChoiceCardProps {
  active:    boolean;
  onClick:   () => void;
  icon?:     string;
  title:     string;
  sub?:      string;
  color?:    string;
  disabled?: boolean;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  active, onClick, icon, title, sub, color = '#2DD4E0', disabled = false,
}) => (
  <button
    onClick={() => !disabled && onClick()}
    style={{
      display:        'flex',
      alignItems:     'center',
      gap:            12,
      width:          '100%',
      padding:        14,
      borderRadius:   14,
      border:         active ? `1.5px solid ${color}` : `1.5px solid ${DARK.border}`,
      background:     active ? `${color}14` : DARK.surface,
      cursor:         disabled ? 'not-allowed' : 'pointer',
      opacity:        disabled ? 0.5 : 1,
      textAlign:      'left',
      fontFamily:     'inherit',
      transition:     'background .15s, border-color .15s',
    }}
  >
    {icon && (
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: active ? `${color}22` : `${DARK.border}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={18} color={active ? color : DARK.textSec}/>
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: active ? DARK.textPri : DARK.textSec, lineHeight: 1.3 }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: DARK.textMute, marginTop: 2, lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
    <div style={{
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
      border: active ? `5px solid ${color}` : `1.5px solid ${DARK.border}`,
      background: 'transparent',
      transition: 'border .15s',
    }}/>
  </button>
);
