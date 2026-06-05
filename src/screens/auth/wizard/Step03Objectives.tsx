import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type { PrimaryGoal, SecondaryGoal } from '../../../types/profile-v2';

// Labels resolved at render via wizard.goals.<value>
const PRIMARY_GOALS: { value: PrimaryGoal; icon: string }[] = [
  { value: 'hypertrophy',        icon: 'dumbbell' },
  { value: 'weight_loss',        icon: 'flame'    },
  { value: 'strength_gain',      icon: 'bolt'     },
  { value: 'conditioning',       icon: 'pulse'    },
  { value: 'mobility',           icon: 'heart'    },
  { value: 'longevity',          icon: 'moon'     },
  { value: 'return_to_training', icon: 'rocket'   },
  { value: 'emotional_wellbeing', icon: 'sparkle' },
];

const SECONDARY_GOALS: SecondaryGoal[] = [
  'hypertrophy', 'weight_loss', 'strength_gain', 'conditioning', 'mobility',
  'longevity', 'return_to_training', 'emotional_wellbeing', 'daily_autonomy',
  'body_composition', 'sports_performance', 'balance', 'consistency',
];

export function Step03Objectives({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const obj = data.objectives ?? { primary_goal: undefined as unknown as PrimaryGoal, secondary_goals: [] };

  const setPrimary = (v: PrimaryGoal) =>
    onUpdate({ objectives: { ...obj, primary_goal: v } });

  const toggleSecondary = (v: SecondaryGoal) => {
    const current = obj.secondary_goals ?? [];
    const next = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
    onUpdate({ objectives: { ...obj, secondary_goals: next } });
  };

  const availableSecondary = SECONDARY_GOALS.filter(g => g !== obj.primary_goal);
  const canAdvance = !!obj.primary_goal;
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader title={tr('wizard.sections.objectives')} currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('wizard.step03.q1')}<br/>{tr('wizard.step03.q2')}
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        {tr('wizard.step03.prompt')}
      </p>

      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step03.primaryGoal')}</Typography>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        {PRIMARY_GOALS.map(g => (
          <ChoiceCard
            key={g.value}
            title={tr(`wizard.goals.${g.value}`)}
            icon={g.icon}
            active={obj.primary_goal === g.value}
            onClick={() => setPrimary(g.value)}
          />
        ))}
      </div>

      {obj.primary_goal && (
        <>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step03.secondaryGoals')}</Typography>
          <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
            {availableSecondary.map(g => (
              <Chip
                key={g}
                label={tr(`wizard.goals.${g}`)}
                active={(obj.secondary_goals ?? []).includes(g)}
                onClick={() => toggleSecondary(g)}
              />
            ))}
          </HStack>
        </>
      )}

      <VoiceOption
        note={tr('wizard.step03.voiceNote')}
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
          context={tr('wizard.step03.voiceContext')}
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
