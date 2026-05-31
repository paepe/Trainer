import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type { BiologicalSex, ProfileBasicData } from '../../../types/profile-v2';
import type { Profile } from '../../../types';

const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: 'female',            label: 'Female'            },
  { value: 'male',              label: 'Male'           },
  { value: 'intersex',          label: 'Intersex'           },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const bioSexToGender = (sex: BiologicalSex | undefined): Profile['gender'] => {
  if (sex === 'female')           return 'female';
  if (sex === 'male')             return 'male';
  if (sex === 'intersex')         return 'non-binary';
  return 'prefer_not_to_say';
};

function computeAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

interface PersonalUser {
  email?:    string;
  phone?:    string;
  dob?:      string;
  location?: string;
}

interface Step02Props extends WizardStepProps {
  user?:     PersonalUser;
  saveUser?: (d: Partial<Profile> & { email?: string }) => Promise<{ error: unknown }>;
}

export function Step02BasicData({
  dark, primary, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps,
  user, saveUser,
}: Step02Props) {
  const d = data.basic_data ?? {} as Partial<ProfileBasicData>;

  const setBasic = (patch: Partial<ProfileBasicData>) =>
    onUpdate({ basic_data: { ...d, ...patch } as ProfileBasicData });

  // Personal fields (profiles table)
  const [email,   setEmail]   = React.useState(user?.email    ?? '');
  const [phone,   setPhone]   = React.useState(user?.phone    ?? '');
  const [dob,     setDob]     = React.useState(user?.dob      ?? '');
  const [address, setAddress] = React.useState(user?.location ?? '');

  const age = computeAge(dob);

  const [emergencyOpen, setEmergencyOpen] = React.useState(
    !!(d.emergency_contact?.name || d.emergency_contact?.phone),
  );

  const canAdvance = !!(d.name?.trim() && dob && age !== null && d.height_cm && d.weight_kg && d.biological_sex);

  const handleNext = async () => {
    if (age !== null) {
      onUpdate({ basic_data: { ...d, age } as ProfileBasicData });
    }
    try {
      if (saveUser) {
        await saveUser({
          name:     (d.name ?? '').trim(),
          email:    (email ?? '').trim(),
          phone:    (phone ?? '').trim(),
          dob:      dob,
          location: (address ?? '').trim(),
          gender:   bioSexToGender(d.biological_sex),
        });
      }
    } catch { /* non-blocking — proceed regardless */ }
    onNext();
  };

  const handleSaveLater = async () => {
    if (age !== null) {
      onUpdate({ basic_data: { ...d, age } as ProfileBasicData });
    }
    try {
      if (saveUser) {
        await saveUser({
          name:     (d.name ?? '').trim(),
          email:    (email ?? '').trim(),
          phone:    (phone ?? '').trim(),
          dob:      dob,
          location: (address ?? '').trim(),
          gender:   bioSexToGender(d.biological_sex),
        });
      }
    } catch { /* non-blocking — proceed regardless */ }
    onSaveLater();
  };

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix="BLOCK" totalSteps={totalSteps} onBack={onBack} title="Personal Information" subtitle="Fill in your data to adapt the plan to your age, sex, and history." />

      
      

      <VStack gap={16}>

        {/* ── Identity ── */}
        <TextInput
          label="Name"
          value={d.name ?? ''}
          onChange={v => setBasic({ name: v })}
          placeholder="Mariana Costa"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextInput
            label="Email"
            value={email}
            onChange={setEmail}
            type="email" placeholder="you@email.com"
          />
          <TextInput
            label="Phone"
            value={phone}
            onChange={v => setPhone(v.replace(/[^\d+\s\-()]/g, ''))}
            type="tel" inputMode="tel" placeholder="+55 11 99999-0000"
          />
        </div>

        {/* DOB + age (read-only) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextInput
            label="Date of birth"
            value={dob}
            onChange={setDob}
            type="date" placeholder="AAAA-MM-DD"
          />
          {/* Age: computed, read-only */}
          <div>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
              textTransform: 'uppercase', color: textMute(dark), marginBottom: 6,
            }}>
              Age
            </div>
            <div style={{
              padding: '11px 14px', borderRadius: 12,
              background: surfRaised(dark),
              border: `1.5px solid ${borderSubtle(dark)}`,
              fontSize: 15, color: age !== null ? textPri(dark) : textMute(dark),
              fontFamily: 'inherit',
            }}>
              {age !== null ? `${age} years` : '—'}
            </div>
          </div>
        </div>

        <TextInput
          label="City / Address"
          value={address}
          onChange={setAddress}
          placeholder="New York, NY"
        />

        {/* ── Training data ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextInput
            label="Height (cm)"
            value={d.height_cm ? String(d.height_cm) : ''}
            onChange={v => setBasic({ height_cm: v ? +v : undefined as unknown as number })}
            type="number" inputMode="decimal" placeholder="165"
          />
          <TextInput
            label="Current weight (kg)"
            value={d.weight_kg ? String(d.weight_kg) : ''}
            onChange={v => setBasic({ weight_kg: v ? +v : undefined as unknown as number })}
            type="number" inputMode="decimal" placeholder="64"
          />
        </div>

        <TextInput
          label="Language"
          value={d.language ?? 'English'}
          onChange={v => setBasic({ language: v })}
          placeholder="English"
        />

        {/* Biological sex */}
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Biological sex</Typography>
          <HStack gap={8} flexWrap="wrap">
            {SEX_OPTIONS.map(o => {
              const on = d.biological_sex === o.value;
              return (
                <button key={o.value} onClick={() => setBasic({ biological_sex: o.value })} style={{
                  padding: '9px 14px', borderRadius: 14,
                  background: on ? `${primary}22` : surfRaised(dark),
                  color: on ? primary : textPri(dark),
                  border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {o.label}
                </button>
              );
            })}
          </HStack>
          <p style={{ fontSize: 11, color: textSec(dark), margin: '8px 0 0' }}>
            Used for personalization — never for diagnosis.
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
            <span style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>Emergency contact</span>
            <span style={{ fontSize: 12, color: textSec(dark) }}>{emergencyOpen ? '▲' : '▼'}</span>
          </button>
          {emergencyOpen && (
            <VStack gap={12} style={{ marginTop: 14 }}>
              <TextInput
                label="Name" value={d.emergency_contact?.name ?? ''}
                onChange={v => setBasic({ emergency_contact: { ...(d.emergency_contact ?? { phone: '' }), name: v } })} placeholder="First and last name"
              />
              <TextInput
                label="Phone" value={d.emergency_contact?.phone ?? ''}
                onChange={v => setBasic({ emergency_contact: { ...(d.emergency_contact ?? { name: '' }), phone: v } })} type="tel" inputMode="tel" placeholder="+55 11 99999-0000"
              />
            </VStack>
          )}
        </div>
      </VStack>

      <Spacer />
      <WizardFooter
        onNext={handleNext}
        nextDisabled={!canAdvance}
        onSave={handleSaveLater} saving={saving}
      />
    </VStack>
  );
}
