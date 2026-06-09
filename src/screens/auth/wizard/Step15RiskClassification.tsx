import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textMute } from '../../../theme';
import { WizardHeader, Typography, VStack, Spacer, Spinner, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type { RiskLevel, OperationalRiskFlags, RiskClassification } from '../../../types/profile-v2';
import { RiskCard } from '../../../components/RiskCard';

function computeRisk(data: WizardStepProps['data']): RiskClassification {
  let score = 0;

  const health = data.declared_health;
  if (health?.has_condition) score += 1;

  const HIGH_RISK_HEALTH = ['cardiovascular', 'respiratory', 'neurological', 'post_operative'];
  if (health?.categories?.some(c => HIGH_RISK_HEALTH.includes(c))) score += 2;

  const co = data.comorbidities;
  const nonPref = (co?.conditions ?? []).filter(c => c !== 'prefer_not_to_say');
  if (nonPref.length > 0) score += 1;
  if (nonPref.some(c => ['cardiovascular', 'renal_condition', 'hypertension'].includes(c))) score += 1;

  const fc = data.functional_capacity;
  if (fc?.mobility === 'low' || fc?.balance === 'unstable') score += 1;
  if (fc?.autonomy === 'assisted') score += 1;

  if (fc?.pain_level === 'severe') score += 2;
  else if (fc?.pain_level === 'moderate') score += 1;

  if (fc?.access_level === 'limited') score += 1;

  const sf = data.sensitive_factors;
  if (sf?.declares_emotional_history) score += 1;
  if (sf?.declares_recreational_substance) score += 1;

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

export function Step15RiskClassification({ dark, primary, accent, data, onUpdate: _onUpdate, onBack, onSaveLater: _onSaveLater, stepNum, totalSteps, onGenerate, generating }: Step15Props) {
  const { t: tr } = useTranslation();
  const risk = React.useMemo(() => computeRisk(data), [data]);
  const [confirmed, setConfirmed] = React.useState(false);
  const requiresConfirmation = ['R3', 'R4'].includes(risk.level);

  const canGenerate = !requiresConfirmation || confirmed;

  const handleGenerate = () => {
    if (!canGenerate) return;
    onGenerate(risk);
  };

  return (
    <VStack padding="20px 24px 32px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack} badge="technical" title={tr('wizard.step15.title')} subtitle={tr('wizard.step15.subtitle')} />

      
      

      <div style={{ marginBottom: 24 }}>
        <RiskCard risk={risk} dark={dark} primary={primary} showScale />
      </div>

      <p style={{ fontSize: 11.5, color: textMute(dark), lineHeight: 1.5, margin: '0 0 24px' }}>
        {tr('wizard.step15.bodyPre')}<strong style={{ color: textPri(dark) }}>{tr('wizard.step15.bodyBold')}</strong>{tr('wizard.step15.bodyPost')}
      </p>

      {requiresConfirmation && (
        <div style={{ marginBottom: 24, padding: 14, borderRadius: 14, border: `1.5px solid ${risk.level === 'R4' ? '#FF4D4D' : '#F5A623'}33`, background: `${risk.level === 'R4' ? '#FF4D4D' : '#F5A623'}0c` }}>
          <Typography variant="body" color="primary" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            {risk.level === 'R4'
              ? tr('wizard.step15.confirmationR4')
              : tr('wizard.step15.confirmationR3')}
          </Typography>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <Toggle on={confirmed} onChange={setConfirmed}/>
            <span style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>
              {tr('wizard.step15.confirmCheckbox')}
            </span>
          </label>
        </div>
      )}

      <Spacer />

      <button
        onClick={handleGenerate}
        disabled={generating || !canGenerate}
        style={{
          width: '100%', padding: '18px 20px', borderRadius: 14,
          background: generating || !canGenerate ? `${primary}55` : primary,
          border: 'none', color: '#0E1A2B',
          fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
          cursor: generating || !canGenerate ? 'default' : 'pointer',
          boxShadow: generating || !canGenerate ? 'none' : `0 8px 24px ${primary}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'opacity .2s',
        }}
      >
        {generating ? (
          <>
            <Spinner color="#0E1A2B"/>
            {tr('wizard.step15.generating')}
          </>
        ) : (
          tr('wizard.step15.generateBtn')
        )}
      </button>
    </VStack>
  );
}
