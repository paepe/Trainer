import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, Chip, ChipGroup, AINote } from './atoms';
import type { WizardStepProps } from './types';
import type { LifestyleBarrier } from '../../../types/profile-v2';

const BARRIERS: { value: LifestyleBarrier; label: string }[] = [
  { value: 'sedentary_prolonged', label: 'Sedentarismo prolongado'         },
  { value: 'low_hydration',       label: 'Baixa hidratação'                },
  { value: 'executive_routine',   label: 'Rotina muito intensa'            },
  { value: 'chronic_stress',      label: 'Nível alto de stress'            },
  { value: 'irregular_meals',     label: 'Alimentação irregular'           },
  { value: 'frequent_travel',     label: 'Viagens frequentes'              },
  { value: 'caregiver_duty',      label: 'Cuidado de dependentes'          },
  { value: 'smoking',             label: 'Tabagismo'                       },
  { value: 'regular_alcohol',     label: 'Consumo regular de álcool'       },
  { value: 'transport_barriers',  label: 'Dificuldade de deslocamento'     },
  { value: 'sleep_disorder',      label: 'Sono irregular ou insuficiente'  },
  { value: 'chronic_fatigue',     label: 'Fadiga frequente'                },
  { value: 'emotional_eating',    label: 'Relação emocional com comida'    },
  { value: 'sedentary_commute',   label: 'Trabalho muito sedentário'       },
  { value: 'financial_stress',    label: 'Pressão financeira'              },
];

export function Step08Habits({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
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
        Algumas rotinas podem<br/>influenciar o treino
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        Selecione apenas o que achar relevante. Esses dados ajudam o plano a respeitar sua realidade.
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
          text="Esses dados alimentam predições internas de fadiga, aderência e recuperação. Nada é exibido diretamente ao treinador sem autorização."
        />
      )}

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} onSaveLater={onSaveLater} dark={dark} primary={primary}/>
    </div>
  );
}
