import React from 'react';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, FieldInput, SectionLabel, SegmentedRow } from './atoms';
import type { WizardStepProps } from './types';
import type { BiologicalSex, ProfileBasicData } from '../../../types/profile-v2';

const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: 'female',           label: 'Feminino'         },
  { value: 'male',             label: 'Masculino'        },
  { value: 'intersex',         label: 'Intersexo'        },
  { value: 'prefer_not_to_say',label: 'Prefiro não informar' },
];

export function Step02BasicData({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
  const d = data.basic_data ?? {} as Partial<ProfileBasicData>;

  const set = (patch: Partial<ProfileBasicData>) =>
    onUpdate({ basic_data: { ...d, ...patch } as ProfileBasicData });

  const [emergencyOpen, setEmergencyOpen] = React.useState(
    !!(d.emergency_contact?.name || d.emergency_contact?.phone),
  );

  const canAdvance = !!(d.name?.trim() && d.age && d.height_cm && d.weight_kg);

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Dados básicos
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 22px', lineHeight: 1.55 }}>
        Para ajustar intensidade, linguagem, segurança e evolução do seu plano.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FieldInput
          label="Nome"
          value={d.name ?? ''}
          onChange={v => set({ name: v })}
          dark={dark} primary={primary}
          placeholder="Mariana Costa"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldInput
            label="Idade"
            value={d.age ? String(d.age) : ''}
            onChange={v => set({ age: v ? parseInt(v) : undefined as unknown as number })}
            dark={dark} primary={primary}
            type="number" inputMode="numeric" placeholder="28"
          />
          <FieldInput
            label="Idioma"
            value={d.language ?? 'Português'}
            onChange={v => set({ language: v })}
            dark={dark} primary={primary}
            placeholder="Português"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldInput
            label="Altura (cm)"
            value={d.height_cm ? String(d.height_cm) : ''}
            onChange={v => set({ height_cm: v ? +v : undefined as unknown as number })}
            dark={dark} primary={primary}
            type="number" inputMode="decimal" placeholder="165"
          />
          <FieldInput
            label="Peso atual (kg)"
            value={d.weight_kg ? String(d.weight_kg) : ''}
            onChange={v => set({ weight_kg: v ? +v : undefined as unknown as number })}
            dark={dark} primary={primary}
            type="number" inputMode="decimal" placeholder="64"
          />
        </div>

        {/* Biological sex */}
        <div>
          <SectionLabel label="Sexo biológico" dark={dark}/>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SEX_OPTIONS.map(o => {
              const on = d.biological_sex === o.value;
              return (
                <button key={o.value} onClick={() => set({ biological_sex: o.value })} style={{
                  padding: '9px 14px', borderRadius: 999,
                  background: on ? `${primary}22` : surfRaised(dark),
                  color: on ? primary : textPri(dark),
                  border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {o.label}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: textSec(dark), margin: '8px 0 0' }}>
            Usado para personalização — nunca para diagnóstico.
          </p>
        </div>

        {/* Emergency contact */}
        <div style={{
          padding: 14, borderRadius: 14,
          border: `1.5px solid ${emergencyOpen ? primary : borderSubtle(dark)}`,
          background: surfRaised(dark),
        }}>
          <button
            onClick={() => setEmergencyOpen(v => !v)}
            style={{
              width: '100%', background: 'none', border: 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>Contato de emergência</span>
            <span style={{ fontSize: 12, color: textSec(dark) }}>{emergencyOpen ? '▲' : '▼'}</span>
          </button>
          {emergencyOpen && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FieldInput
                label="Nome" value={d.emergency_contact?.name ?? ''}
                onChange={v => set({ emergency_contact: { ...(d.emergency_contact ?? { phone: '' }), name: v } })}
                dark={dark} primary={primary} placeholder="Nome e sobrenome"
              />
              <FieldInput
                label="Telefone" value={d.emergency_contact?.phone ?? ''}
                onChange={v => set({ emergency_contact: { ...(d.emergency_contact ?? { name: '' }), phone: v } })}
                dark={dark} primary={primary} type="tel" inputMode="tel" placeholder="+55 11 99999-0000"
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1 }}/>
      <WizardFooter
        onNext={onNext} onSaveLater={onSaveLater}
        nextDisabled={!canAdvance}
        dark={dark} primary={primary}
      />
    </div>
  );
}
