import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, VStack, Spacer, TextInput } from '../../../ui';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';

export function Step09SensitiveFactors({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const sf = data.sensitive_factors ?? {
    declares_emotional_history: false,
    declares_recreational_substance: false,
  };

  const [medOpen, setMedOpen] = React.useState(!!sf.regular_medications);
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const set = (patch: Partial<typeof sf>) =>
    onUpdate({ sensitive_factors: { ...sf, ...patch } });

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack} badge="blinded" title={tr('wizard.step09.title')} subtitle={tr('wizard.step09.subtitle')} />

      
      

      <Alert isAI variant="warning"
        text={tr('wizard.step09.alert')}
      />

      <VStack gap={12} style={{ marginTop: 20 }}>

        <div style={{
          padding: 14, borderRadius: 14,
          background: surfRaised(dark),
          border: `1.5px solid ${medOpen ? primary : borderSubtle(dark)}`,
        }}>
          <button
            onClick={() => setMedOpen(v => !v)}
            style={{
              width: '100%', background: 'none', border: 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>{tr('wizard.step09.medicationsTitle')}</div>
              <div style={{ fontSize: 11.5, color: textSec(dark), marginTop: 3, lineHeight: 1.45 }}>
                {tr('wizard.step09.medicationsSub')}
              </div>
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: primary,
              background: `${primary}18`, padding: '3px 8px', borderRadius: 6,
              letterSpacing: '.06em', flexShrink: 0, marginLeft: 10,
            }}>
              {tr('wizard.step09.rankingBadge')}
            </div>
          </button>
          {medOpen && (
            <div style={{ marginTop: 14 }}>
              <TextInput
                label={tr('wizard.step09.medicationNameLabel')}
                value={sf.regular_medications ?? ''}
                onChange={v => {
                  if (v) set({ regular_medications: v });
                  else { const { regular_medications: _, ...rest } = sf; onUpdate({ sensitive_factors: rest }); }
                }}
                placeholder={tr('wizard.step09.medicationPlaceholder')}
              />
              <p style={{ fontSize: 11, color: textMute(dark), margin: '8px 0 0', lineHeight: 1.45 }}>
                {tr('wizard.step09.privacyNote')}
              </p>
            </div>
          )}
        </div>

        <DisclosureCard
          title={tr('wizard.step09.psychTitle')}
          description={tr('wizard.step09.psychDesc')}
          enabled={sf.declares_emotional_history}
          onToggle={() => set({ declares_emotional_history: !sf.declares_emotional_history })}
          dark={dark}
          primary={primary}
        />

        <DisclosureCard
          title={tr('wizard.step09.substanceTitle')}
          description={tr('wizard.step09.substanceDesc')}
          enabled={sf.declares_recreational_substance}
          onToggle={() => set({ declares_recreational_substance: !sf.declares_recreational_substance })}
          dark={dark}
          primary={primary}
        />

        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: `${accent}10`, border: `1px solid ${accent}33`,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: accent, marginBottom: 4 }}>{tr('wizard.step09.coreRule')}</div>
          <p style={{ margin: 0, fontSize: 12, color: textSec(dark), lineHeight: 1.5 }}>
            {tr('wizard.step09.ruleText')}
          </p>
        </div>

        <VoiceOption
          note={tr('wizard.step09.voiceNote')}
          onClick={() => setVoiceOpen(true)}
        />
      </VStack>

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>

      {voiceOpen && (
        <WizardVoiceOverlay dark={dark} primary={primary}
          context={tr('wizard.step09.voiceContext')}
          onConfirm={(text) => {
            onUpdate({ sensitive_factors: { ...sf, voice_note: text } });
            setVoiceOpen(false);
            onNext();
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </VStack>
  );
}

interface DisclosureCardProps {
  title:       string;
  description: string;
  enabled:     boolean;
  onToggle:    () => void;
  dark:        boolean;
  primary:     string;
}

function DisclosureCard({ title, description, enabled, onToggle, dark, primary }: DisclosureCardProps) {
  return (
    <button onClick={onToggle} style={{
      width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14,
      background: enabled ? `${primary}10` : surfRaised(dark),
      border: `1.5px solid ${enabled ? primary : borderSubtle(dark)}`,
      fontFamily: 'inherit', cursor: 'pointer',
      transition: 'background .15s, border-color .15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: textPri(dark), marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: textSec(dark), lineHeight: 1.5 }}>{description}</div>
        </div>
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
          background: enabled ? primary : 'transparent',
          border: `2px solid ${enabled ? primary : borderSubtle(dark)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {enabled && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0E1A2B' }}/>}
        </div>
      </div>
    </button>
  );
}
