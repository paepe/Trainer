import React from 'react';
import { StepHeader } from '../components/StepHeader';
import { Hint }       from '../components/Hint';
import { FieldLabel } from '../components/FieldLabel';
import { Chip }       from '../components/Chip';
import { ChoiceCard } from '../components/ChoiceCard';
import { FORMATS, CURVES } from '../constants';
import { useTheme }   from '../../contexts';
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
  const { t } = useTheme();
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
        title="Session design"
        sub="The formats and intensity curve you prefer."
        badge="Coach DNA"
      />
      <Hint>Choose the formats you use and the typical intensity curve of your sessions.</Hint>

      <FieldLabel hint="choose all you use">Preferred formats</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {FORMATS.map(f => (
          <Chip
            key={f}
            label={f}
            active={design.formats.includes(f)}
            color={t.accent}
            multi
            onClick={() => toggleFormat(f)}
          />
        ))}
      </div>

      <FieldLabel>Intensity curve</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CURVES.map(c => (
          <ChoiceCard
            key={c.key}
            icon={CURVE_ICONS[c.key] ?? 'target'}
            title={c.label}
            sub={c.sub}
            color={t.accent}
            active={design.curve === c.key}
            onClick={() => onChange({ ...design, curve: c.key })}
          />
        ))}
      </div>
    </div>
  );
};
