import type { UserProfileV2 } from '../../../types/profile-v2';

export type WizardData = Partial<UserProfileV2>;

export interface WizardStepProps {
  dark:        boolean;
  primary:     string;
  accent:      string;
  data:        WizardData;
  onUpdate:    (patch: WizardData) => void;
  onNext:      () => void;
  onBack:      () => void;
  onSaveLater: () => void;
  stepNum:     number;
  totalSteps:  number;
}
