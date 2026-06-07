import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Badge, Typography, TextInput } from '@/ui';
import { supabase } from '../../supabase';
import { BRAND, THEME_VARS as DARK } from '../../theme/tokens';
import { friendlyError } from '../../lib/friendlyError';

export const C = {
  primary:  BRAND.primary,
  accent:   BRAND.accent,
  bg:       DARK.bg,
  surface:  DARK.surface,
  surface2: DARK.surface2,
  border:   DARK.border,
  textPri:  DARK.textPri,
  textSec:  DARK.textSec,
  textMute: DARK.textMute,
};

// ─── PAGE HEADER ─────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, sub, children }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <Typography variant="h1" style={{ fontSize: 26 }}>{title}</Typography>
        {sub && <Typography variant="body" color="secondary" style={{ fontSize: 13, marginTop: 4 }}>{sub}</Typography>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10 }}>{children}</div>}
    </div>
  );
}

// ─── SECTION ──────────────────────────────────────────────────
interface SectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

export function Section({ title, count, children }: SectionProps) {
  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle" weight={700} style={{ fontSize: 13 }}>{title}</Typography>
        <Badge>{count}</Badge>
      </div>
      <div style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  );
}

// ─── ROW ──────────────────────────────────────────────────────
interface RowProps {
  label: string;
  sub?: string | null | undefined;
  badge?: string | undefined;
}

export function Row({ label, sub, badge }: RowProps) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body" weight={600} style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</Typography>
        {sub && <Typography variant="caption" color="secondary" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</Typography>}
      </div>
      {badge && <Badge>{badge}</Badge>}
    </div>
  );
}

// ─── TABLE ────────────────────────────────────────────────────
interface TableProps {
  headers: string[];
  rows: React.ReactNode[][];
}

export function Table({ headers, rows }: TableProps) {
  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '14px 20px', textAlign: 'left' }}>
                <Typography variant="overline" color="muted">{h}</Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '14px 20px' }}>
                  <Typography variant="body">{cell}</Typography>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ─── EMPTY ────────────────────────────────────────────────────
interface EmptyProps {
  text: string;
}

export function Empty({ text }: EmptyProps) {
  return (
    <div style={{ padding: '28px 0', textAlign: 'center' }}>
      <Typography variant="body" color="muted" style={{ fontSize: 13 }}>{text}</Typography>
    </div>
  );
}


// ─── LOADER ───────────────────────────────────────────────────
interface LoaderProps {
  inline?: boolean;
}

export function Loader({ inline }: LoaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: inline ? 200 : '100vh', background: inline ? 'transparent' : C.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.primary, animation: 'spin 0.7s linear infinite' }}/>
    </div>
  );
}

// ─── ACCESS DENIED ────────────────────────────────────────────
interface AccessDeniedProps {
  onSignOut: () => void;
}

export function AccessDenied({ onSignOut }: AccessDeniedProps) {
  const { t: tr } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.textPri, fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🚫</div>
        <Typography variant="h2" style={{ marginBottom: 10 }}>{tr('studio.auth.accessDenied')}</Typography>
        <Typography variant="body" color="secondary">{tr('studio.auth.accessDeniedNote')}</Typography>
        <Button onClick={onSignOut} full style={{ marginTop: 24 }}>{tr('studio.auth.signOut')}</Button>
      </div>
    </div>
  );
}

// ─── LOGIN VIEW ───────────────────────────────────────────────
export function LoginView() {
  const { t: tr } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function login() {
    setLoading(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(friendlyError(error, tr)); setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.textPri }}>
      <div style={{ width: 380 }}>
        <Typography variant="h1" style={{ marginBottom: 6 }}>{tr('studio.auth.brand')}</Typography>
        <Typography variant="body" color="secondary" style={{ marginBottom: 32 }}>{tr('studio.auth.signIn')}</Typography>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
          <TextInput type="email" value={email} onChange={setEmail} placeholder={tr('auth.common.email')} />
          <TextInput type="password" value={pw} onChange={setPw} placeholder={tr('auth.common.password')} onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        {err && <Typography variant="caption" color="accent" style={{ marginBottom: 12, display: 'block' }}>{err}</Typography>}
        <Button onClick={login} loading={loading} full>{tr('studio.auth.signInBtn')}</Button>
      </div>
    </div>
  );
}
