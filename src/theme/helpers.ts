import type { CSSProperties } from 'react';
import { BRAND, DARK, LIGHT } from './tokens';

export const surfRaised   = (dark: boolean): string => dark ? DARK.surface  : LIGHT.surface;
export const surfSunken   = (dark: boolean): string => dark ? DARK.bg       : LIGHT.surface2;
export const borderSubtle = (dark: boolean): string => dark ? DARK.border   : LIGHT.border;
export const textPri      = (dark: boolean): string => dark ? DARK.textPri  : LIGHT.textPri;
export const textSec      = (dark: boolean): string => dark ? DARK.textSec  : LIGHT.textSec;
export const textMute     = (dark: boolean): string => dark ? DARK.textMute : LIGHT.textMute;

export const iconBtn = (dark: boolean): CSSProperties => ({
  background:   'none',
  border:       'none',
  cursor:       'pointer',
  color:        dark ? DARK.textPri : LIGHT.textPri,
  padding:      '8px',
  borderRadius: '8px',
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
});

export const ghostBtn = (dark: boolean): CSSProperties => ({
  background:   'transparent',
  border:       `1px solid ${dark ? DARK.border : LIGHT.border}`,
  cursor:       'pointer',
  color:        dark ? DARK.textPri : LIGHT.textPri,
  padding:      '10px 18px',
  borderRadius: '10px',
  fontSize:     '14px',
  fontWeight:   500,
});

export const primaryBtn = (primary: string = BRAND.primary, loading = false): CSSProperties => ({
  background:   primary,
  border:       'none',
  cursor:       'pointer',
  color:        '#0E1A2B',
  padding:      '17px 20px',
  borderRadius: '14px',
  fontSize:     '15px',
  fontWeight:   700,
  width:        '100%',
  fontFamily:   'inherit',
  marginBottom: '12px',
  boxShadow:    `0 8px 22px ${primary}55`,
  opacity:      loading ? 0.7 : 1,
});

export const outlineBtn = (primary: string = BRAND.primary): CSSProperties => ({
  width:        '100%',
  padding:      '16px 20px',
  borderRadius: '14px',
  background:   'transparent',
  color:        primary,
  fontSize:     '15px',
  fontWeight:   600,
  fontFamily:   'inherit',
  cursor:       'pointer',
  border:       `1.5px solid ${primary}`,
});

export const textBtn = (dark: boolean): CSSProperties => ({
  background:   'transparent',
  border:       'none',
  cursor:       'pointer',
  color:        dark ? DARK.textSec : LIGHT.textSec,
  fontSize:     '13px',
  fontFamily:   'inherit',
  padding:      '12px',
});

