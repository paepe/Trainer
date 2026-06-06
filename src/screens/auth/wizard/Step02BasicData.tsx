import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type { BiologicalSex, ProfileBasicData } from '../../../types/profile-v2';
import type { Profile } from '../../../types';

const SEX_OPTIONS: BiologicalSex[] = ['female', 'male', 'intersex', 'prefer_not_to_say'];

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
  const { t: tr } = useTranslation();
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
      <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack} title={tr('wizard.step02.title')} subtitle={tr('wizard.step02.subtitle')} />

      
      

      <VStack gap={16}>

        {/* ── Identity ── */}
        <TextInput
          label={tr('wizard.step02.name')}
          value={d.name ?? ''}
          onChange={v => setBasic({ name: v })}
          placeholder={tr('wizard.step02.namePlaceholder')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextInput
            label={tr('wizard.step02.email')}
            value={email}
            onChange={setEmail}
            type="email" placeholder={tr('wizard.step02.emailPlaceholder')}
          />
          <TextInput
            label={tr('wizard.step02.phone')}
            value={phone}
            onChange={v => setPhone(v.replace(/[^\d+\s\-()]/g, ''))}
            type="tel" inputMode="tel" placeholder={tr('wizard.step02.phonePlaceholder')}
          />
        </div>

        {/* DOB + age (read-only) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextInput
            label={tr('wizard.step02.dob')}
            value={dob}
            onChange={setDob}
            type="date" placeholder={tr('wizard.step02.dobPlaceholder')}
          />
          {/* Age: computed, read-only */}
          <div>
            <div style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em',
              textTransform: 'uppercase', color: textMute(dark), marginBottom: 6,
            }}>
              {tr('wizard.step02.age')}
            </div>
            <div style={{
              padding: '11px 14px', borderRadius: 12,
              background: surfRaised(dark),
              border: `1.5px solid ${borderSubtle(dark)}`,
              fontSize: 15, color: age !== null ? textPri(dark) : textMute(dark),
              fontFamily: 'inherit',
            }}>
              {age !== null ? tr('wizard.step02.ageValue', { count: age }) : tr('common.noData')}
            </div>
          </div>
        </div>

        <TextInput
          label={tr('wizard.step02.cityAddress')}
          value={address}
          onChange={setAddress}
          placeholder={tr('wizard.step02.addressPlaceholder')}
        />

        {/* ── Training data ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextInput
            label={tr('wizard.step02.height')}
            value={d.height_cm ? String(d.height_cm) : ''}
            onChange={v => setBasic({ height_cm: v ? +v : undefined as unknown as number })}
            type="number" inputMode="decimal" placeholder={tr('wizard.step02.heightPlaceholder')}
          />
          <TextInput
            label={tr('wizard.step02.weight')}
            value={d.weight_kg ? String(d.weight_kg) : ''}
            onChange={v => setBasic({ weight_kg: v ? +v : undefined as unknown as number })}
            type="number" inputMode="decimal" placeholder={tr('wizard.step02.weightPlaceholder')}
          />
        </div>

        {/* Biological sex */}
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step02.biologicalSex')}</Typography>
          <HStack gap={8} flexWrap="wrap">
            {SEX_OPTIONS.map(o => {
              const on = d.biological_sex === o;
              return (
                <button key={o} onClick={() => setBasic({ biological_sex: o })} style={{
                  padding: '9px 14px', borderRadius: 14,
                  background: on ? `${primary}22` : surfRaised(dark),
                  color: on ? primary : textPri(dark),
                  border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {tr(`wizard.step02.sex.${o}`)}
                </button>
              );
            })}
          </HStack>
          <p style={{ fontSize: 11, color: textSec(dark), margin: '8px 0 0' }}>
            {tr('wizard.step02.sexNote')}
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
            <span style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>{tr('wizard.step02.emergencyContact')}</span>
            <span style={{ fontSize: 12, color: textSec(dark) }}>{emergencyOpen ? '▲' : '▼'}</span>
          </button>
          {emergencyOpen && (
            <VStack gap={12} style={{ marginTop: 14 }}>
              <TextInput
                label={tr('wizard.step02.name')} value={d.emergency_contact?.name ?? ''}
                onChange={v => setBasic({ emergency_contact: { ...(d.emergency_contact ?? { phone: '' }), name: v } })} placeholder={tr('wizard.step02.emergencyNamePlaceholder')}
              />
              <TextInput
                label={tr('wizard.step02.phone')} value={d.emergency_contact?.phone ?? ''}
                onChange={v => setBasic({ emergency_contact: { ...(d.emergency_contact ?? { name: '' }), phone: v } })} type="tel" inputMode="tel" placeholder={tr('wizard.step02.emergencyPhonePlaceholder')}
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
