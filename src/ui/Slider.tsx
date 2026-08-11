import React from 'react';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';
import { HStack, VStack } from './Layout';
import { Typography } from './Typography';

export interface SliderProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  color?: string;
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
  color = 'var(--signature)',
}: SliderProps) {
  return (
    <VStack gap={4}>
      {label && (
        <HStack justifyContent="space-between" alignItems="baseline">
          <Typography variant="body" color="secondary" style={{ fontSize: 12 }}>
            {label}
          </Typography>
          <span
            style={{
              fontFamily: '"JetBrains Mono",ui-monospace,monospace',
              fontSize: 14,
              fontWeight: 700,
              color: color,
            }}
          >
            {value}
            {suffix && (
              <span style={{ fontSize: 11, color: DARK.textMute, marginLeft: 2 }}>{suffix}</span>
            )}
          </span>
        </HStack>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
      />
      <HStack justifyContent="space-between">
        <Typography variant="caption" color="muted" style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 10 }}>
          {min}{suffix}
        </Typography>
        <Typography variant="caption" color="muted" style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 10 }}>
          {max}{suffix}
        </Typography>
      </HStack>
    </VStack>
  );
}
