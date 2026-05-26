import React from 'react';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { AvatarImage } from '../../components/Avatar';
import { ScreenTitle } from '../../components/ScreenTitle';
import { PillInput } from '../../components/PillInput';
import { surfRaised, borderSubtle, textPri, textMute, primaryBtn } from '../../theme';
import type { NavFn, Profile } from '../../types';

interface Theme {
  primary: string;
  accent:  string;
}

interface AppUser {
  id:         string | null;
  name:       string;
  email:      string;
  phone?:     string | null;
  dob?:       string | null;
  location?:  string | null;
  gender?:    string | null;
  avatar_url: string | null;
}

interface EditProfileScreenProps {
  nav:     NavFn;
  t:       Theme;
  dark:    boolean;
  user:    AppUser;
  setUser: (updates: Partial<Profile> & { email?: string }) => Promise<{ error: unknown }>;
}

const GENDER_OPTS = [
  { key: 'male',              label: 'Male' },
  { key: 'female',            label: 'Female' },
  { key: 'non-binary',        label: 'Non-binary' },
  { key: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

type Draft = { name: string; email: string; phone: string; dob: string; loc: string; gender: string };

export function EditProfileScreen({ nav, t, dark, user, setUser }: EditProfileScreenProps) {
  const [draft, setDraft] = React.useState<Draft>({
    name:   user.name     || '',
    email:  user.email    || '',
    phone:  user.phone    || '',
    dob:    user.dob      || '',
    loc:    user.location || '',
    gender: user.gender   || '',
  });
  const [avatarUrl,       setAvatarUrl]       = React.useState<string | null>(user.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [uploadErr,       setUploadErr]       = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [saving,  setSaving]  = React.useState(false);
  const [saveErr, setSaveErr] = React.useState<string | null>(null);

  const formatPhone = (raw: string) => raw.replace(/[^\d+\s\-()]/g, '');

  const profilePayload: Partial<Profile> & { email?: string } = {
    name:       draft.name.trim(),
    email:      draft.email.trim(),
    phone:      draft.phone.trim()  || '',
    dob:        draft.dob           || '',
    location:   draft.loc.trim()    || '',
    gender:     (draft.gender as Profile['gender']) || '',
    avatar_url: avatarUrl,
  };

  const getErrorMessage = (value: unknown) => {
    if (!value) return null;
    if (value instanceof Error) return value.message;
    if (typeof value === 'object' && 'message' in value && typeof value.message === 'string') {
      return value.message;
    }
    return 'Unable to save your profile right now.';
  };

  const save = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      const profileResult = await setUser(profilePayload);
      const profileError = getErrorMessage((profileResult as { error?: unknown })?.error);
      if (profileError) {
        setSaveErr(profileError);
        return;
      }

      nav('profile');
    } catch (err) {
      setSaveErr(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploadingAvatar(true);
    setUploadErr(null);
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploadErr(error.message);
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    }
    setUploadingAvatar(false);
  };

  const fields: [keyof Draft, string, string, string][] = [
    ['name',  'user',  'Full name',     'text'],
    ['email', 'mail',  'Email',         'email'],
    ['phone', 'phone', 'Phone number',  'tel'],
    ['dob',   'cal',   'Date of birth', 'date'],
    ['loc',   'pin',   'Location',      'text'],
  ];

  return (
    <>
      <ScreenTitle dark={dark}>Edit Profile</ScreenTitle>

      {/* Avatar upload */}
      <div style={{ padding: '0 22px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <AvatarImage url={avatarUrl} label="photo" w={80} h={80} radius={16} dark={dark}/>
          <button
            onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 28, height: 28, borderRadius: '50%',
              background: t.primary, color: '#0E1A2B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: `2px solid ${dark ? '#0E1A2B' : '#fff'}`, padding: 0,
            }}
          >
            <Icon name="edit" size={13} color="#0E1A2B" stroke={2.5}/>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: uploadErr ? t.accent : textPri(dark) }}>
            {uploadingAvatar ? 'Uploading…' : uploadErr ?? 'Tap the icon to change your photo'}
          </div>
          <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>JPG, PNG or WebP · max 5 MB</div>
        </div>
      </div>

      {/* Text fields */}
      <div style={{ padding: '0 22px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map(([k, ic, label, type]) => (
          <PillInput key={k} icon={ic} placeholder={label} type={type as 'text' | 'email' | 'password'}
            value={draft[k]}
            onChange={v => setDraft({ ...draft, [k]: type === 'tel' ? formatPhone(v) : v })}
            primary={t.primary} dark={dark}/>
        ))}
      </div>

      {/* Gender picker */}
      <div style={{ padding: '0 22px 18px' }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: textMute(dark), marginBottom: 10,
        }}>Gender</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GENDER_OPTS.map(({ key, label }) => {
            const on = draft.gender === key;
            return (
              <button key={key} onClick={() => setDraft({ ...draft, gender: key })} style={{
                padding: '9px 16px', borderRadius: 999,
                background: on ? `${t.primary}22` : surfRaised(dark),
                color: on ? t.primary : textPri(dark),
                border: `1.5px solid ${on ? t.primary : borderSubtle(dark)}`,
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{label}</button>
            );
          })}
        </div>
      </div>

      {saveErr && <div style={{ padding: '0 22px 10px', fontSize: 13, color: t.accent }}>{saveErr}</div>}

      <div style={{ padding: '0 22px 28px' }}>
        <button onClick={save} disabled={saving} style={{ ...primaryBtn(), opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </>
  );
}
