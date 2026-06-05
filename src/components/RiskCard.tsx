import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../theme';
import type { RiskClassification, RiskLevel } from '../types/profile-v2';

const RISK_COLORS: Record<RiskLevel, string> = {
  R0: '#2DD4E0', R1: '#4ade80', R2: '#F5A623', R3: '#f97316', R4: '#EF5B3C',
};

export const RISK_LEVELS: RiskLevel[] = ['R0', 'R1', 'R2', 'R3', 'R4'];

const LABEL_KEYS: Record<RiskLevel, string> = {
  R0: 'noRestrictions', R1: 'low', R2: 'moderate', R3: 'high', R4: 'critical',
};

interface RiskCardProps {
  risk:    RiskClassification;
  dark:    boolean;
  primary: string;
  showScale?: boolean;
}

export function RiskCard({ risk, dark, primary, showScale = false }: RiskCardProps) {
  const { t: tr } = useTranslation();
  const color = RISK_COLORS[risk.level];
  const label = tr(`risk.${LABEL_KEYS[risk.level]}`);
  const description = tr(`risk.${LABEL_KEYS[risk.level]}Desc`);

  return (
    <>
      <div style={{
        padding: '20px', borderRadius: 18,
        background: `${color}14`,
        border: `2px solid ${color}44`,
        marginBottom: showScale ? 16 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#0E1A2B', letterSpacing: '-0.02em' }}>
              {risk.level}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color }}>
              {tr('risk.levelBadge', { level: risk.level })}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.01em' }}>
              {label}
            </div>
          </div>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: textSec(dark), lineHeight: 1.5 }}>
          {description}
        </p>

        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--sunken)',
          fontFamily: 'monospace', fontSize: 11, color: primary, lineHeight: 1.7,
        }}>
          {Object.entries(risk.flags).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: textMute(dark) }}>{k}</span>
              {' = '}
              <span style={{ color: v ? '#4ade80' : '#EF5B3C', fontWeight: 700 }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {showScale && (
        <div style={{ display: 'flex', gap: 8 }}>
          {RISK_LEVELS.map(lvl => {
            const c = RISK_COLORS[lvl];
            const active = lvl === risk.level;
            return (
              <div key={lvl} style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, textAlign: 'center',
                background: active ? `${c}22` : surfRaised(dark),
                border: `1.5px solid ${active ? c : borderSubtle(dark)}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: active ? c : textMute(dark) }}>{lvl}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
