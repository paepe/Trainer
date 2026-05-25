import React from 'react';
import { supabase } from '../../supabase';
import { BRAND, DARK } from '../../theme/tokens';

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
        <h1 style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
        {sub && <div style={{ fontSize: 13, color: C.textSec, marginTop: 4 }}>{sub}</div>}
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
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
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
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textSec, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
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
              <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.textMute, letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '14px 20px', fontSize: 14 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
}

export function Badge({ children }: BadgeProps) {
  return (
    <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${C.primary}18`, color: C.primary, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

// ─── EMPTY ────────────────────────────────────────────────────
interface EmptyProps {
  text: string;
}

export function Empty({ text }: EmptyProps) {
  return <div style={{ padding: '28px 0', textAlign: 'center', color: C.textMute, fontSize: 13 }}>{text}</div>;
}

// ─── BUTTON ───────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  full?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Btn({ children, onClick, loading, full, variant = 'primary', size = 'md', style, ...rest }: BtnProps) {
  const styles = {
    primary: { background: C.primary,  color: '#07101D', border: 'none' },
    ghost:   { background: 'transparent', color: C.textSec, border: `1px solid ${C.border}` },
    danger:  { background: `${C.accent}18`, color: C.accent, border: 'none' },
  };
  const pad = size === 'sm' ? '7px 14px' : '11px 22px';
  const fs  = size === 'sm' ? 12 : 14;
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: pad, borderRadius: 10, fontSize: fs, fontWeight: 700,
      cursor: loading ? 'default' : 'pointer', width: full ? '100%' : 'auto',
      opacity: loading ? 0.7 : 1, fontFamily: 'inherit', transition: 'opacity .12s',
      ...styles[variant],
      ...style,
    }} {...rest}>
      {loading ? 'Loading…' : children}
    </button>
  );
}

// ─── FIELD ────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function Field({ label, value, onChange, placeholder, multiline }: FieldProps) {
  const style = { padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 14, outline: 'none', width: '100%', resize: 'vertical' as const };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={style}/>
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style}/>
      }
    </label>
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
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.textPri, fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🚫</div>
        <h2 style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', margin: '0 0 10px' }}>Access denied</h2>
        <p style={{ color: C.textSec }}>This dashboard requires a Studio Admin account.</p>
        <Btn onClick={onSignOut} full style={{ marginTop: 24 }}>Sign out</Btn>
      </div>
    </div>
  );
}

// ─── LOGIN VIEW ───────────────────────────────────────────────
export function LoginView() {
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function login() {
    setLoading(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.textPri }}>
      <div style={{ width: 380 }}>
        <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
          Tr<span style={{ color: C.primary }}>AI</span>ner Studio
        </div>
        <p style={{ color: C.textSec, marginBottom: 32 }}>Sign in to manage your studio.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            style={{ padding: '14px 16px', borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 15, outline: 'none' }}/>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ padding: '14px 16px', borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.textPri, fontSize: 15, outline: 'none' }}/>
        </div>
        {err && <div style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <Btn onClick={login} loading={loading} full>Sign in</Btn>
      </div>
    </div>
  );
}
