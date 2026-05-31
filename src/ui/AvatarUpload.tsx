import React, { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { BRAND, DARK } from '../theme/tokens';
import { HStack, VStack } from './Layout';
import { Typography } from './Typography';

export interface AvatarUploadProps {
  value: string | null;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string | null>;
  name?: string;
  label?: string;
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export function AvatarUpload({
  value,
  onChange,
  onUpload,
  name = '',
  label = 'Foto de perfil',
}: AvatarUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const url = await onUpload(file);
      if (url) {
        onChange(url);
        setFailed(false);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasImage = value && !failed;

  return (
    <HStack alignItems="center" gap={16} style={{ marginBottom: 20 }}>
      {/* Slot */}
      <div
        onClick={() => !loading && fileRef.current?.click()}
        style={{
          width: 92,
          height: 92,
          borderRadius: 24,
          flexShrink: 0,
          background: hasImage ? 'transparent' : DARK.surface,
          border: `1.5px solid ${hasImage ? BRAND.accent : DARK.border}`,
          overflow: 'hidden',
          cursor: loading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
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
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                insetInline: 0,
                background: 'rgba(0,0,0,.55)',
                padding: '4px 0',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: '#fff',
                textAlign: 'center',
              }}
            >
              TROCAR
            </div>
          </>
        ) : loading ? (
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${DARK.border}`,
              borderTopColor: BRAND.accent,
              animation: 'spin .7s linear infinite',
            }}
          />
        ) : name ? (
          <span style={{ fontSize: 26, fontWeight: 800, color: BRAND.accent }}>
            {getInitials(name)}
          </span>
        ) : (
          <Icon name="camera" size={28} color={DARK.textMute} />
        )}
      </div>

      {/* Label + Action */}
      <VStack gap={8}>
        <Typography variant="body" color="secondary" style={{ fontSize: 13, lineHeight: 1.4 }}>
          {label}
        </Typography>
        <button
          onClick={() => !loading && fileRef.current?.click()}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: `1px solid ${DARK.border}`,
            background: 'transparent',
            color: DARK.textSec,
            fontSize: 12.5,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="camera" size={13} color={DARK.textSec} />
          {hasImage ? 'Trocar imagem' : 'Enviar imagem'}
        </button>
      </VStack>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </HStack>
  );
}
