import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type { Comorbidity } from '../../../types/profile-v2';

const CONDITIONS: { value: Comorbidity; label: string }[] = [
  { value: 'hypertension',      label: 'Hypertension'              },
  { value: 'type1_diabetes',    label: 'Type 1 Diabetes'          },
  { value: 'asthma',            label: 'Asthma'                     },
  { value: 'obesity',           label: 'Obesity'                },
  { value: 'osteoporosis',      label: 'Osteoporosis'              },
  { value: 'osteopenia',        label: 'Osteopenia'               },
  { value: 'fibromyalgia',      label: 'Fibromyalgia'             },
  { value: 'chronic_pain',      label: 'Chronic Pain'              },
  { value: 'cardiovascular',    label: 'Cardiovascular condition'  },
  { value: 'renal_condition',   label: 'Renal condition'           },
  { value: 'post_operative',    label: 'Post-operative'           },
  { value: 'pregnancy',         label: 'Pregnancy'                 },
  { value: 'postpartum',        label: 'Postpartum'                },
  { value: 'other',             label: 'Other condition'           },
  { value: 'prefer_not_to_say', label: 'Prefer not to say'     },
];

export function Step06Comorbidities({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const co = data.comorbidities ?? { conditions: [] };
  const [voiceOpen, setVoiceOpen] = React.useState(false);

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
      <WizardHeader currentStep={stepNum} stepPrefix="BLOCK" totalSteps={totalSteps} onBack={onBack} badge="selective" title="Comorbidities and care" subtitle="Only what you feel comfortable sharing. Influences automation and human validation." />

      
      

      <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
        {CONDITIONS.map(c => (
          <Chip
            key={c.value}
            label={c.label}
            active={(co.conditions ?? []).includes(c.value)}
            onClick={() => toggleCondition(c.value)}
            disabled={
              c.value !== 'prefer_not_to_say' &&
              (co.conditions ?? []).includes('prefer_not_to_say')
            }
          />
        ))}
      </HStack>

      <VoiceOption
        note="You can describe your health situation in your own words."
        onClick={() => setVoiceOpen(true)}
      />

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>

      {voiceOpen && (
        <WizardVoiceOverlay dark={dark} primary={primary}
          context="Tell us about your conditions"
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
