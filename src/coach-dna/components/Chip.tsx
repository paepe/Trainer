import React from 'react';
import { Icon } from '../../components/Icon';
import { DARK } from '../../theme/tokens';

interface ChipProps {
  label:     string;
  active:    boolean;
  onClick:   () => void;
  color?:    string;
  multi?:    boolean;
  locked?:   boolean;
  mono?:     boolean;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  label, active, onClick, color = '#2DD4E0',
  multi = false, locked = false, mono = false, disabled = false,
}) => {
  const isDisabled = disabled || locked;
  return (
    <button
      onClick={() => !isDisabled && onClick()}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            multi && active ? 5 : 0,
        padding:        '9px 14px',
        borderRadius:   999,
        border:         active ? `1.5px solid ${color}` : `1.5px solid ${DARK.border}`,
        background:     active ? `${color}22` : 'transparent',
        color:          active ? color : DARK.textSec,
        fontSize:       12.5,
        fontWeight:     600,
        fontFamily:     mono ? '"JetBrains Mono",ui-monospace,monospace' : 'inherit',
        cursor:         isDisabled ? 'not-allowed' : 'pointer',
        opacity:        isDisabled && !active ? 0.4 : 1,
        transition:     'background .15s, border-color .15s, color .15s',
        whiteSpace:     'nowrap',
      }}
    >
      {multi && active && <Icon name="check" size={12} color={color} stroke={2.5}/>}
      {label}
    </button>
  );
};
