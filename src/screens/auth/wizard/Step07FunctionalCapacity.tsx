import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type {
  MobilityLevel, BalanceLevel, AutonomyLevel, EffortTolerance,
  PainLevel, AccessLevel, SupportResource, InstructionFormat,
} from '../../../types/profile-v2';

const MOBILITY_VALUES: MobilityLevel[] = ['low', 'moderate', 'good'];
const BALANCE_VALUES: BalanceLevel[] = ['unstable', 'assisted', 'stable'];
const AUTONOMY_VALUES: AutonomyLevel[] = ['assisted', 'partial', 'independent'];
const EFFORT_VALUES: EffortTolerance[] = ['low', 'moderate', 'good'];
const SUPPORT_VALUES: SupportResource[] = ['wheelchair', 'cane', 'walker', 'prosthesis', 'nearby_support', 'none'];
const PAIN_VALUES: PainLevel[] = ['none', 'mild', 'moderate', 'severe'];
const ACCESS_VALUES: AccessLevel[] = ['full', 'partial', 'limited'];
const INSTRUCTION_VALUES: InstructionFormat[] = ['visual', 'auditory', 'simplified_text', 'vibration', 'standard'];

export function Step07FunctionalCapacity({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const fc = data.functional_capacity ?? {
    mobility: undefined as unknown as MobilityLevel,
    balance: undefined as unknown as BalanceLevel,
    autonomy: undefined as unknown as AutonomyLevel,
    effort_tolerance: undefined as unknown as EffortTolerance,
    support_resources: [],
    instruction_format: [],
  };

  const mobilityOpts    = MOBILITY_VALUES.map(v => ({ value: v, label: tr(`wizard.step07.mobilityLevels.${v}`) }));
  const balanceOpts     = BALANCE_VALUES.map(v => ({ value: v, label: tr(`wizard.step07.balanceLevels.${v}`) }));
  const autonomyOpts    = AUTONOMY_VALUES.map(v => ({ value: v, label: tr(`wizard.step07.autonomyLevels.${v}`) }));
  const effortOpts      = EFFORT_VALUES.map(v => ({ value: v, label: tr(`wizard.step07.mobilityLevels.${v}`) }));
  const painOpts        = PAIN_VALUES.map(v => ({ value: v, label: tr(`wizard.step07.painLevels.${v}`) }));
  const accessOpts      = ACCESS_VALUES.map(v => ({ value: v, label: tr(`wizard.step07.accessLevels.${v}`) }));
  const instructionOpts = INSTRUCTION_VALUES.map(v => ({ value: v, label: tr(`wizard.step07.instructionFormats.${v}`) }));

  const set = (patch: Partial<typeof fc>) => onUpdate({ functional_capacity: { ...fc, ...patch } });

  const toggleSupport = (v: SupportResource) => {
    let next: SupportResource[];
    if (v === 'none') {
      next = fc.support_resources?.includes(v) ? [] : [v];
    } else {
      const without = (fc.support_resources ?? []).filter(x => x !== 'none');
      next = without.includes(v) ? without.filter(x => x !== v) : [...without, v];
    }
    set({ support_resources: next });
  };

  const toggleFormat = (v: InstructionFormat) => {
    const cur = fc.instruction_format ?? [];
    set({ instruction_format: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };

  const canAdvance = !!(fc.mobility && fc.balance && fc.autonomy && fc.effort_tolerance);

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader title={tr('wizard.step07.title')} currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('wizard.step07.heading1')}<br/>{tr('wizard.step07.heading2')}
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        {tr('wizard.step07.subheading')}
      </p>

      <VStack gap={20}>
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step07.mobility')}</Typography>
          <SegmentedControl options={mobilityOpts} value={fc.mobility ?? ''} onChange={v => set({ mobility: v as MobilityLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step07.balance')}</Typography>
          <SegmentedControl options={balanceOpts} value={fc.balance ?? ''} onChange={v => set({ balance: v as BalanceLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step07.autonomy')}</Typography>
          <SegmentedControl options={autonomyOpts} value={fc.autonomy ?? ''} onChange={v => set({ autonomy: v as AutonomyLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step07.effortTolerance')}</Typography>
          <SegmentedControl options={effortOpts} value={fc.effort_tolerance ?? ''} onChange={v => set({ effort_tolerance: v as EffortTolerance })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step07.painLevel')}</Typography>
          <SegmentedControl options={painOpts} value={fc.pain_level ?? ''} onChange={v => set({ pain_level: v as PainLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step07.accessToEnv')}</Typography>
          <SegmentedControl options={accessOpts} value={fc.access_level ?? ''} onChange={v => set({ access_level: v as AccessLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step07.supportResources')}</Typography>
          <HStack style={{ flexWrap: 'wrap' }} gap={8}>
            {SUPPORT_VALUES.map(r => (
              <Chip
                key={r}
                label={tr(`wizard.step07.supports.${r}`)}
                active={(fc.support_resources ?? []).includes(r)}
                onClick={() => toggleSupport(r)}
                disabled={r !== 'none' && (fc.support_resources ?? []).includes('none')}
              />
            ))}
          </HStack>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step07.instructionPreference')}</Typography>
          <HStack style={{ flexWrap: 'wrap' }} gap={8}>
            {INSTRUCTION_VALUES.map(f => (
              <Chip
                key={f}
                label={tr(`wizard.step07.instructionFormats.${f}`)}
                active={(fc.instruction_format ?? []).includes(f)}
                onClick={() => toggleFormat(f)}
              />
            ))}
          </HStack>
        </div>

        <Alert isAI
          text={tr('wizard.step07.alert')}
        />
      </VStack>

      <Spacer />
      <WizardFooter
        onNext={onNext}
        nextDisabled={!canAdvance}
        onSave={onSaveLater} saving={saving}
      />
    </VStack>
  );
}
