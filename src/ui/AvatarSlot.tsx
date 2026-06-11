import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { Spinner } from './Spinner';
import { THEME_VARS as DARK } from '../theme/tokens';
import { useAvatarUpload } from '../hooks/useAvatarUpload';

export interface AvatarSlotProps {
  value:      string | null;
  onChange:   (url: string) => void | Promise<void>;
  buildPath:  (ext: string) => string;
  name?:      string;
  label?:     string;
  accent?:    string;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/**
 * Shared "photo slot" upload control — square avatar preview with a
 * change/upload button. Uploads to the `avatars` Storage bucket via
 * `useAvatarUpload` and reports the new public URL through `onChange`,
 * which is responsible for any local state update and persistence.
 */
export const AvatarSlot: React.FC<AvatarSlotProps> = ({
  value, onChange, buildPath, name = '', label, accent = '#2DD4E0',
}) => {
  const { t: tr } = useTranslation();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [failed, setFailed] = React.useState(false);

  const { uploading, upload } = useAvatarUpload({
    buildPath,
    onUploaded: url => { setFailed(false); return onChange(url); },
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    await upload(file);
  };

  const hasImage = value && !failed;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
      {/* slot */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          width: 92, height: 92, borderRadius: 24, flexShrink: 0,
          background:  hasImage ? 'transparent' : DARK.surface,
          border:      `1.5px solid ${hasImage ? accent : DARK.border}`,
          overflow:    'hidden', cursor: uploading ? 'default' : 'pointer',
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
              {tr('common.avatarSlot.changeLabel')}
            </div>
          </>
        ) : uploading ? (
          <Spinner size={20} thickness={2} color={accent} trackColor={DARK.border} />
        ) : name ? (
          <span style={{ fontSize: 26, fontWeight: 800, color: accent }}>
            {initials(name)}
          </span>
        ) : (
          <Icon name="camera" size={28} color={DARK.textMute}/>
        )}
      </div>

      {/* label + action */}
      {label && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: DARK.textSec, lineHeight: 1.4 }}>
            {label}
          </p>
          <button
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              padding:      '8px 14px', borderRadius: 10, border: `1px solid ${DARK.border}`,
              background:   'transparent', color: DARK.textSec,
              fontSize:     12.5, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <Icon name="camera" size={13} color={DARK.textSec}/>{' '}
            {hasImage
              ? tr('common.avatarSlot.changeImage')
              : tr('common.avatarSlot.uploadImage')}
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  );
};
