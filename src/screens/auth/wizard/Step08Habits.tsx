import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type { LifestyleBarrier } from '../../../types/profile-v2';

const BARRIER_KEYS: { value: LifestyleBarrier; i18nKey: string }[] = [
  { value: 'sedentary_prolonged', i18nKey: 'sedentary' },
  { value: 'low_hydration',       i18nKey: 'low_hydration' },
  { value: 'executive_routine',   i18nKey: 'intense_routine' },
  { value: 'chronic_stress',      i18nKey: 'high_stress' },
  { value: 'irregular_meals',     i18nKey: 'irregular_eating' },
  { value: 'frequent_travel',     i18nKey: 'frequent_travel' },
  { value: 'caregiver_duty',      i18nKey: 'caregiving' },
  { value: 'smoking',             i18nKey: 'smoking' },
  { value: 'regular_alcohol',     i18nKey: 'alcohol' },
  { value: 'transport_barriers',  i18nKey: 'transport' },
  { value: 'sleep_disorder',      i18nKey: 'irregular_sleep' },
  { value: 'chronic_fatigue',     i18nKey: 'fatigue' },
  { value: 'emotional_eating',    i18nKey: 'emotional_eating' },
  { value: 'sedentary_commute',   i18nKey: 'sedentary_work' },
  { value: 'financial_stress',    i18nKey: 'financial_stress' },
];

export function Step08Habits({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const habits = data.habits ?? { lifestyle_barriers: [] };

  const barrierLabel = (i18nKey: string) => tr(`wizard.step08.habits.${i18nKey}`);

  const toggle = (v: LifestyleBarrier) => {
    const cur = habits.lifestyle_barriers ?? [];
    onUpdate({ habits: { lifestyle_barriers: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] } });
  };

  const hasSelection = (habits.lifestyle_barriers?.length ?? 0) > 0;

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader title={tr('wizard.step08.title')} currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('wizard.step08.heading1')}<br/>{tr('wizard.step08.heading2')}
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        {tr('wizard.step08.subheading')}
      </p>

      <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
        {BARRIER_KEYS.map(b => (
          <Chip
            key={b.value}
            label={barrierLabel(b.i18nKey)}
            active={(habits.lifestyle_barriers ?? []).includes(b.value)}
            onClick={() => toggle(b.value)}
          />
        ))}
      </HStack>

      {hasSelection && (
        <Alert isAI
          text={tr('wizard.step08.alert')}
        />
      )}

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>
    </VStack>
  );
}
