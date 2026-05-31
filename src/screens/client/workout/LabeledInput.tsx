import React from 'react';
import { surfRaised, borderSubtle, textPri, textMute } from '../../../theme';

interface LabeledInputProps {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  type:     string;
  dark:     boolean;
}

export function LabeledInput({ label, value, onChange, type, dark }: LabeledInputProps) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="decimal"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: 10,
          border: `1.5px solid ${borderSubtle(dark)}`,
          background: surfRaised(dark), color: textPri(dark),
          fontFamily: 'inherit', fontSize: 15, fontWeight: 600, outline: 'none',
        }}
      />
    </div>
  );
}
