import type { PlanKey } from '../types';
import { BRAND } from './tokens';

/** Plan identity tokens. Role theme and navy surfaces remain structural. */
export interface LicenseSkin {
  primary: string;
  primaryDeep: string;
}

const CLIENT_LICENSE_SKINS: Record<'free' | 'ai_fitness' | 'ai_performance', LicenseSkin> = {
  free: { primary: BRAND.primary, primaryDeep: BRAND.primaryDeep },
  ai_fitness: { primary: BRAND.success, primaryDeep: '#219653' },
  ai_performance: { primary: BRAND.lavender, primaryDeep: '#7C5CCB' },
};

export function getClientLicenseSkin(planKey?: PlanKey | string | null): LicenseSkin {
  if (planKey === 'ai_fitness') return CLIENT_LICENSE_SKINS.ai_fitness;
  if (planKey === 'ai_performance') return CLIENT_LICENSE_SKINS.ai_performance;
  return CLIENT_LICENSE_SKINS.free;
}
