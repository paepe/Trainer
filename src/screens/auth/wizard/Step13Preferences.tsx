import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, SegmentedRow, Chip, ChipGroup, SectionLabel } from './atoms';
import type { WizardStepProps } from './types';
import type {
  PreferredIntensity, TrainingCompany, PreferredLanguage,
  ExplanationLevel, TrainingFocus, SupportLevel,
} from '../../../types/profile-v2';

const INTENSITY_OPTS: { value: PreferredIntensity; label: string }[] = [
  { value: 'gradual',  label: 'Leve'     },
  { value: 'moderate', label: 'Moderada' },
  { value: 'intense',  label: 'Intensa'  },
];
const COMPANY_OPTS: { value: TrainingCompany; label: string }[] = [
  { value: 'solo',        label: 'Sozinho'      },
  { value: 'accompanied', label: 'Acompanhado'  },
  { value: 'indifferent', label: 'Indiferente'  },
];
const LANGUAGE_OPTS: { value: PreferredLanguage; label: string }[] = [
  { value: 'direct',       label: 'Direta'        },
  { value: 'explanatory',  label: 'Esclarecedora' },
  { value: 'technical',    label: 'Técnica'       },
];
const EXPLANATION_OPTS: { value: ExplanationLevel; label: string }[] = [
  { value: 'simple',   label: 'Simples'   },
  { value: 'detailed', label: 'Detalhada' },
  { value: 'technical',label: 'Técnica'   },
];
const FOCUS_OPTS: { value: TrainingFocus; label: string }[] = [
  { value: 'performance', label: 'Performance' },
  { value: 'health',      label: 'Saúde'       },
  { value: 'aesthetics',  label: 'Estética'    },
  { value: 'consistency', label: 'Consistência'},
];
const SUPPORT_OPTS: { value: SupportLevel; label: string }[] = [
  { value: 'autonomous', label: 'Autonomia'          },
  { value: 'guided',     label: 'Orientação próxima' },
];

export function Step13Preferences({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
  const pref = data.preferences ?? {
    preferred_intensity: 'moderate' as PreferredIntensity,
    training_company: 'solo' as TrainingCompany,
    preferred_language: 'explanatory' as PreferredLanguage,
    explanation_level: 'simple' as ExplanationLevel,
    focus: 'health' as TrainingFocus,
    support_level: 'guided' as SupportLevel,
  };

  const set = (patch: Partial<typeof pref>) => onUpdate({ preferences: { ...pref, ...patch } });

  const toggleFocus = (v: TrainingFocus) => {
    set({ focus: v });
  };

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Preferências de treino<br/>e suporte
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        Define a voz da comunicação e ajusta o plano ao seu perfil comportamental.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <SectionLabel label="Intensidade preferida" dark={dark}/>
          <SegmentedRow
            options={INTENSITY_OPTS}
            value={pref.preferred_intensity ?? 'moderate'}
            onChange={v => set({ preferred_intensity: v as PreferredIntensity })}
            dark={dark} primary={primary}
          />
        </div>

        <div>
          <SectionLabel label="Treinar sozinho ou acompanhado?" dark={dark}/>
          <SegmentedRow
            options={COMPANY_OPTS}
            value={pref.training_company ?? 'solo'}
            onChange={v => set({ training_company: v as TrainingCompany })}
            dark={dark} primary={primary}
          />
        </div>

        <div>
          <SectionLabel label="Linguagem preferida" dark={dark}/>
          <SegmentedRow
            options={LANGUAGE_OPTS}
            value={pref.preferred_language ?? 'explanatory'}
            onChange={v => set({ preferred_language: v as PreferredLanguage })}
            dark={dark} primary={primary}
          />
        </div>

        <div>
          <SectionLabel label="Nível de explicação" dark={dark}/>
          <SegmentedRow
            options={EXPLANATION_OPTS}
            value={pref.explanation_level ?? 'simple'}
            onChange={v => set({ explanation_level: v as ExplanationLevel })}
            dark={dark} primary={primary}
          />
        </div>

        <div>
          <SectionLabel label="Foco da meta" dark={dark}/>
          <ChipGroup>
            {FOCUS_OPTS.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                selected={pref.focus === f.value}
                onToggle={() => toggleFocus(f.value)}
                dark={dark} primary={primary}
              />
            ))}
          </ChipGroup>
        </div>

        <div>
          <SectionLabel label="Grau de suporte" dark={dark}/>
          <SegmentedRow
            options={SUPPORT_OPTS}
            value={pref.support_level ?? 'guided'}
            onChange={v => set({ support_level: v as SupportLevel })}
            dark={dark} primary={primary}
          />
        </div>
      </div>

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} onSaveLater={onSaveLater} dark={dark} primary={primary}/>
    </div>
  );
}
