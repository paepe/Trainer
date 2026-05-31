import React from 'react';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { FieldLabel }  from '../components/FieldLabel';
import { DNAField }    from '../components/DNAField';
import { VoiceBar }    from '../components/VoiceBar';
import { PrivacyNote } from '../components/PrivacyNote';
import { MOTTO_EXAMPLES } from '../constants';
import { BRAND, DARK } from '../../theme/tokens';
import type { CoachDNAPhilosophy } from '../../types/coach-dna';

interface Step12Props {
  philosophy: CoachDNAPhilosophy;
  onChange:   (philosophy: CoachDNAPhilosophy) => void;
}

export const Step12Philosophy: React.FC<Step12Props> = ({ philosophy, onChange }) => (
  <div>
    <StepHeader
      idx={12} total={12}
      title="Filosofia & identidade"
      sub="O manifesto que guia cada treino que você cria."
      badge="Coach DNA"
    />
    <Hint>Este é o bloco mais pessoal. Escreva ou dite com as suas próprias palavras.</Hint>

    <FieldLabel hint="opcional">Lema do coach</FieldLabel>
    <DNAField
      value={philosophy.motto}
      placeholder='ex: "Treine com propósito, recover com inteligência."'
      onChange={v => onChange({ ...philosophy, motto: v })}
    />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24, marginTop: -4 }}>
      {MOTTO_EXAMPLES.map(m => (
        <button
          key={m}
          onClick={() => onChange({ ...philosophy, motto: m })}
          style={{
            padding: '4px 10px', borderRadius: 20,
            border: `1px solid ${philosophy.motto === m ? BRAND.accent : DARK.border}`,
            background: philosophy.motto === m ? `${BRAND.accent}20` : 'transparent',
            color: philosophy.motto === m ? BRAND.accent : DARK.textMute,
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'border-color .15s, background .15s',
          }}
        >{m}</button>
      ))}
    </div>

    <FieldLabel hint="opcional">Prompt livre — sua voz de coach para a IA</FieldLabel>
    <VoiceBar
      hint="Ditar seu manifesto de coaching"
      onTranscript={text =>
        onChange({ ...philosophy, prompt: philosophy.prompt + (philosophy.prompt ? ' ' : '') + text })
      }
    />
    <textarea
      value={philosophy.prompt}
      onChange={e => onChange({ ...philosophy, prompt: e.target.value })}
      placeholder="Descreva em suas próprias palavras como você treina, o que você valoriza e como quer que a IA represente seu estilo ao gerar treinos..."
      rows={6}
      style={{
        width: '100%', padding: '12px 14px', borderRadius: 12,
        border: `1.5px solid ${DARK.border}`, background: DARK.surface,
        color: DARK.textPri, fontSize: 13, fontFamily: 'inherit',
        resize: 'vertical', lineHeight: 1.6, outline: 'none',
        boxSizing: 'border-box', marginBottom: 8,
      }}
    />

    <PrivacyNote tone="coach">
      Este prompt é o contexto mais poderoso do seu DNA — a IA usa estas palavras literalmente para capturar a sua voz.
    </PrivacyNote>
  </div>
);
