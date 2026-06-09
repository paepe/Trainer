import React from 'react';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';
import { VStack, HStack } from './Layout';
import { Typography } from './Typography';

export interface WizardHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  badge?: string;
  stepPrefix?: string;
  onBack?: () => void;
}

export function WizardHeader({
  currentStep,
  totalSteps,
  title,
  subtitle,
  badge,
  stepPrefix = 'STEP',
  onBack,
}: WizardHeaderProps) {
  return (
    <VStack style={{ marginBottom: 20 }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: DARK.surface, border: `1px solid ${DARK.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: DARK.textPri,
            marginBottom: 16,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      )}

      {currentStep > 0 && totalSteps > 0 && (
        <div style={{ height: 3, borderRadius: 2, background: DARK.border, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{
            height: '100%', width: `${(currentStep / totalSteps) * 100}%`,
            background: `linear-gradient(90deg, #0F8C85 0%, ${BRAND.primary} 100%)`,
            borderRadius: 2, transition: 'width .35s ease',
          }}/>
        </div>
      )}

      <HStack alignItems="center" gap={8} style={{ marginBottom: 6 }}>
        <span
          style={{
            fontFamily: '"JetBrains Mono",ui-monospace,monospace',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            color: BRAND.primary,
          }}
        >
          {stepPrefix} {String(currentStep).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
        </span>
        {badge && (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: `${BRAND.accent}22`,
              color: BRAND.accent,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
            }}
          >
            {badge}
          </span>
        )}
      </HStack>
      <Typography variant="h2" style={{ lineHeight: 1.15, marginBottom: subtitle ? 6 : 0 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body" color="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>
          {subtitle}
        </Typography>
      )}
    </VStack>
  );
}
