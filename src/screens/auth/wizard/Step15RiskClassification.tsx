import React from 'react';
import { textPri, textSec, textMute } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type { RiskLevel, OperationalRiskFlags, RiskClassification } from '../../../types/profile-v2';
import { RiskCard } from '../../../components/RiskCard';

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


interface Step15Props extends WizardStepProps {
  onGenerate: (risk: RiskClassification) => void;
  generating: boolean;
}

export function Step15RiskClassification({ dark, primary, accent, data, onUpdate, onBack, onSaveLater, stepNum, totalSteps, onGenerate, generating }: Step15Props) {
  const risk = React.useMemo(() => computeRisk(data), [data]);

  return (
    <VStack padding="20px 24px 32px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix="BLOCK" totalSteps={totalSteps} onBack={onBack} badge="technical" title="Operational risk classification" subtitle="Calculated from the previous blocks. You can review and request human validation." />

      
      

      {/* Risk badge + scale — shared RiskCard component */}
      <div style={{ marginBottom: 24 }}>
        <RiskCard risk={risk} dark={dark} primary={primary} showScale />
      </div>

      <p style={{ fontSize: 11.5, color: textMute(dark), lineHeight: 1.5, margin: '0 0 24px' }}>
        The classification is <strong style={{ color: textPri(dark) }}>explainable</strong>: you can request details of the factors that weighed into each decision.
      </p>

      <Spacer />

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
    </VStack>
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
