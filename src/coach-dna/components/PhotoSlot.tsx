import React from 'react';
import { Icon } from '../../components/Icon';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';
import { supabase } from '../../supabase';

interface PhotoSlotProps {
  value:     string | null;
  onChange:  (url: string) => void;
  name?:     string;
  trainerId: string;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export const PhotoSlot: React.FC<PhotoSlotProps> = ({ value, onChange, name = '', trainerId }) => {
  const { t } = useTheme();
  const fileRef  = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [failed,  setFailed]  = React.useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setLoading(true);

    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `${trainerId}/coach-dna-avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      onChange(`${urlData.publicUrl}?t=${Date.now()}`);
      setFailed(false);
    }
    setLoading(false);
  };

  const hasImage = value && !failed;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
      {/* slot */}
      <div
        onClick={() => !loading && fileRef.current?.click()}
        style={{
          width: 92, height: 92, borderRadius: 24, flexShrink: 0,
          background:  hasImage ? 'transparent' : DARK.surface,
          border:      `1.5px solid ${hasImage ? t.accent : DARK.border}`,
          overflow:    'hidden', cursor: loading ? 'default' : 'pointer',
          display:     'flex', alignItems: 'center', justifyContent: 'center',
          position:    'relative',
        }}
      >
        {hasImage ? (
          <>
            <img
              src={value!}
              alt="avatar"
              onError={() => setFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, insetInline: 0,
              background: 'rgba(0,0,0,.55)', padding: '4px 0',
              fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
              textTransform: 'uppercase', color: '#fff', textAlign: 'center',
            }}>
              CHANGE
            </div>
          </>
        ) : loading ? (
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: `2px solid ${DARK.border}`, borderTopColor: t.accent,
            animation: 'spin .7s linear infinite',
          }}/>
        ) : name ? (
          <span style={{ fontSize: 26, fontWeight: 800, color: t.accent }}>
            {initials(name)}
          </span>
        ) : (
          <Icon name="camera" size={28} color={DARK.textMute}/>
        )}
      </div>

      {/* label + action */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: DARK.textSec, lineHeight: 1.4 }}>
          Coach profile photo
        </p>
        <button
          onClick={() => !loading && fileRef.current?.click()}
          style={{
            padding:      '8px 14px', borderRadius: 10, border: `1px solid ${DARK.border}`,
            background:   'transparent', color: DARK.textSec,
            fontSize:     12.5, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          <Icon name="camera" size={13} color={DARK.textSec}/>{' '}
          {hasImage ? 'Change image' : 'Upload image'}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
