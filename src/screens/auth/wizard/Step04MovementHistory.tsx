import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, Chip, SegmentedControl, Toggle } from '../../../ui';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type {
  TrainingFrequency, FitnessLevelV2, TrainingModality, AbandonReason, PreferredIntensity,
  ProfileAbandonHistory, ProfileMovementHistory,
} from '../../../types/profile-v2';

const FREQ_VALUES: TrainingFrequency[] = ['irregular', 'sometimes', 'not_training'];
const LEVEL_VALUES: FitnessLevelV2[] = ['beginner', 'intermediate', 'advanced'];
const MODALITY_VALUES: TrainingModality[] = ['weight_training', 'running', 'walking', 'yoga', 'pilates', 'cycling', 'swimming', 'functional', 'martial_arts', 'dance', 'crossfit', 'other'];
const ABANDON_VALUES: AbandonReason[] = ['lack_of_time', 'injury', 'lack_of_results', 'demotivation', 'cost', 'routine_change', 'discomfort', 'other'];
const INTENSITY_VALUES: PreferredIntensity[] = ['gradual', 'moderate', 'intense'];

export function Step04MovementHistory({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const [page, setPage] = React.useState(0);
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const mh: Partial<ProfileMovementHistory> = data.movement_history ?? {
    weekly_frequency: 3,
    modalities: [],
    abandoned_before: false,
  };

  const ah: ProfileAbandonHistory = data.abandon_history ?? {
    reasons: [],
    preferred_intensity: 'moderate' as PreferredIntensity,
    churn_risk_signals: [],
  };

  const freqOpts    = FREQ_VALUES.map(v => ({ value: v, label: tr(`wizard.step04.frequencies.${v}`) }));
  const levelOpts   = LEVEL_VALUES.map(v => ({ value: v, label: tr(`wizard.step04.levels.${v}`) }));
  const intensityOpts = INTENSITY_VALUES.map(v => ({ value: v, label: tr(`wizard.step04.churnOptions.${v}`) }));

  // mh starts partial (frequency/fitness_level unset until chosen). Each call site
  // either preserves an already-set required field or is setting it for the first
  // time, so the merged result is always complete by the time `nextDisabled` allows
  // the user to advance — but TS needs an explicit assertion at the merge boundary.
  const setMH = (p: Partial<ProfileMovementHistory>) =>
    onUpdate({ movement_history: { ...mh, ...p } as ProfileMovementHistory });
  const setAH = (p: ProfileAbandonHistory) => onUpdate({ abandon_history: p });

  const toggleModality = (v: TrainingModality) => {
    const next = mh.modalities?.includes(v)
      ? mh.modalities.filter(x => x !== v)
      : [...(mh.modalities ?? []), v];
    setMH({ ...mh, modalities: next });
  };

  const toggleReason = (v: AbandonReason) => {
    const next = ah.reasons?.includes(v)
      ? ah.reasons.filter(x => x !== v)
      : [...(ah.reasons ?? []), v];
    setAH({ ...ah, reasons: next });
  };

  const handleNext = () => {
    if (page === 0 && mh.abandoned_before) {
      setPage(1);
    } else {
      onNext();
    }
  };

  const handleBack = () => {
    if (page === 1) { setPage(0); } else { onBack(); }
  };

  if (page === 1) {
    return (
      <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
        <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={handleBack} title={tr('wizard.step04.dropoutTitle')} subtitle={tr('wizard.step04.dropoutSub')} />

        
        

        <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
          {ABANDON_VALUES.map(r => (
            <Chip
              key={r}
              label={tr(`wizard.step04.dropoutReasons.${r}`)}
              active={(ah.reasons ?? []).includes(r)}
              onClick={() => toggleReason(r)}
            />
          ))}
        </HStack>

        <Alert isAI
          text={tr('wizard.step04.churnAlert')}
        />

        <div style={{ marginTop: 20 }}>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step04.churnRiskLabel')}</Typography>
          <SegmentedControl
            options={intensityOpts}
            value={ah.preferred_intensity ?? 'moderate'}
            onChange={v => setAH({ ...ah, preferred_intensity: v as PreferredIntensity })}
          />
        </div>

        <VStack gap={10} style={{ marginTop: 8 }}>
          {([
            { key: 'had_negative_experience', label: tr('wizard.step04.negExperiences') },
            { key: 'fear_of_injury',           label: tr('wizard.step04.afraidInjury') },
            { key: 'felt_gym_constraint',      label: tr('wizard.step04.embarrassed') },
          ] as { key: keyof ProfileAbandonHistory; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setAH({ ...ah, [key]: !ah[key] })} style={{
              width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12,
              background: ah[key] ? `${primary}14` : surfRaised(dark),
              border: `1.5px solid ${ah[key] ? primary : borderSubtle(dark)}`,
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              color: ah[key] ? primary : textPri(dark), cursor: 'pointer',
              transition: 'background .15s, border-color .15s',
            }}>
              {label}
            </button>
          ))}
        </VStack>

        <TextInput multiline
          label={tr('wizard.step04.consistencyLabel')}
          value={ah.what_helped_consistency ?? ''}
          onChange={v => setAH({ ...ah, what_helped_consistency: v })}
          placeholder={tr('wizard.step04.consistencyPlaceholder')}
          rows={2}
        />
        <TextInput multiline
          label={tr('wizard.step04.disruptedLabel')}
          value={ah.what_disrupted_routine ?? ''}
          onChange={v => setAH({ ...ah, what_disrupted_routine: v })}
          placeholder={tr('wizard.step04.disruptedPlaceholder')}
          rows={2}
        />

        <VoiceOption
          note={tr('wizard.step04.voiceNote')}
          onClick={() => setVoiceOpen(true)}
        />

        <Spacer />
        <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>

        {voiceOpen && (
          <WizardVoiceOverlay dark={dark} primary={primary}
            context={tr('wizard.step04.voiceContext')}
            onConfirm={(text) => {
              setAH({ ...ah, voice_note: text });
              setVoiceOpen(false);
              onNext();
            }}
            onClose={() => setVoiceOpen(false)}
          />
        )}
      </VStack>
    );
  }

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader title={tr('wizard.step04.titleMain')} currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={handleBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('wizard.step04.heading1')}<br/>{tr('wizard.step04.heading2')}
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        {tr('wizard.step04.subheading')}
      </p>

      <VStack gap={20}>
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step04.currentFrequency')}</Typography>
          <SegmentedControl
            options={freqOpts}
            value={mh.frequency ?? ''}
            onChange={v => setMH({ ...mh, frequency: v as TrainingFrequency })}
          />
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step04.currentLevel')}</Typography>
          <SegmentedControl
            options={levelOpts}
            value={mh.fitness_level ?? ''}
            onChange={v => setMH({ ...mh, fitness_level: v as FitnessLevelV2 })}
          />
        </div>

        <Slider
          label={tr('wizard.step04.frequencyLabel')}
          value={mh.weekly_frequency ?? 3}
          min={1} max={7} suffix={tr('wizard.step04.frequencySuffix')}
          onChange={v => setMH({ ...mh, weekly_frequency: v })}
        />

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step04.practicedModalities')}</Typography>
          <HStack style={{ flexWrap: 'wrap' }} gap={8}>
            {MODALITY_VALUES.map(m => (
              <Chip
                key={m}
                label={tr(`wizard.step04.modalities.${m}`)}
                active={(mh.modalities ?? []).includes(m)}
                onClick={() => toggleModality(m)}
              />
            ))}
          </HStack>
        </div>

        <HStack justifyContent="space-between">
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>
              {tr('wizard.step04.dropoutToggle')}
            </div>
            {mh.abandoned_before && (
              <div style={{ fontSize: 12, color: textSec(dark), marginTop: 2 }}>
                {tr('wizard.step04.dropoutHint')}
              </div>
            )}
          </div>
          <Toggle
            on={mh.abandoned_before ?? false}
            onChange={v => setMH({ ...mh, abandoned_before: v })}
          />
        </HStack>
      </VStack>

      <Spacer />
      <WizardFooter
        onNext={handleNext}
        nextDisabled={!mh.frequency || !mh.fitness_level}
        onSave={onSaveLater} saving={saving}
      />
    </VStack>
  );
}
