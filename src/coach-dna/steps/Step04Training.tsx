import React from 'react';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { Chip }        from '../components/Chip';
import { FieldLabel }  from '../components/FieldLabel';
import { PrivacyNote } from '../components/PrivacyNote';
import { BRAND }       from '../../theme/tokens';
import { METHODS, ENVIRONMENTS, INTENSITY } from '../constants';
import type { CoachDNATraining } from '../../types/coach-dna';

interface Step04Props {
  data:     CoachDNATraining;
  onChange: (v: Partial<CoachDNATraining>) => void;
}

export const Step04Training: React.FC<Step04Props> = ({ data, onChange }) => {
  const toggleMethod = (m: string) => {
    const methods = data.methods.includes(m)
      ? data.methods.filter(x => x !== m)
      : [...data.methods, m];
    onChange({ methods });
  };

  const toggleEnv = (e: string) => {
    const envs = data.envs.includes(e)
      ? data.envs.filter(x => x !== e)
      : [...data.envs, e];
    onChange({ envs });
  };

  return (
    <div>
      <StepHeader
        idx={4} total={12}
        title="Como e onde você treina"
        sub="Métodos, ambientes e intensidade geral que marcam sua prática."
      />
      <Hint>Selecione tudo que faz parte do seu repertório cotidiano.</Hint>

      <FieldLabel hint="múltipla escolha">Métodos de treinamento</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {METHODS.map(m => (
          <Chip
            key={m} label={m} multi
            active={data.methods.includes(m)}
            onClick={() => toggleMethod(m)}
            color={BRAND.accent}
          />
        ))}
      </div>

      <FieldLabel hint="múltipla escolha">Ambientes preferidos</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {ENVIRONMENTS.map(e => (
          <Chip
            key={e} label={e} multi
            active={data.envs.includes(e)}
            onClick={() => toggleEnv(e)}
            color={BRAND.primarySoft}
          />
        ))}
      </div>

      <FieldLabel>Intensidade geral</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {INTENSITY.map(i => (
          <Chip
            key={i} label={i}
            active={data.intensity === i}
            onClick={() => onChange({ intensity: i })}
            color={BRAND.accent}
          />
        ))}
      </div>

      <PrivacyNote>
        Métodos e ambientes guiam o AI Coach Engine na seleção de exercícios e formatos compatíveis com sua realidade.
      </PrivacyNote>
    </div>
  );
};
