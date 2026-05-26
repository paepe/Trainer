import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, AINote, VoiceOption, FieldInput } from './atoms';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';

export function Step09SensitiveFactors({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
  const sf = data.sensitive_factors ?? {
    declares_emotional_history: false,
    declares_recreational_substance: false,
  };

  const [medOpen, setMedOpen] = React.useState(!!sf.regular_medications);
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const set = (patch: Partial<typeof sf>) =>
    onUpdate({ sensitive_factors: { ...sf, ...patch } });

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary} badge="blinded"/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Fatores sensíveis protegidos
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 16px', lineHeight: 1.55 }}>
        O dado íntimo é protegido. Aparece à consciência operacional. Você pode rever e pedir validação humana.
      </p>

      <AINote
        dark={dark} primary={accent} variant="warning"
        text="Medicamentos, substâncias declaradas voluntariamente, histórico psicológico — ficam dentro apenas para você e são marcados como 'fator de segurança declarado' — progressão conservadora."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>

        {/* Medications — opt-in expandable */}
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
              <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>Medicações regulares</div>
              <div style={{ fontSize: 11.5, color: textSec(dark), marginTop: 3, lineHeight: 1.45 }}>
                Opcional — apenas se afetar energia, sono ou desempenho.
              </div>
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: primary,
              background: `${primary}18`, padding: '3px 8px', borderRadius: 6,
              letterSpacing: '.06em', flexShrink: 0, marginLeft: 10,
            }}>
              RANKING
            </div>
          </button>
          {medOpen && (
            <div style={{ marginTop: 14 }}>
              <FieldInput
                label="Nome do medicamento (opcional)"
                value={sf.regular_medications ?? ''}
                onChange={v => {
                  if (v) set({ regular_medications: v });
                  else { const { regular_medications: _, ...rest } = sf; onUpdate({ sensitive_factors: rest }); }
                }}
                dark={dark} primary={primary}
                placeholder="ex.: Losartana, Metformina, Fluoxetina"
              />
              <p style={{ fontSize: 11, color: textMute(dark), margin: '8px 0 0', lineHeight: 1.45 }}>
                Dado privado. Nunca exibido ao treinador sem autorização explícita.
              </p>
            </div>
          )}
        </div>

        {/* Emotional history */}
        <DisclosureCard
          title="Quero declarar histórico emocional / psiquiátrico"
          description="Ajuda apenas para que a IA tome decisões mais seguras e a progressão lenta é planejada para toda a jornada."
          enabled={sf.declares_emotional_history}
          onToggle={() => set({ declares_emotional_history: !sf.declares_emotional_history })}
          dark={dark} primary={primary}
        />

        {/* Recreational substance */}
        <DisclosureCard
          title="Quero declarar uso de substância recreativa"
          description="Anônimo. Influencia recomendação de intensidade e monitoramento."
          enabled={sf.declares_recreational_substance}
          onToggle={() => set({ declares_recreational_substance: !sf.declares_recreational_substance })}
          dark={dark} primary={primary}
        />

        {/* Privacy rule */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: `${accent}10`, border: `1px solid ${accent}33`,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: accent, marginBottom: 4 }}>Regra central</div>
          <p style={{ margin: 0, fontSize: 12, color: textSec(dark), lineHeight: 1.5 }}>
            Dado íntimo = privado. Consequência operacional = compartilhado de forma mascarada. Você pode revogar o acesso em qualquer momento no Bloco 13.
          </p>
        </div>

        <VoiceOption
          dark={dark} primary={primary}
          note="Fale livremente — a IA estrutura antes do salvar."
          onClick={() => setVoiceOpen(true)}
        />
      </div>

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} onSaveLater={onSaveLater} dark={dark} primary={primary}/>

      {voiceOpen && (
        <WizardVoiceOverlay
          dark={dark} primary={primary}
          context="Conte sobre fatores sensíveis"
          onConfirm={(text) => {
            onUpdate({ sensitive_factors: { ...sf, voice_note: text } });
            setVoiceOpen(false);
            onNext();
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </div>
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
