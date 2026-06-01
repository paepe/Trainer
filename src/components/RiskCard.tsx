import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../theme';
import type { RiskClassification, RiskLevel } from '../types/profile-v2';

export const RISK_META: Record<RiskLevel, { label: string; color: string; description: string }> = {
  R0: { label: 'No restrictions', color: '#2DD4E0', description: 'Profile with no identified conditions. AI-led with no restrictions.' },
  R1: { label: 'Low',              color: '#4ade80', description: 'Mild conditions. Normal progression with occasional attention.' },
  R2: { label: 'Moderate',         color: '#F5A623', description: 'Moderate conditions. Privacy masking active. Safety Gate activated.' },
  R3: { label: 'High',             color: '#f97316', description: 'Requires human validation. AI operates in conservative mode.' },
  R4: { label: 'Critical',         color: '#EF5B3C', description: 'AI-led blocked. Professional review required before proceeding.' },
};

export const RISK_LEVELS: RiskLevel[] = ['R0', 'R1', 'R2', 'R3', 'R4'];

interface RiskCardProps {
  risk:    RiskClassification;
  dark:    boolean;
  primary: string;
  /** When true, renders the risk scale bar below the card */
  showScale?: boolean;
}

export function RiskCard({ risk, dark, primary, showScale = false }: RiskCardProps) {
  const meta = RISK_META[risk.level];

  return (
    <>
      <div style={{
        padding: '20px', borderRadius: 18,
        background: `${meta.color}14`,
        border: `2px solid ${meta.color}44`,
        marginBottom: showScale ? 16 : 0,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: meta.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#0E1A2B', letterSpacing: '-0.02em' }}>
              {risk.level}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: meta.color }}>
              RISK_LEVEL = "{risk.level}"
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.01em' }}>
              {meta.label}
            </div>
          </div>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: textSec(dark), lineHeight: 1.5 }}>
          {meta.description}
        </p>

        {/* Operational flags */}
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: dark ? '#0E1A2B' : '#F4F6FA',
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

      {/* Risk scale */}
      {showScale && (
        <div style={{ display: 'flex', gap: 8 }}>
          {RISK_LEVELS.map(lvl => {
            const m = RISK_META[lvl];
            const active = lvl === risk.level;
            return (
              <div key={lvl} style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, textAlign: 'center',
                background: active ? `${m.color}22` : surfRaised(dark),
                border: `1.5px solid ${active ? m.color : borderSubtle(dark)}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: active ? m.color : textMute(dark) }}>{lvl}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
