import React from 'react';
import { BRAND, DARK } from '../../theme/tokens';
import { FieldLabel } from './FieldLabel';

interface DNASliderProps {
  label?:  string;
  value:   number;
  onChange: (v: number) => void;
  min:     number;
  max:     number;
  step?:   number;
  suffix?: string;
  color?:  string;
}

export const DNASlider: React.FC<DNASliderProps> = ({
  label, value, onChange, min, max, step = 1, suffix = '', color = BRAND.primary,
}) => (
  <div style={{ marginBottom: 4 }}>
    {label && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <FieldLabel>{label}</FieldLabel>
        <span style={{
          fontFamily: '"JetBrains Mono",ui-monospace,monospace',
          fontSize: 15, fontWeight: 700, color, letterSpacing: '-0.01em',
        }}>
          {value}{suffix}
        </span>
      </div>
    )}
    <input
      type="range"
      min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
      <span style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 10, color: DARK.textMute }}>
        {min}{suffix}
      </span>
      <span style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 10, color: DARK.textMute }}>
        {max}{suffix}
      </span>
    </div>
  </div>
);
