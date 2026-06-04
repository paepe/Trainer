import React from 'react';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';

export type BadgeVariant = 'default' | 'sensitive' | 'selective' | 'blinded' | 'opt-in' | 'lgpd' | 'technical';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
}

const BADGE_CFG: Record<BadgeVariant, { bg: string; fg: string; label?: string }> = {
  default:    { bg: `${BRAND.primary}18`, fg: BRAND.primary },
  sensitive:  { bg: '#EF5B3C22', fg: '#EF5B3C', label: 'SENSITIVE' },
  selective:  { bg: '#F5A62322', fg: '#F5A623', label: 'SELECTIVE' },
  blinded:    { bg: '#EF5B3C22', fg: '#EF5B3C', label: 'CONFIDENTIAL' },
  'opt-in':   { bg: '#8B5CF622', fg: '#8B5CF6', label: 'OPT-IN' },
  lgpd:       { bg: '#2DD4E022', fg: '#2DD4E0', label: 'LGPD' },
  technical:  { bg: '#F5A62322', fg: '#F5A623', label: 'TECHNICAL' },
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const { bg, fg, label } = BADGE_CFG[variant];
  return (
    <span 
      style={{ 
        display: 'inline-block',
        padding: '3px 9px', 
        borderRadius: 999, 
        fontSize: 10, 
        fontWeight: 700, 
        background: bg, 
        color: fg, 
        letterSpacing: '.06em', 
        textTransform: 'uppercase', 
        whiteSpace: 'nowrap' 
      }}
    >
      {label || children}
    </span>
  );
}
