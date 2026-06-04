import React from 'react';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';

export interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
  color?: string;
  disabled?: boolean;
}

export function Toggle({ on, onChange, color = BRAND.primary, disabled = false }: ToggleProps) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          padding: 2,
          background: on ? color : DARK.border,
          position: 'relative',
          transition: 'background .15s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: DARK.bg,
            transition: 'left .15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          }}
        />
      </div>
    </div>
  );
}
