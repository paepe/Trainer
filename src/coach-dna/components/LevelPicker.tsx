import React from 'react';
import { BRAND, DARK } from '../../theme/tokens';

interface LevelItem {
  value: number;
  label: string;
  sub:   string;
}

interface LevelPickerProps {
  value:    number | null;
  onChange: (v: number) => void;
  items:    LevelItem[];
}

export const LevelPicker: React.FC<LevelPickerProps> = ({ value, onChange, items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {items.map(item => {
      const active = value === item.value;
      const bars   = 5 - item.value + 1; // value 1 = full (5 bars), value 5 = 1 bar
      return (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          style={{
            display:      'flex', alignItems: 'center', gap: 12,
            padding:      '12px 14px', borderRadius: 12,
            border:       `1.5px solid ${active ? BRAND.primary : DARK.border}`,
            background:   active ? `${BRAND.primary}14` : DARK.surface,
            cursor:       'pointer', textAlign: 'left', fontFamily: 'inherit',
            transition:   'background .15s, border-color .15s',
          }}
        >
          {/* numeric badge */}
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: active ? BRAND.primary : DARK.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Plus Jakarta Sans","Inter",sans-serif',
            fontSize: 15, fontWeight: 800,
            color: active ? '#0E1A2B' : DARK.textMute,
          }}>
            {item.value}
          </div>

          {/* text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: active ? DARK.textPri : DARK.textSec }}>
              {item.label}
            </div>
            <div style={{ fontSize: 11.5, color: DARK.textMute, marginTop: 2 }}>
              {item.sub}
            </div>
          </div>

          {/* strength bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20, flexShrink: 0 }}>
            {[1, 2, 3, 4, 5].map(b => (
              <div key={b} style={{
                width:        4,
                height:       `${20 + b * 14}%`,
                borderRadius: 2,
                background:   b <= bars
                  ? (active ? BRAND.primary : DARK.textMute)
                  : DARK.border,
                transition:   'background .15s',
              }}/>
            ))}
          </div>
        </button>
      );
    })}
  </div>
);
