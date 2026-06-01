// ── Runtime profile signature for the static data-viz layer ──────────────────
// Some Performance-Dashboard atoms read colours from a static `C` object instead
// of the `t` theme prop. This module is the single switch that flips that layer's
// signature colour by profile, mirroring tokens.ts:
//   • CLIENT  → cyan   (#2DD4E0 / deep #0F8C85)
//   • TRAINER → coral  (#EF5B3C / deep #C23B22)
// App.tsx calls setVizProfile(isTrainer) so `C.cyan`/`C.cyanDeep` resolve correctly.

let _signature     = '#2DD4E0';
let _signatureDeep = '#0F8C85';

export function setVizProfile(isTrainer: boolean): void {
  _signature     = isTrainer ? '#EF5B3C' : '#2DD4E0';
  _signatureDeep = isTrainer ? '#C23B22' : '#0F8C85';
}

export function vizSignature(): string     { return _signature; }
export function vizSignatureDeep(): string { return _signatureDeep; }
