import React from 'react';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';

export interface TypographyProps extends React.HTMLAttributes<HTMLDivElement | HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'caption' | 'overline';
  color?: 'primary' | 'secondary' | 'muted' | 'brand' | 'accent';
  weight?: 400 | 500 | 600 | 700 | 800;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
  as?: React.ElementType;
}

export function Typography({
  variant = 'body',
  color = 'primary',
  weight,
  align = 'left',
  children,
  style,
  as,
  ...rest
}: TypographyProps) {
  
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'h1': return { fontSize: 28, fontWeight: weight || 800, letterSpacing: '-0.02em', fontFamily: '"Plus Jakarta Sans",sans-serif', margin: 0 };
      case 'h2': return { fontSize: 22, fontWeight: weight || 700, letterSpacing: '-0.01em', margin: 0 };
      case 'h3': return { fontSize: 18, fontWeight: weight || 600, margin: 0 };
      case 'subtitle': return { fontSize: 15, fontWeight: weight || 500, margin: 0 };
      case 'caption': return { fontSize: 11, fontWeight: weight || 400, margin: 0 };
      case 'overline': return { fontSize: 10.5, fontWeight: weight || 700, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: '"JetBrains Mono",ui-monospace,monospace', margin: 0 };
      case 'body':
      default: return { fontSize: 14, fontWeight: weight || 400, margin: 0 };
    }
  };

  const getColor = () => {
    switch (color) {
      case 'primary': return DARK.textPri;
      case 'secondary': return DARK.textSec;
      case 'muted': return DARK.textMute;
      case 'brand': return BRAND.primary;
      case 'accent': return BRAND.accent;
      default: return DARK.textPri;
    }
  };

  const Tag = as || (variant.startsWith('h') ? variant : (variant === 'caption' ? 'span' : 'p')) as React.ElementType;

  return (
    <Tag
      style={{
        color: getColor(),
        textAlign: align,
        ...getVariantStyles(),
        ...style
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
