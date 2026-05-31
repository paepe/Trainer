import React from 'react';
import { Icon } from './Icon';
import { textMute, textPri } from '../theme';

interface PillInputProps {
  icon:         string;
  placeholder:  string;
  value:        string;
  onChange:     (value: string) => void;
  type?:        string;
  primary:      string;
  dark:         boolean;
}

export const PillInput: React.FC<PillInputProps> = ({
  icon, placeholder, value, onChange, type = 'text', primary, dark,
}) => {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderRadius: 14,
      background: dark ? '#142233' : '#F4F6FA',
      border: `1.5px solid ${focus ? primary : 'transparent'}`,
      transition: 'border-color .15s',
    }}>
      <Icon name={icon} size={18} color={textMute(dark)} stroke={2}/>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 14, color: textPri(dark), fontFamily: 'inherit', minWidth: 0,
        }}
      />
    </label>
  );
};
