import React from 'react';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  full?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Button({ 
  children, 
  onClick, 
  loading, 
  full, 
  variant = 'primary', 
  size = 'md', 
  style, 
  ...rest 
}: ButtonProps) {
  const styles = {
    primary: { background: BRAND.primary, color: DARK.bg, border: 'none' },
    ghost:   { background: 'transparent', color: DARK.textSec, border: `1px solid ${DARK.border}` },
    danger:  { background: `${BRAND.accent}18`, color: BRAND.accent, border: 'none' },
  };
  
  const pad = size === 'sm' ? '7px 14px' : '11px 22px';
  const fs  = size === 'sm' ? 12 : 14;
  
  return (
    <button 
      onClick={onClick} 
      disabled={loading} 
      style={{
        padding: pad, 
        borderRadius: 10, 
        fontSize: fs, 
        fontWeight: 700,
        cursor: loading ? 'default' : 'pointer', 
        width: full ? '100%' : 'auto',
        opacity: loading ? 0.7 : 1, 
        fontFamily: 'inherit', 
        transition: 'opacity .12s',
        ...styles[variant],
        ...style,
      }} 
      {...rest}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}
