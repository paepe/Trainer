import React from 'react';
import { THEME_VARS as DARK } from '../theme/tokens';
import { Typography } from '../ui/Typography';
import { VStack } from '../ui/Layout';
import bodyFemaleImg from '../assets/body-female.png';
import bodyMaleImg from '../assets/body-male.png';
import bodyBorderlineImg from '../assets/body-borderline.png';

const C = {
  cyan:     '#0F8C85',
  navy:     '#0E1A2B',
  green:    '#00C853',
  coral:    '#EF5B3C',
  amber:    '#F5A623',
};

// ── ScoreRing ──────────────────────────────────────────────────────────

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
          fill="none" stroke={DARK.border} strokeWidth={thin}/>
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={thin}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <VStack
        alignItems="center"
        justifyContent="center"
        gap={1}
        style={{ position: 'absolute', inset: 0 }}
      >
        <span style={{
          fontFamily: '"Plus Jakarta Sans","Inter",system-ui,sans-serif', 
          fontSize: size < 70 ? 16 : 22, 
          fontWeight: 800,
          letterSpacing: '-0.02em', 
          color,
        }}>
          {Math.round(score)}
        </span>
        {label && (
          <Typography variant="overline" color="muted" style={{ fontSize: 8.5, letterSpacing: '0.06em' }}>
            {label}
          </Typography>
        )}
        {sub && (
          <span style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 9, color: DARK.textMute }}>{sub}</span>
        )}
      </VStack>
    </div>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────

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
          fill={DARK.surface} stroke={color} strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

// ── BarChart ───────────────────────────────────────────────────────────

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
              fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 9.5, fontWeight: 600,
              color: isLast ? color : DARK.textMute,
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
              <span style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 9, color: DARK.textMute }}>
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

// ── BodyDiagram ───────────────────────────────────────────────────────

const GENDER_IMG: Record<string, string> = {
  female:            bodyFemaleImg,
  male:              bodyMaleImg,
  'non-binary':      bodyBorderlineImg,
  prefer_not_to_say: bodyBorderlineImg,
};
function resolveBodyImg(gender?: string | null): string {
  return (gender && GENDER_IMG[gender]) ?? bodyMaleImg;
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
        alt="body diagram"
        style={{ width: IMG_W, height: IMG_H, objectFit: 'contain', display: 'block' }}
      />

      {hasHighlight && (
        <svg
          viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          width={IMG_W}
          height={IMG_H}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <ellipse cx={IMG_W / 2} cy={dotY!} rx="14" ry="8"
            fill={`${C.coral}44`} stroke={C.coral} strokeWidth="1.2"/>
          <circle cx={IMG_W / 2} cy={dotY!} r="18"
            fill="none" stroke={C.coral} strokeWidth="0.8" strokeDasharray="3 2"/>
        </svg>
      )}

      {hasHighlight && (
        <div style={{
          textAlign: 'center', fontSize: 7,
          fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontWeight: 700,
          color: C.coral, letterSpacing: '0.06em',
          marginTop: 2,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
