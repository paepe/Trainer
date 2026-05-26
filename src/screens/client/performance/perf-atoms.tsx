import React from 'react';
import { C } from './perf-engines';

// ── Design tokens (M5 spec §2) ────────────────────────────────────────────────

export const T = {
  navy:       '#0E1A2B',
  navyDeep:   '#08111E',
  surf:       '#142233',
  surf2:      '#1A2A40',
  border:     '#1F2E45',
  borderSoft: '#243650',
  text:       '#FFFFFF',
  textSec:    'rgba(255,255,255,.65)',
  textMute:   'rgba(255,255,255,.40)',
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

const TONE_COLORS: Record<string, string> = {
  cyan:     C.cyan,
  coral:    C.coral,
  amber:    C.amber,
  green:    C.green,
  lavender: C.lavender,
};

export function AIMessage({ title, body, tone = 'cyan', action }: AIMessageProps) {
  const c = TONE_COLORS[tone] || C.cyan;
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
          IA · {title}
        </div>
        <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5 }}>{body}</div>
        {action && (
          <div style={{
            marginTop: 8, padding: '8px 10px', borderRadius: 8,
            background: T.navy, border: `1px dashed ${c}55`,
            fontSize: 12, color: T.textSec,
          }}>
            <span style={{ color: c }}>→</span> <b style={{ color: T.text }}>Ação:</b> {action}
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

interface BodyDiagramProps {
  region?: string | null;
  gender?: string | null;
}

const REGION_MAP: Record<string, { label: string; cy: number }> = {
  lombar:    { label: 'LOMBAR',    cy: 72  },
  costas:    { label: 'COSTAS',    cy: 50  },
  joelho:    { label: 'JOELHO',    cy: 119 },
  ombro:     { label: 'OMBRO',     cy: 34  },
  pescoco:   { label: 'PESCOÇO',   cy: 26  },
  quadril:   { label: 'QUADRIL',   cy: 92  },
  tornozelo: { label: 'TORNOZELO', cy: 149 },
};

// Gender-specific SVG silhouette paths (viewBox 0 0 80 165)
const SILHOUETTES = {
  female: {
    // Narrow shoulders, defined waist, wide hips
    body: `M 27,29 L 53,29 Q 56,37 55,45 Q 55,53 50,60 Q 47,70 57,78 Q 57,89 53,96
           L 54,155 Q 54,158 51,158 Q 48,158 47,153 L 46,98 L 34,98
           L 33,153 Q 32,158 29,158 Q 26,158 26,155 L 27,96
           Q 23,89 23,78 Q 33,70 30,60 Q 25,53 25,45 Q 24,37 27,29 Z`,
    armL: `M 23,35 Q 16,50 14,67 Q 14,74 19,75 Q 24,74 24,62 Q 23,48 23,35 Z`,
    armR: `M 57,35 Q 64,50 66,67 Q 66,74 61,75 Q 56,74 56,62 Q 57,48 57,35 Z`,
  },
  male: {
    // Wide shoulders, straight torso, minimal hip flare
    body: `M 21,29 L 59,29 Q 63,37 60,45 Q 59,53 57,60 Q 56,70 57,78 Q 57,89 53,96
           L 54,155 Q 54,158 51,158 Q 48,158 47,153 L 46,98 L 34,98
           L 33,153 Q 32,158 29,158 Q 26,158 26,155 L 27,96
           Q 23,89 23,78 Q 24,70 23,60 Q 21,53 20,45 Q 17,37 21,29 Z`,
    armL: `M 18,35 Q 10,50 8,67 Q 8,74 14,76 Q 20,75 20,62 Q 18,48 18,35 Z`,
    armR: `M 62,35 Q 70,50 72,67 Q 72,74 66,76 Q 60,75 60,62 Q 62,48 62,35 Z`,
  },
  nb: {
    // Balanced proportions — moderate shoulders and hip width
    body: `M 24,29 L 56,29 Q 60,37 57,45 Q 57,53 53,60 Q 50,70 58,78 Q 58,89 53,96
           L 54,155 Q 54,158 51,158 Q 48,158 47,153 L 46,98 L 34,98
           L 33,153 Q 32,158 29,158 Q 26,158 26,155 L 27,96
           Q 22,89 22,78 Q 30,70 27,60 Q 23,53 23,45 Q 20,37 24,29 Z`,
    armL: `M 21,35 Q 14,50 12,67 Q 12,74 17,75 Q 22,74 22,62 Q 21,48 21,35 Z`,
    armR: `M 59,35 Q 66,50 68,67 Q 68,74 63,75 Q 58,74 58,62 Q 59,48 59,35 Z`,
  },
};

function resolveGender(gender?: string | null): keyof typeof SILHOUETTES {
  if (gender === 'female')                                       return 'female';
  if (gender === 'male')                                         return 'male';
  if (gender === 'non-binary' || gender === 'prefer_not_to_say') return 'nb';
  return 'male';
}

export function BodyDiagram({ region, gender }: BodyDiagramProps) {
  const reg          = region ? REGION_MAP[region.toLowerCase()] : null;
  const highlightCy  = reg?.cy ?? 72;
  const highlightLabel = reg?.label ?? (region?.toUpperCase() ?? '');
  const hasHighlight = !!region;
  const sil          = SILHOUETTES[resolveGender(gender)];

  const fill   = `${C.cyan}18`;
  const stroke = `${C.cyan}66`;
  const gradId = 'body-holo';

  return (
    <svg viewBox="0 0 80 165" width={80} height={165}>
      <defs>
        <linearGradient id={gradId} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor={C.cyan} stopOpacity={0.30}/>
          <stop offset="50%"  stopColor={C.cyan} stopOpacity={0.10}/>
          <stop offset="100%" stopColor={C.cyan} stopOpacity={0.03}/>
        </linearGradient>
      </defs>

      {/* Arms (behind body) */}
      <path d={sil.armL} fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1"/>
      <path d={sil.armR} fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1"/>

      {/* Head */}
      <circle cx="40" cy="13" r="10"
        fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1.2"/>

      {/* Neck */}
      <rect x="37" y="23" width="6" height="8" rx="2"
        fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1"/>

      {/* Body silhouette (torso + legs) */}
      <path d={sil.body} fill={`url(#${gradId})`} stroke={stroke} strokeWidth="1.2"/>

      {/* Highlight zone */}
      {hasHighlight && (
        <>
          <ellipse cx="40" cy={highlightCy} rx="13" ry="7"
            fill={`${C.coral}44`} stroke={C.coral} strokeWidth="1.2"/>
          <circle cx="40" cy={highlightCy} r="16"
            fill="none" stroke={C.coral} strokeWidth="0.8" strokeDasharray="3 2"/>
        </>
      )}

      {/* Region label */}
      {hasHighlight && (
        <text x="40" y="163" textAnchor="middle"
          fontSize="7" fontFamily={FF_MONO} fontWeight="700"
          fill={C.coral} letterSpacing="0.06">
          {highlightLabel}
        </text>
      )}
    </svg>
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
