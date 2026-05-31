import React from 'react';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { DNASlider }   from '../components/DNASlider';
import { ChoiceCard }  from '../components/ChoiceCard';
import { FieldLabel }  from '../components/FieldLabel';
import { PrivacyNote } from '../components/PrivacyNote';
import { BRAND, DARK } from '../../theme/tokens';
import { CERTS }       from '../constants';
import type { CoachDNABackground } from '../../types/coach-dna';

interface Step02Props {
  data:     CoachDNABackground;
  onChange: (v: Partial<CoachDNABackground>) => void;
}

export const Step02Background: React.FC<Step02Props> = ({ data, onChange }) => {
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
        title="Background & experience"
        sub="How long you've been coaching and your academic / certification base."
      />
      <Hint>Your experience shapes the depth of the workouts generated.</Hint>

      <div style={{
        background: DARK.surface, borderRadius: 14,
        border: `1px solid ${DARK.border}`, padding: '16px 14px',
        marginBottom: 20,
      }}>
        <DNASlider
          label="Years of experience"
          value={data.years}
          onChange={years => onChange({ years })}
          min={0} max={40}
          suffix=" yrs"
          color={BRAND.accent}
        />
      </div>

      <FieldLabel>Certifications & education</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {CERTS.map(cert => (
          <ChoiceCard
            key={cert.key}
            active={data.certs.includes(cert.key)}
            onClick={() => toggleCert(cert.key)}
            icon={cert.icon}
            title={cert.label}
            color={BRAND.accent}
          />
        ))}
      </div>

      <PrivacyNote>
        Your background informs the AI Coach Engine about the technical depth of the protocols you use.
      </PrivacyNote>
    </div>
  );
};
