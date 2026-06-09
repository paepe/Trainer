import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Chip } from '../../../ui';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type { HealthCategory } from '../../../types/profile-v2';

const CATEGORY_KEYS: HealthCategory[] = [
  'cardiovascular', 'metabolic', 'renal', 'respiratory', 'musculoskeletal',
  'neurological', 'chronic_pain', 'emotional_health', 'pregnancy_postpartum',
  'post_operative', 'physical_disability', 'other',
];

const HIGH_RISK: HealthCategory[] = [
  'cardiovascular', 'respiratory', 'neurological', 'post_operative',
];

type Disclosure = 'yes' | 'no' | 'prefer_not';

export function Step05DeclaredHealth({ dark, primary: _primary, accent: _accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const dh = data.declared_health ?? { has_condition: null, categories: [], free_text: '' };
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const savedCategoriesRef = React.useRef<HealthCategory[]>([]);

  const disclosure: Disclosure =
    dh.has_condition === null   ? 'prefer_not' :
    dh.has_condition === false  ? 'no'         : 'yes';

  const setDisclosure = (v: Disclosure) => {
    const has = v === 'yes' ? true : v === 'no' ? false : null;
    const prevCategories = has ? (savedCategoriesRef.current.length > 0 ? savedCategoriesRef.current : dh.categories) : dh.categories;
    if (!has && dh.categories && dh.categories.length > 0) savedCategoriesRef.current = [...dh.categories];
    onUpdate({ declared_health: { ...dh, has_condition: has, categories: has ? prevCategories : [] } });
  };

  const toggleCategory = (v: HealthCategory) => {
    const next = dh.categories?.includes(v)
      ? dh.categories.filter(x => x !== v)
      : [...(dh.categories ?? []), v];
    onUpdate({ declared_health: { ...dh, categories: next } });
  };

  const hasHighRisk = dh.categories?.some(c => HIGH_RISK.includes(c));

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack} badge="sensitive" title={tr('wizard.step05.title')} />

      
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        {tr('wizard.step05.bodyPre')}<strong style={{ color: textPri(dark) }}>{tr('wizard.step05.bodyBold')}</strong>{tr('wizard.step05.bodyPost')}
      </p>

      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step05.disclosurePrompt')}</Typography>
      <VStack gap={8} style={{ marginBottom: 20 }}>
        {([
          { v: 'yes',        key: 'discloseYes'    },
          { v: 'no',         key: 'discloseNo'     },
          { v: 'prefer_not', key: 'disclosePrefer'  },
        ] as { v: Disclosure; key: string }[]).map(o => {
          const on = disclosure === o.v;
          return (
            <button key={o.v} onClick={() => setDisclosure(o.v)} style={{
              padding: '13px 16px', borderRadius: 14, textAlign: 'left',
              background: on ? `${primary}1a` : surfRaised(dark),
              border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              color: on ? primary : textPri(dark), cursor: 'pointer',
            }}>
              {tr(`wizard.step05.${o.key}`)}
            </button>
          );
        })}
      </VStack>

      {disclosure === 'yes' && (
        <>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step05.categoriesLabel')}</Typography>
          <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
            {CATEGORY_KEYS.map(c => (
              <Chip
                key={c}
                label={tr(`wizard.step05.categories.${c}`)}
                active={(dh.categories ?? []).includes(c)}
                onClick={() => toggleCategory(c)}
              />
            ))}
          </HStack>

          <TextInput multiline
            label={tr('wizard.step05.freeNoteLabel')}
            value={dh.free_text ?? ''}
            onChange={v => onUpdate({ declared_health: { ...dh, free_text: v } })}
            placeholder={tr('wizard.step05.freeNotePlaceholder')}
            rows={3}
          />

          {hasHighRisk && (
            <div style={{ marginTop: 14 }}>
              <Alert isAI variant="warning"
                text={tr('wizard.step05.highRiskAlert')}
              />
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <VoiceOption
              note={tr('wizard.step05.voiceNote')}
              onClick={() => setVoiceOpen(true)}
            />
          </div>
        </>
      )}

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>

      {voiceOpen && (
        <WizardVoiceOverlay dark={dark} primary={primary}
          context={tr('wizard.step05.voiceContext')}
          onConfirm={(text) => {
            onUpdate({ declared_health: { ...dh, voice_note: text } });
            setVoiceOpen(false);
            onNext();
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </VStack>
  );
}
