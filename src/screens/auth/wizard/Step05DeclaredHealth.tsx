import React from 'react';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, Badge, Chip, ChipGroup, AINote, TextArea, VoiceOption, SectionLabel } from './atoms';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type { HealthCategory } from '../../../types/profile-v2';

const CATEGORIES: { value: HealthCategory; label: string }[] = [
  { value: 'cardiovascular',       label: 'Cardiovascular'         },
  { value: 'metabolic',            label: 'Metabólica'             },
  { value: 'renal',                label: 'Renal'                  },
  { value: 'respiratory',          label: 'Respiratória'           },
  { value: 'musculoskeletal',      label: 'Musculoesquelética'     },
  { value: 'neurological',         label: 'Neurológica'            },
  { value: 'chronic_pain',         label: 'Dor crônica'            },
  { value: 'emotional_health',     label: 'Saúde emocional'        },
  { value: 'pregnancy_postpartum', label: 'Gestação ou pós-parto'  },
  { value: 'post_operative',       label: 'Pós-operatório'         },
  { value: 'physical_disability',  label: 'Deficiência física'     },
  { value: 'other',                label: 'Outra condição'         },
];

const HIGH_RISK: HealthCategory[] = [
  'cardiovascular', 'respiratory', 'neurological', 'post_operative',
];

type Disclosure = 'yes' | 'no' | 'prefer_not';

export function Step05DeclaredHealth({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
  const dh = data.declared_health ?? { has_condition: null, categories: [], free_text: '' };
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const disclosure: Disclosure =
    dh.has_condition === null   ? 'prefer_not' :
    dh.has_condition === false  ? 'no'         : 'yes';

  const setDisclosure = (v: Disclosure) => {
    const has = v === 'yes' ? true : v === 'no' ? false : null;
    onUpdate({ declared_health: { ...dh, has_condition: has, categories: has ? dh.categories : [] } });
  };

  const toggleCategory = (v: HealthCategory) => {
    const next = dh.categories?.includes(v)
      ? dh.categories.filter(x => x !== v)
      : [...(dh.categories ?? []), v];
    onUpdate({ declared_health: { ...dh, categories: next } });
  };

  const hasHighRisk = dh.categories?.some(c => HIGH_RISK.includes(c));

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary} badge="sensitive"/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Saúde declarada
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        O sistema <strong style={{ color: textPri(dark) }}>não diagnostica</strong>. Apenas usa o que você declara
        para adaptar o plano com segurança.
      </p>

      {/* Disclosure choice */}
      <SectionLabel label="Existe alguma condição a considerar?" dark={dark}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {([
          { v: 'yes',        label: 'Sim, quais'       },
          { v: 'no',         label: 'Não se aplica'    },
          { v: 'prefer_not', label: 'Prefiro não informar' },
        ] as { v: Disclosure; label: string }[]).map(o => {
          const on = disclosure === o.v;
          return (
            <button key={o.v} onClick={() => setDisclosure(o.v)} style={{
              padding: '13px 16px', borderRadius: 14, textAlign: 'left',
              background: on ? `${primary}1a` : surfRaised(dark),
              border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              color: on ? primary : textPri(dark), cursor: 'pointer',
            }}>
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Category multi-select — shown only when "yes" */}
      {disclosure === 'yes' && (
        <>
          <SectionLabel label="Categorias" dark={dark}/>
          <ChipGroup style={{ marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <Chip
                key={c.value}
                label={c.label}
                selected={(dh.categories ?? []).includes(c.value)}
                onToggle={() => toggleCategory(c.value)}
                dark={dark} primary={primary}
              />
            ))}
          </ChipGroup>

          <TextArea
            label="Observação livre"
            value={dh.free_text ?? ''}
            onChange={v => onUpdate({ declared_health: { ...dh, free_text: v } })}
            dark={dark} primary={primary}
            placeholder="ex.: Cirurgia no joelho em 2023, liberada para musculação"
            rows={3}
          />

          {hasHighRisk && (
            <div style={{ marginTop: 14 }}>
              <AINote
                dark={dark} primary={primary} variant="warning"
                text="Dado sensível. Verifique estes pontos para validar restrições operacionais — recomendo usar progressão conservadora."
              />
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <VoiceOption
              dark={dark} primary={primary}
              note="Nos conte sobre sua condição com suas palavras."
              onClick={() => setVoiceOpen(true)}
            />
          </div>
        </>
      )}

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} onSaveLater={onSaveLater} dark={dark} primary={primary}/>

      {voiceOpen && (
        <WizardVoiceOverlay
          dark={dark} primary={primary}
          context="Conte sobre sua saúde"
          onConfirm={(text) => {
            onUpdate({ declared_health: { ...dh, voice_note: text } });
            setVoiceOpen(false);
            onNext();
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </div>
  );
}
