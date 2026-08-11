import React, { CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';
import { HStack } from './Layout';

export interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
  accent?: string;
  multi?: boolean;
  disabled?: boolean;
  mono?: boolean;
  style?: CSSProperties;
}

export function Chip({
  label,
  active,
  onClick,
  color = 'var(--signature)',
  accent,
  multi = false,
  disabled = false,
  mono = false,
  style,
}: ChipProps) {
  const activeColor = accent && active ? accent : color;
  
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: multi && active ? 6 : 0,
        padding: '9px 14px',
        borderRadius: 999,
        background: active ? `color-mix(in srgb, ${activeColor} 13%, transparent)` : 'transparent',
        color: active ? activeColor : DARK.textSec,
        border: `1.5px solid ${active ? activeColor : DARK.border}`,
        fontFamily: mono ? '"JetBrains Mono",ui-monospace,monospace' : 'inherit',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all .12s ease',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        maxWidth: '100%',
        textAlign: 'center',
        ...style,
      }}
    >
      {multi && active && <Icon name="check" size={12} color={activeColor} stroke={2.5}/>}
      {label}
    </button>
  );
}

export function ChipGroup({ children, style, gap = 8 }: { children: React.ReactNode; style?: CSSProperties; gap?: number | string }) {
  return (
    <HStack flexWrap="wrap" gap={gap} style={style || {}}>
      {children}
    </HStack>
  );
}
