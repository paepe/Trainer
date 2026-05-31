import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader } from './atoms';
import type { WizardStepProps } from './types';
import type { RiskLevel, OperationalRiskFlags, RiskClassification } from '../../../types/profile-v2';

// ── Risk engine (client-side approximation — backend validates on generation) ─

function computeRisk(data: WizardStepProps['data']): RiskClassification {
  let score = 0;

  // RN-1.1 — Any declared health condition adds baseline risk
  const health = data.declared_health;
  if (health?.has_condition) score += 1;

  // RN-1.2 — High-risk health categories trigger significant elevation
  const HIGH_RISK_HEALTH = ['cardiovascular', 'respiratory', 'neurological', 'post_operative'];
  if (health?.categories?.some(c => HIGH_RISK_HEALTH.includes(c))) score += 2;

  // RN-1.3 — Comorbidities: any presence adds +1; critical cardiovascular/renal adds +1 more
  const co = data.comorbidities;
  const nonPref = (co?.conditions ?? []).filter(c => c !== 'prefer_not_to_say');
  if (nonPref.length > 0) score += 1;
  if (nonPref.some(c => ['cardiovascular', 'renal_condition', 'hypertension'].includes(c))) score += 1;

  // RN-1.4 — Functional capacity limitations: mobility/balance/autonomy deficits
  const fc = data.functional_capacity;
  if (fc?.mobility === 'low' || fc?.balance === 'unstable') score += 1;
  if (fc?.autonomy === 'assisted') score += 1;

  // RN-1.5 — Pain level: severe pain is a safety signal
  if (fc?.pain_level === 'severe') score += 2;
  else if (fc?.pain_level === 'moderate') score += 1;

  // RN-1.6 — Access limitation: restricted environment reduces safety options
  if (fc?.access_level === 'limited') score += 1;

  // RN-1.7 — Sensitive factor declarations elevate privacy and validation requirements
  const sf = data.sensitive_factors;
  if (sf?.declares_emotional_history) score += 1;
  if (sf?.declares_recreational_substance) score += 1;

  // RN-1.8 — Final classification thresholds → R0–R4
  const level: RiskLevel =
    score === 0 ? 'R0' :
    score <= 1  ? 'R1' :
    score <= 3  ? 'R2' :
    score <= 6  ? 'R3' : 'R4';

  const flags: OperationalRiskFlags = {
    active_allowed:              level !== 'R4',
    human_validation_required:   ['R3', 'R4'].includes(level),
    ai_privacy_masking_required: ['R2', 'R3', 'R4'].includes(level),
    safety_gate_required:        ['R3', 'R4'].includes(level),
  };

  return { level, flags, computed_at: new Date().toISOString() };
}

const RISK_META: Record<RiskLevel, { label: string; color: string; description: string }> = {
  R0: { label: 'No restrictions',  color: '#2DD4E0', description: 'Profile with no identified conditions. AI-led with no restrictions.' },
  R1: { label: 'Low',               color: '#4ade80', description: 'Mild conditions. Normal progression with occasional attention.' },
  R2: { label: 'Moderate',          color: '#F5A623', description: 'Moderate conditions. Privacy masking active. Safety Gate activated.' },
  R3: { label: 'High',              color: '#f97316', description: 'Requires human validation. AI operates in conservative mode.' },
  R4: { label: 'Critical',          color: '#EF5B3C', description: 'AI-led blocked. Professional review required before proceeding.' },
};

const RISK_LEVELS: RiskLevel[] = ['R0', 'R1', 'R2', 'R3', 'R4'];

interface Step15Props extends WizardStepProps {
  onGenerate: (risk: RiskClassification) => void;
  generating: boolean;
}

export function Step15RiskClassification({ dark, primary, accent, data, onUpdate, onBack, onSaveLater, stepNum, totalSteps, onGenerate, generating }: Step15Props) {
  const risk = React.useMemo(() => computeRisk(data), [data]);
  const meta = RISK_META[risk.level];

  return (
    <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary} badge="technical"/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Operational risk classification
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 24px', lineHeight: 1.55 }}>
        Calculated from the previous blocks. You can review and request human validation.
      </p>

      {/* Risk badge */}
      <div style={{
        padding: '20px', borderRadius: 18,
        background: `${meta.color}14`,
        border: `2px solid ${meta.color}44`,
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
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

        {/* Flags */}
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
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

      <p style={{ fontSize: 11.5, color: textMute(dark), lineHeight: 1.5, margin: '0 0 24px' }}>
        The classification is <strong style={{ color: textPri(dark) }}>explainable</strong>: you can request details of the factors that weighed into each decision.
      </p>

      <div style={{ flex: 1 }}/>

      {/* Generate CTA */}
      <button
        onClick={() => onGenerate(risk)}
        disabled={generating}
        style={{
          width: '100%', padding: '18px 20px', borderRadius: 14,
          background: generating ? `${primary}88` : primary,
          border: 'none', color: '#0E1A2B',
          fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
          cursor: generating ? 'default' : 'pointer',
          boxShadow: generating ? 'none' : `0 8px 24px ${primary}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'opacity .2s',
        }}
      >
        {generating ? (
          <>
            <Spinner color="#0E1A2B"/>
            Generating Amplified Profile…
          </>
        ) : (
          'Generate Amplified Profile →'
        )}
      </button>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%',
      border: `2.5px solid ${color}44`,
      borderTopColor: color,
      animation: 'spin .6s linear infinite',
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
