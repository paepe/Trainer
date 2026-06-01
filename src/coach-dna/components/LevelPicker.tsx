import React from 'react';
import { DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';

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

export const LevelPicker: React.FC<LevelPickerProps> = ({ value, onChange, items }) => {
  const { t } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(item => {
        const active = value === item.value;
        const bars   = 5 - item.value + 1;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            style={{
              display:      'flex', alignItems: 'center', gap: 12,
              padding:      '12px 14px', borderRadius: 12,
              border:       `1.5px solid ${active ? t.accent : DARK.border}`,
              background:   active ? `${t.accent}14` : DARK.surface,
              cursor:       'pointer', textAlign: 'left', fontFamily: 'inherit',
              transition:   'background .15s, border-color .15s',
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: active ? t.accent : DARK.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Plus Jakarta Sans","Inter",sans-serif',
              fontSize: 15, fontWeight: 800,
              color: active ? '#fff' : DARK.textMute,
            }}>
              {item.value}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: active ? DARK.textPri : DARK.textSec }}>
                {item.label}
              </div>
              <div style={{ fontSize: 11.5, color: DARK.textMute, marginTop: 2 }}>
                {item.sub}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20, flexShrink: 0 }}>
              {[1, 2, 3, 4, 5].map(b => (
                <div key={b} style={{
                  width:        4,
                  height:       `${20 + b * 14}%`,
                  borderRadius: 2,
                  background:   b <= bars ? (active ? t.accent : DARK.textMute) : DARK.border,
                  transition:   'background .15s',
                }}/>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
};
