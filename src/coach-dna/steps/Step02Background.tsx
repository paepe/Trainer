import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { DNASlider }   from '../components/DNASlider';
import { ChoiceCard }  from '../components/ChoiceCard';
import { FieldLabel }  from '../components/FieldLabel';
import { PrivacyNote } from '../components/PrivacyNote';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';
import { CERTS }       from '../constants';
import type { CoachDNABackground } from '../../types/coach-dna';

interface Step02Props {
  data:     CoachDNABackground;
  onChange: (v: Partial<CoachDNABackground>) => void;
}

export const Step02Background: React.FC<Step02Props> = ({ data, onChange }) => {
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const certsLabel = (key: string) => tr(`coachDna.step02.certs.${key}`);
  const toggleCert = (key: string) => {
    const certs = data.certs.includes(key)
      ? data.certs.filter(c => c !== key)
      : [...data.certs, key];
    onChange({ certs });
  };

  return (
    <div>
      <StepHeader
        idx={2} total={12}
        title={tr('coachDna.step02.title')}
        sub={tr('coachDna.step02.sub')}
      />
      <Hint>{tr('coachDna.step02.hint')}</Hint>

      <div style={{
        background: DARK.surface, borderRadius: 14,
        border: `1px solid ${DARK.border}`, padding: '16px 14px',
        marginBottom: 20,
      }}>
        <DNASlider
          label={tr('coachDna.step02.yearsLabel')}
          value={data.years}
          onChange={years => onChange({ years })}
          min={0} max={40}
          suffix={tr('coachDna.step02.yearsSuffix')}
          color={theme.accent}
        />
      </div>

      <FieldLabel>{tr('coachDna.step02.certsLabel')}</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {CERTS.map(cert => (
          <ChoiceCard
            key={cert.key}
            active={data.certs.includes(cert.key)}
            onClick={() => toggleCert(cert.key)}
            icon={cert.icon}
            title={certsLabel(cert.key)}
            color={theme.accent}
          />
        ))}
      </div>

      <PrivacyNote>
        {tr('coachDna.step02.privacyNote')}
      </PrivacyNote>
    </div>
  );
};
