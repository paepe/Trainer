import React from 'react';
import { Icon } from '../components/Icon';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';
import { VStack } from './Layout';

export interface ChoiceCardProps {
  title: string;
  sub?: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
  indicatorType?: 'radio' | 'checkbox';
}

export function ChoiceCard({
  title,
  sub,
  icon,
  active,
  onClick,
  color = 'var(--signature)',
  disabled = false,
  indicatorType = 'radio',
}: ChoiceCardProps) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: 14,
        borderRadius: 14,
        border: `1.5px solid ${active ? color : DARK.border}`,
        background: active ? `color-mix(in srgb, ${color} 8%, transparent)` : DARK.surface,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'all .15s ease',
      }}
    >
      {icon && (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            flexShrink: 0,
            background: active ? `color-mix(in srgb, ${color} 13%, transparent)` : `${DARK.border}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={18} color={active ? color : DARK.textSec} />
        </div>
      )}

      <VStack flex={1} style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: active ? DARK.textPri : DARK.textSec, lineHeight: 1.3 }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: DARK.textMute, marginTop: 2, lineHeight: 1.4 }}>
            {sub}
          </div>
        )}
      </VStack>

      {indicatorType === 'radio' ? (
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            flexShrink: 0,
            border: active ? `5px solid ${color}` : `1.5px solid ${DARK.border}`,
            background: 'transparent',
            transition: 'border .15s ease',
          }}
        />
      ) : (
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            flexShrink: 0,
            border: `1.5px solid ${active ? color : DARK.borderSoft}`,
            background: active ? color : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all .15s ease',
          }}
        >
          {active && <Icon name="check" size={11} color={DARK.bg} stroke={2.8} />}
        </div>
      )}
    </button>
  );
}
