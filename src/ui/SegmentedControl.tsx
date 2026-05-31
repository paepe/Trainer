import React from 'react';
import { DARK, BRAND } from '../theme/tokens';
import { HStack } from './Layout';

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (v: string) => void;
  color?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  color = BRAND.primary,
}: SegmentedControlProps) {
  return (
    <HStack gap={8}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              padding: '11px 0',
              borderRadius: 999,
              background: on ? `${color}22` : 'transparent',
              border: `1.5px solid ${on ? color : DARK.border}`,
              color: on ? color : DARK.textSec,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .12s ease',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </HStack>
  );
}
