import React from 'react';
import { useTranslation } from 'react-i18next';
import { BRAND, THEME_VARS as DARK } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { HStack } from './Layout';
import { Button } from './Button';

export interface WizardFooterProps {
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  onSave?: () => void;
  saving?: boolean | undefined;
}

export function WizardFooter({
  onNext,
  nextLabel,
  nextDisabled,
  onSave,
  saving,
}: WizardFooterProps) {
  const { t: tr } = useTranslation();
  const effectiveNextLabel = nextLabel || tr('wizardFooter.continue');
  return (
    <div style={{ paddingTop: 20 }}>
      <HStack gap={8}>
        {onSave && (
          <Button
            variant="ghost"
            onClick={onSave}
            disabled={saving}
            style={{
              padding: '14px 18px',
              borderRadius: 14,
              borderColor: DARK.border,
              color: DARK.textSec,
              fontWeight: 600,
              fontSize: 12.5,
              whiteSpace: 'nowrap',
            }}
          >
            {saving ? tr('wizard.saving') : tr('wizardFooter.save')}
          </Button>
        )}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={nextDisabled || saving}
          style={{
            flex: 1,
            padding: '14px 18px',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: '0 10px 30px color-mix(in srgb, var(--signature) 20%, transparent)',
          }}
        >
          {effectiveNextLabel}
          <Icon name="chevR" size={14} color={DARK.surface} stroke={2.4} />
        </Button>
      </HStack>
    </div>
  );
}
