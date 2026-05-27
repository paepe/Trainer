import type { CheckInQuick, CheckInDetailed, SafetyGateResult, SafetyGateStatus, SafetySignal } from '../../types/checkin-v2';

const SIGNAL_LABELS: Record<SafetySignal, string> = {
  severe_pain:          'severe pain',
  dizziness:            'dizziness',
  shortness_of_breath:  'shortness of breath',
  chest_pain:           'chest pain',
  malaise:              'malaise',
  loss_of_balance:      'loss of balance',
  fainting_sensation:   'fainting sensation',
};

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

  const status: SafetyGateStatus =
    hasSignals || score < 30 ? 'blocked' :
    score < 55               ? 'caution' : 'clear';

  const painIntensity = data.pain.present ? (data.pain.intensity ?? 0) : 0;
  const firstSignal   = signals[0];

  const rec = hasSignals && firstSignal
    ? `Seek guidance if symptom persists${data.pain.region ? ` · pain ${data.pain.region}` : ''} · signal: ${SIGNAL_LABELS[firstSignal]}.`
    : score < 55
    ? 'Adapted session recommended — reduced intensity.'
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
