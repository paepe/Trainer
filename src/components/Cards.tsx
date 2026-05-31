import React from 'react';
import { Typography } from '../ui/Typography';
import { HStack, VStack } from '../ui/Layout';
import { DARK } from '../theme/tokens';
import { Badge } from '../ui/Badge';

// Common colors from perf-atoms
const C = {
  cyan:     '#0F8C85',
  navy:     '#0E1A2B',
  green:    '#00C853',
  coral:    '#EF5B3C',
  amber:    '#F5A623',
  lavender: '#8B5CF6',
};

// ── StatCard ───────────────────────────────────────────────────────────

interface StatCardProps {
  kicker:    string;
  value:     string;
  sub?:      string;
  color?:    string;
  big?:      boolean;
  deltaTone?: 'good' | 'bad' | 'neutral';
}

export function StatCard({ kicker, value, sub, color = C.cyan, big, deltaTone = 'neutral' }: StatCardProps) {
  const subColor = deltaTone === 'good' ? C.green : deltaTone === 'bad' ? C.coral : DARK.textSec;
  return (
    <VStack
      padding={12}
      style={{
        borderRadius: 12, 
        background: DARK.surface, 
        border: `1px solid ${DARK.border}`,
      }}
    >
      <Typography variant="overline" color="muted" style={{ marginBottom: 4 }}>
        {kicker}
      </Typography>
      <div style={{
        fontFamily: '"Plus Jakarta Sans","Inter",system-ui,sans-serif', 
        fontSize: big ? 26 : 22, 
        fontWeight: 800,
        letterSpacing: '-0.02em', 
        lineHeight: 1.05, 
        color,
      }}>
        {value}
      </div>
      {sub && (
        <Typography variant="caption" style={{ color: subColor, marginTop: 2 }}>
          {sub}
        </Typography>
      )}
    </VStack>
  );
}

// ── NavCard ───────────────────────────────────────────────────────────────────

interface NavCardProps {
  icon:     React.ReactNode;
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
      background: DARK.surface, border: `1px solid ${DARK.border}`,
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
      <VStack style={{ flex: 1 }}>
        <Typography variant="body" weight={700} style={{ fontFamily: '"Plus Jakarta Sans","Inter",system-ui,sans-serif' }}>
          {title}
        </Typography>
        <Typography variant="caption" color="secondary">
          {sub}
        </Typography>
      </VStack>
      <span style={{ color: DARK.textMute, fontSize: 12 }}>›</span>
    </button>
  );
}

// ── InsightCard ───────────────────────────────────────────────────────────────

interface InsightCardProps {
  severity: 'positive' | 'warning' | 'critical' | 'info';
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
  const color = SEVERITY_COLORS[severity] || C.cyan;
  
  return (
    <VStack
      padding="12px 14px"
      style={{
        borderRadius: 12,
        background: DARK.surface,
        border: `1px solid ${DARK.border}`, 
        borderLeftWidth: 3, 
        borderLeftColor: color,
      }}
    >
      <HStack gap={8} style={{ marginBottom: 4 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 4,
          background: `${color}22`, color: color,
          fontFamily: '"JetBrains Mono",ui-monospace,monospace', fontSize: 9, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {severity}
        </span>
        <Typography variant="body" weight={700}>{title}</Typography>
      </HStack>
      <Typography variant="caption" color="secondary" style={{ marginBottom: 2 }}>
        {data}
      </Typography>
      <Typography variant="caption" color="muted" style={{ fontStyle: 'italic', marginBottom: 4 }}>
        {interp}
      </Typography>
      <Typography variant="caption" style={{ fontFamily: '"JetBrains Mono",ui-monospace,monospace', color }}>
        → {action}
      </Typography>
    </VStack>
  );
}
