import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, Chip, ChipGroup, VoiceOption } from './atoms';
import type { WizardStepProps } from './types';
import type { Comorbidity } from '../../../types/profile-v2';

const CONDITIONS: { value: Comorbidity; label: string }[] = [
  { value: 'hypertension',      label: 'Hipertensão'              },
  { value: 'type1_diabetes',    label: 'Diabetes tipo 1'          },
  { value: 'asthma',            label: 'Asma'                     },
  { value: 'obesity',           label: 'Obesidade'                },
  { value: 'osteoporosis',      label: 'Osteoporose'              },
  { value: 'osteopenia',        label: 'Osteopenia'               },
  { value: 'fibromyalgia',      label: 'Fibromialgia'             },
  { value: 'chronic_pain',      label: 'Dor crônica'              },
  { value: 'cardiovascular',    label: 'Condição cardiovascular'  },
  { value: 'renal_condition',   label: 'Condição renal'           },
  { value: 'post_operative',    label: 'Pós-operatório'           },
  { value: 'pregnancy',         label: 'Gestação'                 },
  { value: 'postpartum',        label: 'Pós-parto'                },
  { value: 'other',             label: 'Outra condição'           },
  { value: 'prefer_not_to_say', label: 'Prefiro não informar'     },
];

export function Step06Comorbidities({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
  const co = data.comorbidities ?? { conditions: [] };

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
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary} badge="selective"/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Comorbidades e cuidados
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        Apenas o que você se sente confortável informando. Influencia automação e validação humana.
      </p>

      <ChipGroup style={{ marginBottom: 20 }}>
        {CONDITIONS.map(c => (
          <Chip
            key={c.value}
            label={c.label}
            selected={(co.conditions ?? []).includes(c.value)}
            onToggle={() => toggleCondition(c.value)}
            dark={dark} primary={primary}
            disabled={
              c.value !== 'prefer_not_to_say' &&
              (co.conditions ?? []).includes('prefer_not_to_say')
            }
          />
        ))}
      </ChipGroup>

      <VoiceOption dark={dark} primary={primary} note="Você pode descrever sua situação de saúde com suas palavras."/>

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} onSaveLater={onSaveLater} dark={dark} primary={primary}/>
    </div>
  );
}
