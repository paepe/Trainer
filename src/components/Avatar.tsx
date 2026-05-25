import React from 'react';
import { Icon } from './Icon';

interface PhotoSlotProps {
  label:    string;
  w:        number | string;
  h:        number | string;
  dark?:    boolean;
  radius?:  number;
  style?:   React.CSSProperties;
}

export const PhotoSlot: React.FC<PhotoSlotProps> = ({
  label, w, h, dark = true, radius = 10, style = {},
}) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: dark
      ? 'repeating-linear-gradient(135deg,#1c2e44 0 8px,#16263a 8px 16px)'
      : 'repeating-linear-gradient(135deg,#e6e9ef 0 8px,#dade5 8px 16px)',
    color: dark ? 'rgba(255,255,255,.55)' : 'rgba(20,40,80,.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
    padding: 10, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    fontSize: 10, letterSpacing: '.04em', textTransform: 'uppercase',
    overflow: 'hidden', position: 'relative', flexShrink: 0,
    ...style,
  }}>{label}</div>
);

interface AvatarImageProps {
  url?:    string | null;
  label:   string;
  w:       number | string;
  h:       number | string;
  dark?:   boolean;
  radius?: number;
  style?:  React.CSSProperties;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  url, label, w, h, dark = true, radius = 10, style = {},
}) => {
  const [failed, setFailed] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    setFailed(false);
  }, [url]);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img || !url) return;
    if (img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [url, failed]);

  if (url && !failed) {
    return (
      <img
        ref={imgRef}
        src={url}
        alt={label}
        onError={() => setFailed(true)}
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth === 0) {
            setFailed(true);
          }
        }}
        style={{ width: w, height: h, borderRadius: radius, objectFit: 'cover', flexShrink: 0, ...style }}
      />
    );
  }

  return (
    <div
      aria-label={label}
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background: dark
          ? 'linear-gradient(180deg,#1c3550 0%,#142233 100%)'
          : 'linear-gradient(180deg,#eef4fb 0%,#dfe7f1 100%)',
        border: dark ? '1px solid #294463' : '1px solid #d4dce6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        ...style,
      }}
    >
      <Icon
        name="user"
        size={typeof w === 'number' ? Math.max(26, Math.round(w * 0.34)) : 30}
        color={dark ? 'rgba(255,255,255,.68)' : 'rgba(16,34,54,.45)'}
        stroke={2.1}
      />
    </div>
  );
};
