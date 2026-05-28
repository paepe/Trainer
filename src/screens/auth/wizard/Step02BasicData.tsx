import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, FieldInput, SectionLabel } from './atoms';
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
  dark, primary, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps,
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

  const canAdvance = !!(d.name?.trim() && dob && age !== null && d.height_cm && d.weight_kg);

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
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Personal Information
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 22px', lineHeight: 1.55 }}>
        Fill in your data to adapt the plan to your age, sex, and history.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Identity ── */}
        <FieldInput
          label="Name"
          value={d.name ?? ''}
          onChange={v => setBasic({ name: v })}
          dark={dark} primary={primary}
          placeholder="Mariana Costa"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldInput
            label="Email"
            value={email}
            onChange={setEmail}
            dark={dark} primary={primary}
            type="email" placeholder="you@email.com"
          />
          <FieldInput
            label="Phone"
            value={phone}
            onChange={v => setPhone(v.replace(/[^\d+\s\-()]/g, ''))}
            dark={dark} primary={primary}
            type="tel" inputMode="tel" placeholder="+55 11 99999-0000"
          />
        </div>

        {/* DOB + age (read-only) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldInput
            label="Date of birth"
            value={dob}
            onChange={setDob}
            dark={dark} primary={primary}
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

        <FieldInput
          label="City / Address"
          value={address}
          onChange={setAddress}
          dark={dark} primary={primary}
          placeholder="New York, NY"
        />

        {/* ── Training data ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldInput
            label="Height (cm)"
            value={d.height_cm ? String(d.height_cm) : ''}
            onChange={v => setBasic({ height_cm: v ? +v : undefined as unknown as number })}
            dark={dark} primary={primary}
            type="number" inputMode="decimal" placeholder="165"
          />
          <FieldInput
            label="Current weight (kg)"
            value={d.weight_kg ? String(d.weight_kg) : ''}
            onChange={v => setBasic({ weight_kg: v ? +v : undefined as unknown as number })}
            dark={dark} primary={primary}
            type="number" inputMode="decimal" placeholder="64"
          />
        </div>

        <FieldInput
          label="Language"
          value={d.language ?? 'English'}
          onChange={v => setBasic({ language: v })}
          dark={dark} primary={primary}
          placeholder="English"
        />

        {/* Biological sex */}
        <div>
          <SectionLabel label="Biological sex" dark={dark}/>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SEX_OPTIONS.map(o => {
              const on = d.biological_sex === o.value;
              return (
                <button key={o.value} onClick={() => setBasic({ biological_sex: o.value })} style={{
                  padding: '9px 14px', borderRadius: 999,
                  background: on ? `${primary}22` : surfRaised(dark),
                  color: on ? primary : textPri(dark),
                  border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {o.label}
                </button>
              );
            })}
          </div>
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
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FieldInput
                label="Name" value={d.emergency_contact?.name ?? ''}
                onChange={v => setBasic({ emergency_contact: { ...(d.emergency_contact ?? { phone: '' }), name: v } })}
                dark={dark} primary={primary} placeholder="First and last name"
              />
              <FieldInput
                label="Phone" value={d.emergency_contact?.phone ?? ''}
                onChange={v => setBasic({ emergency_contact: { ...(d.emergency_contact ?? { name: '' }), phone: v } })}
                dark={dark} primary={primary} type="tel" inputMode="tel" placeholder="+55 11 99999-0000"
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1 }}/>
      <WizardFooter
        onNext={handleNext}
        nextDisabled={!canAdvance}
        dark={dark} primary={primary}
      />
    </div>
  );
}
