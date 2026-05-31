import React from 'react';
import { StepHeader } from '../components/StepHeader';
import { Hint }       from '../components/Hint';
import { FieldLabel } from '../components/FieldLabel';
import { Chip }       from '../components/Chip';
import { ChoiceCard } from '../components/ChoiceCard';
import { FORMATS, CURVES } from '../constants';
import { BRAND }      from '../../theme/tokens';
import type { CoachDNADesign } from '../../types/coach-dna';

interface Step09Props {
  design:   CoachDNADesign;
  onChange: (design: CoachDNADesign) => void;
}

const CURVE_ICONS: Record<string, string> = {
  progressive: 'arrowUp',
  wave:        'wave',
  peak_early:  'zap',
  peak_late:   'mountain',
  constant:    'minus',
};

export const Step09Design: React.FC<Step09Props> = ({ design, onChange }) => {
  const toggleFormat = (f: string) => {
    const next = design.formats.includes(f)
      ? design.formats.filter(x => x !== f)
      : [...design.formats, f];
    onChange({ ...design, formats: next });
  };

  return (
    <div>
      <StepHeader
        idx={9} total={12}
        title="Design de sessão"
        sub="Os formatos e a curva de intensidade que você prefere."
        badge="Coach DNA"
      />
      <Hint>Escolha os formatos que você usa e a curva de intensidade típica das suas sessões.</Hint>

      <FieldLabel hint="escolha todos que usa">Formatos preferidos</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {FORMATS.map(f => (
          <Chip
            key={f}
            label={f}
            active={design.formats.includes(f)}
            color={BRAND.accent}
            multi
            onClick={() => toggleFormat(f)}
          />
        ))}
      </div>

      <FieldLabel>Curva de intensidade</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CURVES.map(c => (
          <ChoiceCard
            key={c.key}
            icon={CURVE_ICONS[c.key] ?? 'target'}
            title={c.label}
            sub={c.sub}
            color={BRAND.accent}
            active={design.curve === c.key}
            onClick={() => onChange({ ...design, curve: c.key })}
          />
        ))}
      </div>
    </div>
  );
};
