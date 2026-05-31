import React from 'react';
import { BRAND, DARK } from '../theme/tokens';
import { HStack, VStack } from './Layout';
import { Typography } from './Typography';

export interface LevelItem {
  value: number;
  label: string;
  sub: string;
}

export interface LevelPickerProps {
  value: number | null;
  onChange: (v: number) => void;
  items: LevelItem[];
}

export function LevelPicker({ value, onChange, items }: LevelPickerProps) {
  return (
    <VStack gap={8}>
      {items.map((item) => {
        const active = value === item.value;
        const bars = 5 - item.value + 1; // value 1 = full (5 bars), value 5 = 1 bar
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 12,
              border: `1.5px solid ${active ? BRAND.primary : DARK.border}`,
              background: active ? `${BRAND.primary}14` : DARK.surface,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'all .15s ease',
            }}
          >
            {/* Numeric badge */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                flexShrink: 0,
                background: active ? BRAND.primary : DARK.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"Plus Jakarta Sans",sans-serif',
                fontSize: 15,
                fontWeight: 800,
                color: active ? DARK.bg : DARK.textMute,
              }}
            >
              {item.value}
            </div>

            {/* Text */}
            <VStack flex={1} style={{ minWidth: 0 }}>
              <Typography
                variant="body"
                weight={600}
                style={{ color: active ? DARK.textPri : DARK.textSec }}
              >
                {item.label}
              </Typography>
              <Typography
                variant="caption"
                style={{ color: DARK.textMute, marginTop: 2 }}
              >
                {item.sub}
              </Typography>
            </VStack>

            {/* Strength bars */}
            <HStack alignItems="flex-end" gap={2} style={{ height: 20, flexShrink: 0 }}>
              {[1, 2, 3, 4, 5].map((b) => (
                <div
                  key={b}
                  style={{
                    width: 4,
                    height: `${20 + b * 14}%`,
                    borderRadius: 2,
                    background:
                      b <= bars ? (active ? BRAND.primary : DARK.textMute) : DARK.border,
                    transition: 'background .15s ease',
                  }}
                />
              ))}
            </HStack>
          </button>
        );
      })}
    </VStack>
  );
}
