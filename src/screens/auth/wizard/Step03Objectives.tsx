import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type { PrimaryGoal, SecondaryGoal } from '../../../types/profile-v2';

const PRIMARY_GOALS: { value: PrimaryGoal; label: string; icon: string }[] = [
  { value: 'hypertrophy',       label: 'Hypertrophy',       icon: 'dumbbell' },
  { value: 'weight_loss',       label: 'Weight Loss',     icon: 'flame'    },
  { value: 'strength_gain',     label: 'Strength Gain',    icon: 'bolt'     },
  { value: 'conditioning',      label: 'Conditioning',   icon: 'pulse'    },
  { value: 'mobility',          label: 'Mobility',        icon: 'heart'    },
  { value: 'longevity',         label: 'Longevity',       icon: 'moon'     },
  { value: 'return_to_training',label: 'Return to Training', icon: 'rocket'   },
  { value: 'emotional_wellbeing',label:'Emotional Wellbeing',icon: 'sparkle' },
];

const SECONDARY_GOALS: { value: SecondaryGoal; label: string }[] = [
  { value: 'hypertrophy',        label: 'Hypertrophy'         },
  { value: 'weight_loss',        label: 'Weight Loss'       },
  { value: 'strength_gain',      label: 'Strength Gain'      },
  { value: 'conditioning',       label: 'Conditioning'     },
  { value: 'mobility',           label: 'Mobility'          },
  { value: 'longevity',          label: 'Longevity'         },
  { value: 'return_to_training', label: 'Return to Training'   },
  { value: 'emotional_wellbeing',label: 'Emotional Wellbeing' },
  { value: 'daily_autonomy',     label: 'Daily Autonomy'    },
  { value: 'body_composition',   label: 'Body Composition' },
  { value: 'sports_performance', label: 'Sports Performance' },
  { value: 'balance',            label: 'Balance'          },
  { value: 'consistency',        label: 'Consistency'        },
];

export function Step03Objectives({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
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
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader title="Wizard Block" currentStep={stepNum} stepPrefix="BLOCK" totalSteps={totalSteps} onBack={onBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        What can movement<br/>improve in your life?
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        "What would you like movement to improve in your life?"
      </p>

      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Primary goal</Typography>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {PRIMARY_GOALS.map(g => (
          <ChoiceCard
            key={g.value}
            title={g.label}
            icon={g.icon}
            active={obj.primary_goal === g.value}
            onClick={() => setPrimary(g.value)}
          />
        ))}
      </div>

      {obj.primary_goal && (
        <>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Secondary goals (optional)</Typography>
          <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
            {availableSecondary.map(g => (
              <Chip
                key={g.value}
                label={g.label}
                active={(obj.secondary_goals ?? []).includes(g.value)}
                onClick={() => toggleSecondary(g.value)}
              />
            ))}
          </HStack>
        </>
      )}

      <VoiceOption
        note="Tell us about your goals in your own words."
        onClick={() => setVoiceOpen(true)}
      />

      <Spacer />
      <WizardFooter
        onNext={onNext}
        nextDisabled={!canAdvance}
        onSave={onSaveLater}
        saving={saving}
      />

      {voiceOpen && (
        <WizardVoiceOverlay dark={dark} primary={primary}
          context="Tell us about your goals"
          onConfirm={(text) => {
            onUpdate({ objectives: { ...obj, voice_note: text } });
            setVoiceOpen(false);
            if (canAdvance) onNext();
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </VStack>
  );
}
