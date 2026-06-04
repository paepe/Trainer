import React from 'react';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { Typography } from './Typography';
import { HStack, VStack } from './Layout';

export type AlertVariant = 'info' | 'warning' | 'success' | 'cyan' | 'coral' | 'amber' | 'green' | 'lavender';

export interface AlertProps {
  title?: string;
  text?: string;
  body?: string; // alias for text
  variant?: AlertVariant;
  action?: string;
  isAI?: boolean;
}

const TONE_COLORS: Record<string, string> = {
  info: BRAND.primary,
  warning: '#EF5B3C',
  success: '#00C853',
  cyan: '#0F8C85', // Using C.cyan from perf-atoms if it existed, substituting approximate
  coral: '#EF5B3C',
  amber: '#F5A623',
  green: '#00C853',
  lavender: '#8B5CF6',
};

export function Alert({ title, text, body, variant = 'info', action, isAI = false }: AlertProps) {
  const content = text || body || '';
  const color = TONE_COLORS[variant] || BRAND.primary;
  
  if (isAI) {
    return (
      <HStack 
        alignItems="flex-start"
        gap={12}
        padding={14}
        style={{
          borderRadius: 14,
          background: `linear-gradient(135deg, ${color}18 0%, ${color}06 100%)`,
          border: `1px solid ${color}55`,
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: `${color}22`, color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>
          ✦
        </div>
        <VStack gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Typography variant="overline" style={{ color, letterSpacing: '0.12em' }}>
            IA {title ? `· ${title}` : ''}
          </Typography>
          <Typography variant="body" color="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {content}
          </Typography>
          {action && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 8,
              background: DARK.surface, border: `1px dashed ${color}55`,
              fontSize: 12, color: DARK.textSec,
            }}>
              <span style={{ color }}>→</span> <b style={{ color: DARK.textPri }}>Action:</b> {action}
            </div>
          )}
        </VStack>
      </HStack>
    );
  }

  return (
    <HStack 
      alignItems="flex-start" 
      gap={10}
      padding="10px 14px"
      style={{
        borderRadius: 12,
        background: DARK.surface,
        borderLeft: `3px solid ${color}`
      }}
    >
      <Icon name={variant === 'warning' || variant === 'coral' || variant === 'amber' ? 'alertTriangle' : 'info'} size={14} color={color} stroke={2} />
      <Typography variant="body" color="secondary" style={{ fontSize: 12, lineHeight: 1.55 }}>
        {content}
      </Typography>
    </HStack>
  );
}
