import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type { BodyRhythmAdaptation } from '../../../types/profile-v2';

const ADAPTATION_KEYS: { value: BodyRhythmAdaptation; i18nKey: string }[] = [
  { value: 'maintain_normal',    i18nKey: 'maintain' },
  { value: 'reduce_intensity',   i18nKey: 'reduce_intensity' },
  { value: 'reduce_impact',      i18nKey: 'reduce_impact' },
  { value: 'increase_rest',      i18nKey: 'increase_rest' },
  { value: 'shorten_session',    i18nKey: 'shorten' },
  { value: 'prioritize_mobility',i18nKey: 'prioritize_mobility' },
  { value: 'postpone_training',  i18nKey: 'postpone' },
  { value: 'regenerative',       i18nKey: 'regenerative' },
];

interface Step10Props extends WizardStepProps {
  biologicalSex?: string | undefined;
}

export function Step10BodyRhythm({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps, biologicalSex }: Step10Props) {
  const { t: tr } = useTranslation();
  const br = data.body_rhythm ?? {
    enabled: false,
    cycle_current_day: 14,
    cycle_duration_days: 28,
    adaptation_preference: [],
  };

  const adaptLabel = (i18nKey: string) => tr(`wizard.step10.adaptations.${i18nKey}`);

  const set = (patch: Partial<typeof br>) =>
    onUpdate({ body_rhythm: { ...br, ...patch } });

  const toggleAdaptation = (v: BodyRhythmAdaptation) => {
    const cur = br.adaptation_preference ?? [];
    set({ adaptation_preference: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };

  const isDay1 = (br.cycle_current_day ?? 14) === 1;

  const markPeriodToday = () => set({ cycle_current_day: 1 });

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack} badge="opt-in" title={tr('wizard.step10.title')} subtitle={tr('wizard.step10.subtitle')} />

      
      

      <div style={{
        padding: '14px 16px', borderRadius: 14,
        background: surfRaised(dark),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>{tr('wizard.step10.activateLabel')}</div>
          <div style={{ fontSize: 11.5, color: textSec(dark), marginTop: 3, lineHeight: 1.4 }}>
            {tr('wizard.step10.activateHint')}
          </div>
        </div>
        <Toggle on={br.enabled} onChange={v => set({ enabled: v })}/>
      </div>

      {br.enabled && (
        <VStack gap={20}>
          <Slider
            label={tr('wizard.step10.cycleDayLabel')}
            value={br.cycle_current_day ?? 14}
            min={1} max={35} suffix={tr('wizard.step10.cycleDaySuffix')}
            onChange={v => set({ cycle_current_day: v })}
          />

          <Slider
            label={tr('wizard.step10.cycleDurationLabel')}
            value={br.cycle_duration_days ?? 28}
            min={21} max={35} suffix={tr('wizard.step10.cycleDurationSuffix')}
            onChange={v => set({ cycle_duration_days: v })}
          />

          <button
            onClick={markPeriodToday}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, textAlign: 'left',
              background: isDay1 ? '#8B5CF622' : (dark ? '#0B1624' : '#EDF1F7'),
              border: `1.5px solid ${isDay1 ? '#8B5CF6' : (dark ? '#1F2E45' : '#D5DCEA')}`,
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background .15s, border-color .15s',
            }}
          >
            <span style={{ fontSize: 16 }}>🌙</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDay1 ? '#8B5CF6' : textPri(dark) }}>
                {tr('wizard.step10.periodToday')}
              </div>
              <div style={{ fontSize: 11, color: textMute(dark), marginTop: 2 }}>
                {isDay1 ? tr('wizard.step10.day1Marked') : tr('wizard.step10.tapDay1')}
              </div>
            </div>
          </button>

          <div>
            <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step10.adaptationLabel')}</Typography>
            <HStack style={{ flexWrap: 'wrap' }} gap={8}>
              {ADAPTATION_KEYS.map(a => (
                <Chip
                  key={a.value}
                  label={adaptLabel(a.i18nKey)}
                  active={(br.adaptation_preference ?? []).includes(a.value)}
                  onClick={() => toggleAdaptation(a.value)}
                />
              ))}
            </HStack>
          </div>

          <p style={{ fontSize: 11.5, color: textMute(dark), lineHeight: 1.5, margin: 0 }}>
            {tr('wizard.step10.privacyNote')}
          </p>
        </VStack>
      )}

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>
    </VStack>
  );
}
