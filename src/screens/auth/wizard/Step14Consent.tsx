import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type { ConsentCategory, ConsentValue } from '../../../types/profile-v2';

type ConsentKey = keyof ConsentCategory;

const ROW_KEYS: ConsentKey[] = [
  'training_objective', 'training_history', 'pain_operational_restriction',
  'relevant_comorbidity', 'sensitive_medication', 'emotional_psychiatric_health', 'body_rhythm',
];
const SENSITIVE_KEYS = new Set<ConsentKey>(['relevant_comorbidity', 'sensitive_medication', 'emotional_psychiatric_health', 'body_rhythm']);

const VALUES: ConsentValue[] = ['share', 'summary', 'authorized_only', 'hidden'];
const VALUE_COLOR: Record<ConsentValue, string> = {
  share:          '#2DD4E0',
  summary:        '#2DD4E0',
  authorized_only:'#F5A623',
  hidden:         '#EF5B3C',
};

const DEFAULT_PERSONAL: ConsentCategory = {
  training_objective:           'share',
  training_history:             'share',
  pain_operational_restriction: 'share',
  relevant_comorbidity:         'authorized_only',
  sensitive_medication:         'authorized_only',
  emotional_psychiatric_health: 'hidden',
  body_rhythm:                  'authorized_only',
};
const DEFAULT_STUDIO: ConsentCategory = {
  training_objective:           'share',
  training_history:             'summary',
  pain_operational_restriction: 'summary',
  relevant_comorbidity:         'hidden',
  sensitive_medication:         'hidden',
  emotional_psychiatric_health: 'hidden',
  body_rhythm:                  'hidden',
};

export function Step14Consent({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const consent = data.consent ?? {
    personal: DEFAULT_PERSONAL,
    studio:   DEFAULT_STUDIO,
    allow_ai_adaptation: true,
    maintain_access_log: true,
  };

  const setPersonal = (key: ConsentKey, v: ConsentValue) =>
    onUpdate({ consent: { ...consent, personal: { ...consent.personal, [key]: v } } });

  const setStudio = (key: ConsentKey, v: ConsentValue) =>
    onUpdate({ consent: { ...consent, studio: { ...consent.studio, [key]: v } } });

  const consentLabel = (v: ConsentValue) => tr(`wizard.step14.values.${v}`);

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack} badge="lgpd" title={tr('wizard.step14.title')} subtitle={tr('wizard.step14.subtitle')} />

      
      

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)', gap: 6, marginBottom: 8, paddingLeft: 4 }}>
        <div/>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: textMute(dark), textAlign: 'center' }}>
          {tr('wizard.step14.personal')}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: textMute(dark), textAlign: 'center' }}>
          {tr('wizard.step14.studio')}
        </div>
      </div>

      <VStack gap={8} style={{ marginBottom: 20 }}>
        {ROW_KEYS.map(rowKey => {
          const sensitive = SENSITIVE_KEYS.has(rowKey);
          return (
          <div key={rowKey} style={{
            display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)', gap: 6, alignItems: 'center',
            padding: '10px 8px', borderRadius: 10, minWidth: 0,
            background: sensitive ? `${accent}08` : surfRaised(dark),
            border: `1px solid ${sensitive ? `${accent}33` : borderSubtle(dark)}`,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: textPri(dark), lineHeight: 1.3 }}>
              {tr(`wizard.step14.rows.${rowKey}`)}
              {sensitive && (
                <span style={{ display: 'block', fontSize: 10, color: accent, fontWeight: 700, letterSpacing: '.04em', marginTop: 2 }}>
                  {tr('wizard.step14.sensitive')}
                </span>
              )}
            </div>
            <ConsentPicker
              value={(consent.personal?.[rowKey] ?? DEFAULT_PERSONAL[rowKey]) as ConsentValue}
              onChange={v => setPersonal(rowKey, v)}
              labelFn={consentLabel}
            />
            <ConsentPicker
              value={(consent.studio?.[rowKey] ?? DEFAULT_STUDIO[rowKey]) as ConsentValue}
              onChange={v => setStudio(rowKey, v)}
              labelFn={consentLabel}
            />
          </div>
        );})}
      </VStack>

      <VStack gap={12} style={{ marginBottom: 16 }}>
        <GlobalToggle
          label={tr('wizard.step14.aiUseLabel')}
          description={tr('wizard.step14.aiUseDesc')}
          on={consent.allow_ai_adaptation}
          onChange={v => onUpdate({ consent: { ...consent, allow_ai_adaptation: v } })}
          dark={dark}
        />
        <GlobalToggle
          label={tr('wizard.step14.maintainHistoryLabel')}
          description={tr('wizard.step14.maintainHistoryDesc')}
          on={consent.maintain_access_log}
          onChange={v => onUpdate({ consent: { ...consent, maintain_access_log: v } })}
          dark={dark}
        />
      </VStack>

      <p style={{ fontSize: 11, color: textMute(dark), lineHeight: 1.5, margin: 0 }}>
        {tr('wizard.step14.revokeNote')}
      </p>

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>
    </VStack>
  );
}

function ConsentPicker({ value, onChange, labelFn }: {
  value: ConsentValue; onChange: (v: ConsentValue) => void; labelFn: (v: ConsentValue) => string;
}) {
  const next = () => {
    const idx = VALUES.indexOf(value);
    onChange(VALUES[(idx + 1) % VALUES.length] as ConsentValue);
  };
  const color = VALUE_COLOR[value];
  return (
    <button onClick={next} style={{
      padding: '6px 4px', borderRadius: 8, textAlign: 'center',
      background: `${color}18`, border: `1.5px solid ${color}44`,
      fontFamily: 'inherit', cursor: 'pointer', width: '100%', minWidth: 0,
      boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color, letterSpacing: '.04em', lineHeight: 1.3, wordBreak: 'break-word' }}>
        {labelFn(value)}
      </span>
    </button>
  );
}

function GlobalToggle({ label, description, on, onChange, dark }: {
  label: string; description: string; on: boolean;
  onChange: (v: boolean) => void; dark: boolean;
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark), marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: textSec(dark), lineHeight: 1.4 }}>{description}</div>
      </div>
      <Toggle on={on} onChange={onChange}/>
    </div>
  );
}
