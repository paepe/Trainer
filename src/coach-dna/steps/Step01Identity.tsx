import React from 'react';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { DNAField }    from '../components/DNAField';
import { Chip }        from '../components/Chip';
import { VoiceBar }    from '../components/VoiceBar';
import { PhotoSlot }   from '../components/PhotoSlot';
import { FieldLabel }  from '../components/FieldLabel';
import { BRAND }       from '../../theme/tokens';
import type { CoachDNAIdentity } from '../../types/coach-dna';

const GENDERS = ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'] as const;

interface Step01Props {
  data:      CoachDNAIdentity;
  onChange:  (v: Partial<CoachDNAIdentity>) => void;
  trainerId: string;
}

export const Step01Identity: React.FC<Step01Props> = ({ data, onChange, trainerId }) => (
  <div>
    <StepHeader
      idx={1} total={12}
      title="Identidade do treinador"
      sub="Informações básicas que identificam sua presença no app."
    />
    <Hint>Como você se apresenta aos seus alunos?</Hint>

    <PhotoSlot
      value={data.photo}
      onChange={photo => onChange({ photo })}
      name={data.name}
      trainerId={trainerId}
    />

    <DNAField
      label="Nome completo"
      value={data.name}
      onChange={name => onChange({ name })}
      placeholder="Ex: Rafael Mendes"
    />

    <VoiceBar
      onTranscript={text => onChange({ name: (data.name + ' ' + text).trim() })}
      hint="Ditar nome para a IA"
    />

    <div style={{ marginBottom: 16 }}>
      <FieldLabel>Gênero</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {GENDERS.map(g => (
          <Chip
            key={g}
            label={g}
            active={data.gender === g}
            onClick={() => onChange({ gender: g })}
            color={BRAND.accent}
          />
        ))}
      </div>
    </div>

    <DNAField
      label="Idade"
      value={data.age}
      onChange={age => onChange({ age })}
      placeholder="34"
      type="number"
      suffix="anos"
      optional
    />
  </div>
);
