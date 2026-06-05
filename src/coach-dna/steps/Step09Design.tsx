import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const translatedFormats = tr('coachDna.step09.formats', { returnObjects: true }) as unknown as string[];
  const curveLabel = (key: string) => tr(`coachDna.step09.curves.${key}.label`);
  const curveSub = (key: string) => tr(`coachDna.step09.curves.${key}.sub`);
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
        title={tr('coachDna.step09.title')}
        sub={tr('coachDna.step09.sub')}
        badge={tr('coachDna.step09.badge')}
      />
      <Hint>{tr('coachDna.step09.hint')}</Hint>

      <FieldLabel hint={tr('coachDna.step09.formatsHint')}>{tr('coachDna.step09.formatsLabel')}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {FORMATS.map((f, i) => (
          <Chip
            key={f}
            label={translatedFormats[i] ?? f}
            active={design.formats.includes(f)}
            color={theme.accent}
            multi
            onClick={() => toggleFormat(f)}
          />
        ))}
      </div>

      <FieldLabel>{tr('coachDna.step09.curveLabel')}</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CURVES.map(c => (
          <ChoiceCard
            key={c.key}
            icon={CURVE_ICONS[c.key] ?? 'target'}
            title={curveLabel(c.key)}
            sub={curveSub(c.key)}
            color={theme.accent}
            active={design.curve === c.key}
            onClick={() => onChange({ ...design, curve: c.key })}
          />
        ))}
      </div>
    </div>
  );
};
