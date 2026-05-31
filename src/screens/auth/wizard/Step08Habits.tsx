import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, Chip, ChipGroup, AINote } from './atoms';
import type { WizardStepProps } from './types';
import type { LifestyleBarrier } from '../../../types/profile-v2';

const BARRIERS: { value: LifestyleBarrier; label: string }[] = [
  { value: 'sedentary_prolonged', label: 'Prolonged sedentary lifestyle'         },
  { value: 'low_hydration',       label: 'Low hydration'                },
  { value: 'executive_routine',   label: 'Very intense routine'            },
  { value: 'chronic_stress',      label: 'High stress level'            },
  { value: 'irregular_meals',     label: 'Irregular eating'           },
  { value: 'frequent_travel',     label: 'Frequent travel'              },
  { value: 'caregiver_duty',      label: 'Caregiving duties'          },
  { value: 'smoking',             label: 'Smoking'                       },
  { value: 'regular_alcohol',     label: 'Regular alcohol consumption'       },
  { value: 'transport_barriers',  label: 'Transport difficulties'     },
  { value: 'sleep_disorder',      label: 'Irregular or insufficient sleep'  },
  { value: 'chronic_fatigue',     label: 'Frequent fatigue'                },
  { value: 'emotional_eating',    label: 'Emotional eating'    },
  { value: 'sedentary_commute',   label: 'Very sedentary work'       },
  { value: 'financial_stress',    label: 'Financial stress'              },
];

export function Step08Habits({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const habits = data.habits ?? { lifestyle_barriers: [] };

  const toggle = (v: LifestyleBarrier) => {
    const cur = habits.lifestyle_barriers ?? [];
    onUpdate({ habits: { lifestyle_barriers: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] } });
  };

  const hasSelection = (habits.lifestyle_barriers?.length ?? 0) > 0;

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Some routines can<br/>influence training
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        Select only what you find relevant. This data helps the plan respect your reality.
      </p>

      <ChipGroup style={{ marginBottom: 20 }}>
        {BARRIERS.map(b => (
          <Chip
            key={b.value}
            label={b.label}
            selected={(habits.lifestyle_barriers ?? []).includes(b.value)}
            onToggle={() => toggle(b.value)}
            dark={dark} primary={primary}
          />
        ))}
      </ChipGroup>

      {hasSelection && (
        <AINote
          dark={dark} primary={primary}
          text="This data feeds internal fatigue, adherence, and recovery predictions. Nothing is displayed directly to the trainer without authorization."
        />
      )}

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving} dark={dark} primary={primary}/>
    </div>
  );
}
