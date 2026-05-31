import React from 'react';
import { DARK } from '../../theme/tokens';
import { FieldLabel } from './FieldLabel';

interface DNAFieldProps {
  label?:       string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  type?:        React.InputHTMLAttributes<HTMLInputElement>['type'];
  suffix?:      string;
  mono?:        boolean;
  helper?:      string;
  optional?:    boolean;
  disabled?:    boolean;
}

export const DNAField: React.FC<DNAFieldProps> = ({
  label, value, onChange, placeholder, type = 'text',
  suffix, mono = false, helper, optional = false, disabled = false,
}) => (
  <div style={{ marginBottom: 16 }}>
    {label && <FieldLabel hint={optional ? 'opcional' : undefined}>{label}</FieldLabel>}
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width:        '100%',
          padding:      suffix ? '12px 48px 12px 14px' : '12px 14px',
          borderRadius: 12,
          border:       `1.5px solid ${DARK.border}`,
          background:   DARK.bg,
          color:        DARK.textPri,
          fontSize:     13.5,
          fontFamily:   mono ? '"JetBrains Mono",ui-monospace,monospace' : 'inherit',
          outline:      'none',
          boxSizing:    'border-box',
          opacity:      disabled ? 0.5 : 1,
        }}
      />
      {suffix && (
        <span style={{
          position:   'absolute', right: 14,
          fontFamily: '"JetBrains Mono",ui-monospace,monospace',
          fontSize:   12, color: DARK.textMute, pointerEvents: 'none',
        }}>
          {suffix}
        </span>
      )}
    </div>
    {helper && (
      <p style={{ margin: '4px 0 0', fontSize: 11, color: DARK.textMute, lineHeight: 1.4 }}>
        {helper}
      </p>
    )}
  </div>
);
