import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, Typography, HStack, VStack, Spacer, Chip, SegmentedControl } from '../../../ui';
import type { WizardStepProps } from './types';
import type {
  PreferredIntensity, TrainingCompany, PreferredLanguage,
  ExplanationLevel, TrainingFocus, SupportLevel,
} from '../../../types/profile-v2';

export function Step13Preferences({ dark, primary: _primary, accent: _accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const defaultPrefs = React.useMemo(() => ({
    preferred_intensity: 'moderate' as PreferredIntensity,
    training_company: 'solo' as TrainingCompany,
    preferred_language: 'explanatory' as PreferredLanguage,
    explanation_level: 'simple' as ExplanationLevel,
    focus: 'health' as TrainingFocus,
    support_level: 'guided' as SupportLevel,
  }), []);
  const pref = data.preferences ?? defaultPrefs;

  // Seed the snapshot with the displayed defaults so accepting them without
  // touching any control still persists a valid `preferences` section —
  // otherwise `saveProfileV2` omits the key entirely (only writes keys
  // present in `data`) and Continue silently has nothing to save.
  React.useEffect(() => {
    if (!data.preferences) onUpdate({ preferences: defaultPrefs });
  }, [data.preferences, defaultPrefs, onUpdate]);

  const intensityOpts2    = (['gradual','moderate','intense'] as PreferredIntensity[]).map(v => ({ value: v, label: tr(`wizard.step13.intensities.${v}` as any) }));
  const companyOpts       = (['solo','accompanied','indifferent'] as TrainingCompany[]).map(v => ({ value: v, label: tr(`wizard.step13.company.${v}` as any) }));
  const languageOpts      = (['direct','explanatory','technical'] as PreferredLanguage[]).map(v => ({ value: v, label: tr(`wizard.step13.languages.${v}` as any) }));
  const explanationOpts   = (['simple','detailed','technical'] as ExplanationLevel[]).map(v => ({ value: v, label: tr(`wizard.step13.explanations.${v}` as any) }));
  const _focusOpts        = (['performance','health','aesthetics','consistency'] as TrainingFocus[]).map(v => ({ value: v, label: tr(`wizard.step13.focuses.${v}` as any) }));
  const supportOpts       = (['autonomous','guided'] as SupportLevel[]).map(v => ({ value: v, label: tr(`wizard.step13.supports.${v}` as any) }));

  const set = (patch: Partial<typeof pref>) => onUpdate({ preferences: { ...pref, ...patch } });

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader title={tr('wizard.step13.title')} currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('wizard.step13.heading1')}<br/>{tr('wizard.step13.heading2')}
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        {tr('wizard.step13.subheading')}
      </p>

      <VStack gap={22}>
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step13.intensityLabel')}</Typography>
          <SegmentedControl
            options={intensityOpts2}
            value={pref.preferred_intensity ?? 'moderate'}
            onChange={v => set({ preferred_intensity: v as PreferredIntensity })}
          />
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step13.companyLabel')}</Typography>
          <SegmentedControl
            options={companyOpts}
            value={pref.training_company ?? 'solo'}
            onChange={v => set({ training_company: v as TrainingCompany })}
          />
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step13.languageLabel')}</Typography>
          <SegmentedControl
            options={languageOpts}
            value={pref.preferred_language ?? 'explanatory'}
            onChange={v => set({ preferred_language: v as PreferredLanguage })}
          />
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step13.explanationLabel')}</Typography>
          <SegmentedControl
            options={explanationOpts}
            value={pref.explanation_level ?? 'simple'}
            onChange={v => set({ explanation_level: v as ExplanationLevel })}
          />
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step13.focusLabel')}</Typography>
          <HStack style={{ flexWrap: 'wrap' }} gap={8}>
            {(['performance','health','aesthetics','consistency'] as TrainingFocus[]).map(f => (
              <Chip
                key={f}
                label={tr(`wizard.step13.focuses.${f}`)}
                active={pref.focus === f}
                onClick={() => set({ focus: f })}
              />
            ))}
          </HStack>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step13.supportLabel')}</Typography>
          <SegmentedControl
            options={supportOpts}
            value={pref.support_level ?? 'guided'}
            onChange={v => set({ support_level: v as SupportLevel })}
          />
        </div>
      </VStack>

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>
    </VStack>
  );
}
