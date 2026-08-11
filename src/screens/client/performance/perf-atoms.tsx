import React from 'react';
import { useTranslation } from 'react-i18next';
import { C } from './perf-engines';
import bodyFemaleImg    from '../../../assets/body-female.png';
import bodyMaleImg      from '../../../assets/body-male.png';
import bodyBorderlineImg from '../../../assets/body-borderline.png';

// ── Design tokens (M5 spec §2) ────────────────────────────────────────────────
// Surface/text tokens read the active theme palette (theme/themes.css) via CSS
// custom properties. The dashboard re-themes with the rest of the app through
// the single data-theme attribute on <html> — no runtime dark flag needed.
// (Signature colours stay in `C` from perf-engines, which is role-aware and used
// with alpha concatenation that CSS vars can't express.)

export const T = {
  navy:       'var(--bg)',
  surf:       'var(--surface)',
  surf2:      'var(--surface-3)',
  border:     'var(--border)',
  borderSoft: 'var(--border-soft)',
  text:       'var(--text-pri)',
  textSec:    'var(--text-sec)',
  textMute:   'var(--text-mute)',
} as const;

export const FF_DISPLAY = '"Plus Jakarta Sans","Inter",system-ui,sans-serif';
export const FF_MONO    = '"JetBrains Mono",ui-monospace,SFMono-Regular,monospace';

// Kicker label (mono uppercase)
export function Kicker({ children, color = C.cyan }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: FF_MONO, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.18em', textTransform: 'uppercase', color,
      marginBottom: 4,
    }}>
      {children}
    </div>
  );
}

// ── Section card (§4.4) ───────────────────────────────────────────────────────

interface SectionProps {
  title:    string;
  right?:   React.ReactNode;
  pad?:     boolean;
  children: React.ReactNode;
}

