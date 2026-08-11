// ── Runtime profile signature for the static data-viz layer ──────────────────
// Some Performance-Dashboard atoms read colours from a static `C` object instead
// of the `t` theme prop. This module is the single switch that flips that layer's
// signature colour by profile, mirroring tokens.ts:
//   • CLIENT  → current commercial license skin
//   • TRAINER → coral  (#EF5B3C / deep #C23B22)
// App.tsx calls setVizProfile(...) so `C.cyan`/`C.cyanDeep` resolve correctly.

import { getClientLicenseSkin } from './licenseSkin';
import type { PlanKey } from '../types';

let _signature     = '#2DD4E0';
let _signatureDeep = '#0F8C85';

export function setVizProfile(isTrainer: boolean, clientPlanKey?: PlanKey | string | null): void {
  if (isTrainer) {
    _signature = '#EF5B3C';
    _signatureDeep = '#C23B22';
    return;
  }
  const skin = getClientLicenseSkin(clientPlanKey);
  _signature = skin.primary;
  _signatureDeep = skin.primaryDeep;
}

export function vizSignature(): string     { return _signature; }
export function vizSignatureDeep(): string { return _signatureDeep; }
