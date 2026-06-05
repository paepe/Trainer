import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type { Comorbidity } from '../../../types/profile-v2';

const CONDITION_KEYS: Comorbidity[] = [
  'hypertension', 'type1_diabetes', 'asthma', 'obesity', 'osteoporosis',
  'osteopenia', 'fibromyalgia', 'chronic_pain', 'cardiovascular',
  'renal_condition', 'post_operative', 'pregnancy', 'postpartum',
  'other', 'prefer_not_to_say',
];

export function Step06Comorbidities({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const co = data.comorbidities ?? { conditions: [] };
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const conditionLabel = (v: Comorbidity) => tr(`wizard.step06.conditions.${v}`);

  const toggleCondition = (v: Comorbidity) => {
    let next: Comorbidity[];
    if (v === 'prefer_not_to_say') {
      next = co.conditions?.includes(v) ? [] : [v];
    } else {
      const without = (co.conditions ?? []).filter(x => x !== 'prefer_not_to_say');
      next = without.includes(v) ? without.filter(x => x !== v) : [...without, v];
    }
    onUpdate({ comorbidities: { conditions: next } });
  };

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack} badge="selective" title={tr('wizard.step06.title')} subtitle={tr('wizard.step06.subtitle')} />

      
      

      <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
        {CONDITION_KEYS.map(v => (
          <Chip
            key={v}
            label={conditionLabel(v)}
            active={(co.conditions ?? []).includes(v)}
            onClick={() => toggleCondition(v)}
            disabled={
              v !== 'prefer_not_to_say' &&
              (co.conditions ?? []).includes('prefer_not_to_say')
            }
          />
        ))}
      </HStack>

      <VoiceOption
        note={tr('wizard.step06.voiceNote')}
        onClick={() => setVoiceOpen(true)}
      />

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>

      {voiceOpen && (
        <WizardVoiceOverlay dark={dark} primary={primary}
          context={tr('wizard.step06.voiceContext')}
          onConfirm={(text) => {
            onUpdate({ comorbidities: { ...co, voice_note: text } });
            setVoiceOpen(false);
            onNext();
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </VStack>
  );
}