export function Section({ title, right, pad = true, children }: SectionProps) {
  return (
    <div style={{
      background: T.surf, borderRadius: 16, border: `1px solid ${T.border}`,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '11px 14px 9px',
        borderBottom: `1px dashed ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: FF_MONO, fontSize: 10.5, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMute,
        }}>
          {title}
        </span>
        {right}
      </div>
      <div style={{ padding: pad ? 14 : 0 }}>{children}</div>
    </div>
  );
}

// ── StatCard (§4.5) ───────────────────────────────────────────────────────────

interface StatCardProps {
  kicker:    string;
  value:     string;
  sub?:      string;
  color?:    string;
  big?:      boolean;
  deltaTone?: 'good' | 'bad' | 'neutral';
}

export function StatCard({ kicker, value, sub, color = C.cyan, big, deltaTone = 'neutral' }: StatCardProps) {
  const subColor = deltaTone === 'good' ? C.green : deltaTone === 'bad' ? C.coral : T.textSec;
  return (
    <div style={{
      padding: 12, borderRadius: 12, background: T.navy, border: `1px solid ${T.border}`,
    }}>
      <div style={{
        fontFamily: FF_MONO, fontSize: 9.5, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMute,
        marginBottom: 4,
      }}>
        {kicker}
      </div>
      <div style={{
        fontFamily: FF_DISPLAY, fontSize: big ? 26 : 22, fontWeight: 800,
        letterSpacing: '-0.02em', lineHeight: 1.05, color,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: FF_MONO, fontSize: 10.5, color: subColor, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── AIMessage (§4.6) ──────────────────────────────────────────────────────────

interface AIMessageProps {
  icon?:    string;
  title:    string;
  body:     string;
  tone?:    'cyan' | 'coral' | 'amber' | 'green' | 'lavender';
  action?:  string;
}

function toneColor(tone: NonNullable<AIMessageProps['tone']>): string {
  // `C.cyan` is the runtime signature. Resolve it at render time rather than
  // module evaluation so an already-loaded dashboard follows a plan change.
  switch (tone) {
    case 'coral': return C.coral;
    case 'amber': return C.amber;
    case 'green': return C.green;
    case 'lavender': return C.lavender;
    case 'cyan':
    default: return C.cyan;
  }
}

export function AIMessage({ title, body, tone = 'cyan', action }: AIMessageProps) {
  const { t: tr } = useTranslation();
  const c = toneColor(tone);
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: `linear-gradient(135deg, ${c}18 0%, ${c}06 100%)`,
      border: `1px solid ${c}55`,
      display: 'flex', gap: 12,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: `${c}22`, color: c,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>
        ✦
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FF_MONO, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: c,
          marginBottom: 4,
        }}>
          AI · {title}
        </div>
        <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5 }}>{body}</div>
        {action && (
          <div style={{
            marginTop: 8, padding: '8px 10px', borderRadius: 8,
            background: T.navy, border: `1px dashed ${c}55`,
            fontSize: 12, color: T.textSec,
          }}>
            <span style={{ color: c }}>→</span> <b style={{ color: T.text }}>{tr('common.action')}:</b> {action}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ScoreRing (§4.7) ──────────────────────────────────────────────────────────

interface ScoreRingProps {
  score:  number;
  size?:  number;
  color?: string;
  label?: string;
  sub?:   string;
  thin?:  number;
}

export function ScoreRing({ score, size = 90, color = C.cyan, label, sub, thin = 8 }: ScoreRingProps) {
  const r = (size - thin * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={T.border} strokeWidth={thin}/>
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={thin}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 1,
      }}>
        <span style={{
          fontFamily: FF_DISPLAY, fontSize: size < 70 ? 16 : 22, fontWeight: 800,
          letterSpacing: '-0.02em', color,
        }}>
          {Math.round(score)}
        </span>
        {label && (
          <span style={{
            fontFamily: FF_MONO, fontSize: 8.5, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', color: T.textMute,
          }}>
            {label}
          </span>
        )}
        {sub && (
          <span style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>{sub}</span>
        )}
      </div>
    </div>
  );
}

// ── Sparkline (§4.8) ──────────────────────────────────────────────────────────

interface SparklineProps {
  data:      number[];
  color?:    string;
  height?:   number;
  showDots?: boolean;
}

export function Sparkline({ data, color = C.cyan, height = 48, showDots }: SparklineProps) {
  if (data.length < 2) return <div style={{ height }} />;
  const W = 240;
  const H = height;
  const P = 4;
  const maxV = Math.max(...data, 0.1);
  const minV = Math.min(...data);
  const range = maxV - minV || 1;

  const x = (i: number) => P + i * ((W - P * 2) / (data.length - 1));
  const y = (v: number) => H - P - ((v - minV) / range) * (H - P * 2);

  const pts = data.map((v, i) => `${x(i)},${y(v)}`);
  const linePath = pts.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ');
  const areaPath = `${linePath} L${x(data.length - 1)},${H} L${x(0)},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.35}/>
          <stop offset="100%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace('#', '')})`}/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      {showDots && data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)}
          r={i === data.length - 1 ? 3.5 : 2.2}
          fill={T.navy} stroke={color} strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

// ── BarChart (§4.9) ───────────────────────────────────────────────────────────

interface BarChartProps {
  data:    number[];
  labels?: string[];
  color?:  string;
  height?: number;
  suffix?: string;
}

export function BarChart({ data, labels, color = C.cyan, height = 100, suffix = '' }: BarChartProps) {
  const maxV = Math.max(...data, 0.1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: height + 36 }}>
      {data.map((v, i) => {
        const pct = v / (maxV * 1.1);
        const isLast = i === data.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{
              fontFamily: FF_MONO, fontSize: 9.5, fontWeight: 600,
              color: isLast ? color : T.textMute,
            }}>
              {v > 0 ? (v > 999 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)) : ''}{suffix}
            </span>
            <div style={{
              width: '100%', height: height * pct,
              borderRadius: '6px 6px 2px 2px',
              background: isLast
                ? `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`
                : `${color}55`,
              boxShadow: isLast ? `0 0 16px ${color}66` : 'none',
              animation: `growBar .6s ease-out ${i * 0.05}s both`,
              transformOrigin: 'bottom',
            }}/>
            {labels?.[i] && (
              <span style={{ fontFamily: FF_MONO, fontSize: 9, color: T.textMute }}>
                {labels[i]}
              </span>
            )}
          </div>
        );
      })}
      <style>{`@keyframes growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>
    </div>
  );
}

// ── BodyDiagram (§4.11) ───────────────────────────────────────────────────────

const GENDER_IMG: Record<string, string> = {
  female:            bodyFemaleImg,
  male:              bodyMaleImg,
  'non-binary':      bodyBorderlineImg,
  prefer_not_to_say: bodyBorderlineImg,
};
function resolveBodyImg(gender?: string | null): string {
  return (gender && GENDER_IMG[gender]) || bodyMaleImg;
}

interface BodyDiagramProps {
  region?: string | null;
  gender?: string | null;
}

const REGION_MAP: Record<string, { label: string; cy: number }> = {
  neck:       { label: 'NECK',       cy: 26  },
  shoulder:   { label: 'SHOULDER',   cy: 34  },
  upper_back: { label: 'UPPER BACK', cy: 50  },
  lower_back: { label: 'LOWER BACK', cy: 72  },
  elbow:      { label: 'ELBOW',      cy: 100 },
  hip:        { label: 'HIP',        cy: 92  },
  knee:       { label: 'KNEE',       cy: 119 },
  ankle:      { label: 'ANKLE',      cy: 149 },
  wrist:      { label: 'WRIST',      cy: 148 },
  other:      { label: 'OTHER',      cy: 72  },
};

const REGION_PCT: Record<string, number> = {
  neck:       0.155,
  shoulder:   0.205,
  upper_back: 0.305,
  lower_back: 0.435,
  elbow:      0.540,
  hip:        0.555,
  knee:       0.715,
  wrist:      0.870,
  ankle:      0.900,
  other:      0.435,
};

export function BodyDiagram({ region, gender }: BodyDiagramProps) {
  const { t: tr } = useTranslation();
  const IMG_H     = 200;
  const IMG_W     = 100;
  const pct       = region ? (REGION_PCT[region.toLowerCase()] ?? 0.435) : null;
  const dotY      = pct !== null ? Math.round(pct * IMG_H) : null;
  const hasHighlight = dotY !== null;
  const label     = region
    ? (REGION_MAP[region.toLowerCase()]?.label ?? region.toUpperCase())
    : '';

  return (
    <div style={{ position: 'relative', width: IMG_W, height: IMG_H + 16, flexShrink: 0 }}>
      <img
        src={resolveBodyImg(gender)}
        alt={tr('perf.bodyDiagram.alt')}
        style={{ width: IMG_W, height: IMG_H, objectFit: 'contain', display: 'block' }}
      />

      {hasHighlight && (
        <svg
          viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          width={IMG_W}
          height={IMG_H}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <circle cx={IMG_W / 2} cy={dotY!} r="18"
            fill="none" stroke={C.coral} strokeWidth="0.8" strokeDasharray="3 2"/>
        </svg>
      )}

      {hasHighlight && (
        <div style={{
          textAlign: 'center', fontSize: 7,
          fontFamily: FF_MONO, fontWeight: 700,
          color: C.coral, letterSpacing: '0.06em',
          marginTop: 2,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── NavCard ───────────────────────────────────────────────────────────────────

interface NavCardProps {
  icon:     string;
  title:    string;
  sub:      string;
  color?:   string;
  onClick:  () => void;
}

export function NavCard({ icon, title, sub, color = C.cyan, onClick }: NavCardProps) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px', borderRadius: 12,
      background: T.surf, border: `1px solid ${T.border}`,
      cursor: 'pointer', width: '100%', textAlign: 'left',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `${color}22`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FF_DISPLAY, fontSize: 13, fontWeight: 700, color: T.text }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: T.textSec }}>{sub}</div>
      </div>
      <span style={{ color: T.textMute, fontSize: 12 }}>›</span>
    </button>
  );
}

// ── InsightCard ───────────────────────────────────────────────────────────────

interface InsightCardProps {
  severity: string;
  title:    string;
  data:     string;
  interp:   string;
  action:   string;
}

const SEVERITY_COLORS: Record<string, string> = {
  positive: C.green,
  warning:  C.amber,
  critical: C.coral,
  info:     C.cyan,
};

export function InsightCard({ severity, title, data, interp, action }: InsightCardProps) {
  const c = SEVERITY_COLORS[severity] || C.cyan;
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: T.surf, borderLeft: `3px solid ${c}`,
      border: `1px solid ${T.border}`, borderLeftWidth: 3, borderLeftColor: c,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 4,
          background: `${c}22`, color: c,
          fontFamily: FF_MONO, fontSize: 9, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {severity}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      <div style={{ fontSize: 11, color: T.textSec, marginBottom: 2 }}>{data}</div>
      <div style={{ fontSize: 11, color: T.textMute, fontStyle: 'italic', marginBottom: 4 }}>{interp}</div>
      <div style={{ fontFamily: FF_MONO, fontSize: 10, color: c }}>→ {action}</div>
    </div>
  );
}

// ── ScreenWrap + ScreenTitle ──────────────────────────────────────────────────

export function ScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 18px 100px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {children}
    </div>
  );
}

interface ScreenTitleProps {
  kicker: string;
  title:  string;
  sub?:   string;
}

export function ScreenTitle({ kicker, title, sub }: ScreenTitleProps) {
  return (
    <div>
      <Kicker>{kicker}</Kicker>
      <div style={{
        fontFamily: FF_DISPLAY, fontSize: 22, fontWeight: 700,
        letterSpacing: '-0.01em', lineHeight: 1.15, color: T.text,
      }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.45, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}
