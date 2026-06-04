import type { CSSProperties } from 'react';
import { BRAND } from './tokens';

// ── Theme bridge ─────────────────────────────────────────────────────────────
// These return CSS custom properties (defined in theme/themes.css) instead of
// resolving hex by the `dark` flag. The active palette is chosen once on <html>
// via data-theme (App.tsx). The `dark` param is kept so the hundreds of existing
// call sites compile unchanged; it is intentionally ignored — the root theme
// decides. (Trainer is always-dark §8; client toggles client-dark|client-light.)
/* eslint-disable @typescript-eslint/no-unused-vars */
export const surfRaised   = (_dark?: boolean): string => 'var(--surface)';
export const surfSunken   = (_dark?: boolean): string => 'var(--sunken)';
export const borderSubtle = (_dark?: boolean): string => 'var(--border)';
export const textPri      = (_dark?: boolean): string => 'var(--text-pri)';
export const textSec      = (_dark?: boolean): string => 'var(--text-sec)';
export const textMute     = (_dark?: boolean): string => 'var(--text-mute)';
/* eslint-enable @typescript-eslint/no-unused-vars */

export const iconBtn = (_dark?: boolean): CSSProperties => ({
  background:   'none',
  border:       'none',
  cursor:       'pointer',
  color:        'var(--text-pri)',
  padding:      '8px',
  borderRadius: '8px',
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
});

export const ghostBtn = (_dark?: boolean): CSSProperties => ({
  background:   'transparent',
  border:       '1px solid var(--border)',
  cursor:       'pointer',
  color:        'var(--text-pri)',
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

export const textBtn = (_dark?: boolean): CSSProperties => ({
  background:   'transparent',
  border:       'none',
  cursor:       'pointer',
  color:        'var(--text-sec)',
  fontSize:     '13px',
  fontFamily:   'inherit',
  padding:      '12px',
});

