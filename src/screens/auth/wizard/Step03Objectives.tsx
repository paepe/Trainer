import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, GoalCard, Chip, ChipGroup, VoiceOption, SectionLabel } from './atoms';
import type { WizardStepProps } from './types';
import type { PrimaryGoal, SecondaryGoal } from '../../../types/profile-v2';

const PRIMARY_GOALS: { value: PrimaryGoal; label: string; icon: string }[] = [
  { value: 'hypertrophy',       label: 'Hipertrofia',       icon: 'dumbbell' },
  { value: 'weight_loss',       label: 'Emagrecimento',     icon: 'flame'    },
  { value: 'strength_gain',     label: 'Ganho de força',    icon: 'bolt'     },
  { value: 'conditioning',      label: 'Condicionamento',   icon: 'pulse'    },
  { value: 'mobility',          label: 'Mobilidade',        icon: 'heart'    },
  { value: 'longevity',         label: 'Longevidade',       icon: 'moon'     },
  { value: 'return_to_training',label: 'Retorno ao treino', icon: 'rocket'   },
  { value: 'emotional_wellbeing',label:'Bem-estar emocional',icon: 'sparkle' },
];

const SECONDARY_GOALS: { value: SecondaryGoal; label: string }[] = [
  { value: 'hypertrophy',        label: 'Hipertrofia'         },
  { value: 'weight_loss',        label: 'Emagrecimento'       },
  { value: 'strength_gain',      label: 'Ganho de força'      },
  { value: 'conditioning',       label: 'Condicionamento'     },
  { value: 'mobility',           label: 'Mobilidade'          },
  { value: 'longevity',          label: 'Longevidade'         },
  { value: 'return_to_training', label: 'Retorno ao treino'   },
  { value: 'emotional_wellbeing',label: 'Bem-estar emocional' },
  { value: 'daily_autonomy',     label: 'Autonomia diária'    },
  { value: 'body_composition',   label: 'Composição corporal' },
  { value: 'sports_performance', label: 'Performance esportiva' },
  { value: 'balance',            label: 'Equilíbrio'          },
  { value: 'consistency',        label: 'Consistência'        },
];

export function Step03Objectives({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
  const obj = data.objectives ?? { primary_goal: undefined as unknown as PrimaryGoal, secondary_goals: [] };

  const setPrimary = (v: PrimaryGoal) =>
    onUpdate({ objectives: { ...obj, primary_goal: v } });

  const toggleSecondary = (v: SecondaryGoal) => {
    const current = obj.secondary_goals ?? [];
    const next = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
    onUpdate({ objectives: { ...obj, secondary_goals: next } });
  };

  const availableSecondary = SECONDARY_GOALS.filter(g => g.value !== obj.primary_goal);
  const canAdvance = !!obj.primary_goal;

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        O que o movimento pode<br/>melhorar na sua vida?
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        "O que você gostaria que o movimento melhorasse na sua vida?"
      </p>

      <SectionLabel label="Objetivo principal" dark={dark}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {PRIMARY_GOALS.map(g => (
          <GoalCard
            key={g.value}
            label={g.label}
            icon={g.icon}
            selected={obj.primary_goal === g.value}
            onToggle={() => setPrimary(g.value)}
            dark={dark}
            primary={primary}
          />
        ))}
      </div>

      {obj.primary_goal && (
        <>
          <SectionLabel label={`Objetivos secundários (opcional)`} dark={dark}/>
          <ChipGroup style={{ marginBottom: 20 }}>
            {availableSecondary.map(g => (
              <Chip
                key={g.value}
                label={g.label}
                selected={(obj.secondary_goals ?? []).includes(g.value)}
                onToggle={() => toggleSecondary(g.value)}
                dark={dark} primary={primary}
              />
            ))}
          </ChipGroup>
        </>
      )}

      <VoiceOption dark={dark} primary={primary} note="Nos conte sobre seus objetivos com suas próprias palavras."/>

      <div style={{ flex: 1 }}/>
      <WizardFooter
        onNext={onNext} onSaveLater={onSaveLater}
        nextDisabled={!canAdvance}
        dark={dark} primary={primary}
      />
    </div>
  );
}
