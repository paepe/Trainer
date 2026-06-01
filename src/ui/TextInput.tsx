import React from 'react';
import { DARK, BRAND } from '../theme/tokens';
import { Icon } from '../components/Icon';

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  suffix?: string;
  mono?: boolean;
  helper?: string;
  optional?: boolean;
  disabled?: boolean;
  icon?: string | React.ReactNode;
  rows?: number;
}

export function TextInput({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  multiline, 
  suffix, 
  mono = false, 
  helper, 
  optional = false, 
  disabled = false,
  icon,
  type = 'text',
  style,
  ...rest
}: TextInputProps) {
  const [focus, setFocus] = React.useState(false);
  
  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: suffix ? '12px 48px 12px 14px' : (icon ? '14px 14px 14px 44px' : '12px 14px'),
    borderRadius: 12,
    border: `1.5px solid ${focus ? BRAND.primary : DARK.border}`,
    background: DARK.bg,
    color: DARK.textPri,
    fontSize: 14,
    fontFamily: mono ? '"JetBrains Mono",ui-monospace,monospace' : 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color .15s',
    resize: 'vertical',
    ...style
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 600, color: DARK.textMute, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {label} {optional && <span style={{ textTransform: 'lowercase', opacity: 0.7 }}>(opcional)</span>}
        </span>
      )}
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <div style={{ position: 'absolute', left: 14, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            {typeof icon === 'string'
              ? <Icon name={icon} size={16} color={focus ? BRAND.primary : DARK.textMute} stroke={2}/>
              : icon}
          </div>
        )}
        
        {multiline ? (
          <textarea 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder} 
            disabled={disabled}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            rows={3} 
            style={baseInputStyle}
            {...(rest as any)}
          />
        ) : (
          <input 
            type={type}
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder} 
            disabled={disabled}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            style={baseInputStyle}
            {...(rest as any)}
          />
        )}
        
        {suffix && !multiline && (
          <span style={{
            position: 'absolute', right: 14,
            fontFamily: '"JetBrains Mono",ui-monospace,monospace',
            fontSize: 12, color: DARK.textMute, pointerEvents: 'none',
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
}
