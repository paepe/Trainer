import i18n from '../../i18n';
import type { CheckInQuick, CheckInDetailed, SafetyGateResult, SafetyGateStatus, SafetySignal } from '../../types/checkin-v2';

export function computeSafetyGate(data: CheckInQuick | CheckInDetailed): SafetyGateResult {
  const signals: SafetySignal[] = (data as CheckInDetailed).safety_signals ?? [];
  const hasSignals = signals.length > 0;

  let score = 100;
  score -= (10 - data.energy) * 5;
  score -= data.fatigue * 3;

  if (data.sleep_quality === 'poor')    score -= 15;
  else if (data.sleep_quality === 'regular') score -= 7;

  if (data.pain.present) score -= (data.pain.intensity ?? 5) * 3;
  score -= signals.length * 15;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Block threshold (30) is a fixed clinical default — deliberately NOT a user
  // preference (Tier 3 decision 2026-06-05): self-lowering it would let a client
  // train while the gate should block them. Stays in code with the score coeffs.
  const status: SafetyGateStatus =
    hasSignals || score < 30 ? 'blocked' :
    score < 55               ? 'caution' : 'clear';

  const painIntensity = data.pain.present ? (data.pain.intensity ?? 0) : 0;
  const firstSignal   = signals[0];

  const rec = hasSignals && firstSignal
    ? i18n.t('safetyGate.seekGuidance', { region: data.pain.region ?? '', signal: i18n.t(`checkinEnums.signals.${firstSignal}`) })
    : score < 55
    ? i18n.t('safetyGate.adaptedRecommended')
    : undefined;

  return {
    status,
    triggered_signals:      signals,
    readiness_score:        score,
    ...(rec != null ? { recommended_action: rec } : {}),
    session_completion_pct: Math.round(score * 0.4),
    passage_risk_pct:       Math.round(Math.max(0, 100 - score) * 0.18),
    pain_alert_level:       painIntensity >= 7 ? 'high' : painIntensity >= 4 ? 'moderate' : 'low',
    recovery_status:        score >= 70 ? 'stable' : score >= 50 ? 'recovering' : 'at_risk',
    ai_led_blocked:         hasSignals || score < 30,
    human_review_required:  hasSignals || score < 25,
    computed_at:            new Date().toISOString(),
  };
}
