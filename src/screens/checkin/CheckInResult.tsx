import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle, primaryBtn, outlineBtn } from '../../theme';
import type { SafetyGateResult } from '../../types/checkin-v2';
import type { RiskClassification } from '../../types/profile-v2';
import { RiskCard } from '../../components/RiskCard';
import { supabase } from '../../supabase';

interface CheckInResultProps {
  dark:                    boolean;
  primary:                 string;
  accent:                  string;
  result:                  SafetyGateResult;
  risk?:                   RiskClassification;
  onDone:                  () => void;
  onAlert:                 () => void;
  onBack?:                 () => void;
  isTrainerContext?:        boolean;
  freeSession?:            boolean;
  linkedTrainerId?:        string;
  userId?:                 string | null;
  workoutReadyExpiryMin?:  number; // default 30
}

function ReadinessGauge({ score, color, dark }: { score: number; color: string; dark: boolean }) {
  const r    = 50;
  const cx   = 60;
  const cy   = 60;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;

  return (
    <svg width={120} height={120} viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={dark ? '#ffffff10' : '#0000000d'} strokeWidth={10}/>
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 4} textAnchor="middle"
        fill={color} fontSize={30} fontWeight={700}
        fontFamily='"Plus Jakarta Sans",sans-serif'>
        {score}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle"
        fill={textMute(dark)} fontSize={11}
        fontFamily='"Plus Jakarta Sans",sans-serif'>
        /100
      </text>
    </svg>
  );
}

function StatCell({ label, value, color, dark }: { label: string; value: string; color?: string; dark: boolean }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color ?? textPri(dark) }}>
        {value}
      </div>
    </div>
  );
}

const STATUS_META: Record<string, { color: string; bg: string }> = {
  clear:   { color: '#4ade80', bg: '#4ade8012' },
  caution: { color: '#F5A623', bg: '#F5A62312' },
  blocked: { color: '#EF5B3C', bg: '#EF5B3C12' },
};

export function CheckInResult({ dark, primary, accent, result, risk, onDone, onAlert, onBack, isTrainerContext, freeSession, linkedTrainerId, userId, workoutReadyExpiryMin = 30 }: CheckInResultProps) {
  const { t: tr } = useTranslation();
  const meta         = STATUS_META[result.status] ?? { color: '#4ade80', bg: '#4ade8012' };
  const isBlocked    = result.ai_led_blocked;
  const hasTrainer   = !!linkedTrainerId;

  // ── Pending request state ─────────────────────────────────────────────────
  // 'idle'    — no active request, button available
  // 'pending' — request sent, within expiry window, button replaced by countdown
  // 'expired' — expiry passed with no response, button restored for new request
  type RequestState = 'idle' | 'pending' | 'expired';
  const [requestState, setRequestState] = React.useState<RequestState>('idle');
  const [minsLeft, setMinsLeft] = React.useState<number>(workoutReadyExpiryMin);
  const [notified, setNotified] = React.useState(false); // kept for compat, drives requestState

  // On mount: check DB for an active workout_ready sent to this trainer
  React.useEffect(() => {
    if (!hasTrainer || !userId || !linkedTrainerId) return;
    let cancelled = false;

    supabase
      .from('notification_log')
      .select('id, expires_at, response')
      .eq('from_user_id', userId)
      .eq('to_user_id', linkedTrainerId)
      .eq('type', 'workout_ready')
      .is('response', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        const row = data[0] as { id: string; expires_at: string | null; response: string | null };
        if (!row.expires_at) return;
        const expiresAt = new Date(row.expires_at).getTime();
        const now = Date.now();
        if (expiresAt > now) {
          // Still within window — show pending state with remaining time
          setRequestState('pending');
          setNotified(true);
          setMinsLeft(Math.ceil((expiresAt - now) / 60000));
        } else {
          // Expired without response — restore button for new request
          setRequestState('expired');
        }
      });

    return () => { cancelled = true; };
  }, [hasTrainer, userId, linkedTrainerId]);

  // Countdown: decrement minsLeft every minute while pending
  React.useEffect(() => {
    if (requestState !== 'pending') return;
    const id = setInterval(() => {
      setMinsLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setRequestState('expired'); // time's up — restore button
          setNotified(false);
          return 0;
        }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(id);
  }, [requestState]);

  // Free Training Session: a "blocked" readiness verdict (computeSafetyGate) means
  // NOT READY — the plan must not be unlocked. Only "go back" is offered.
  const freeBlocked  = freeSession && result.status === 'blocked';

  const heading = tr('checkin.result.viewCautionOptions');

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary }}>
          {tr('perf.tabs.performance')} · {tr('perf.tabs.scores')} · {tr('perf.tabs.overview')}
        </div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: textMute(dark),
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = dark ? '#ffffff08' : '#00000008'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {tr('checkin.result.backButton')}
          </button>
        )}
      </div>

      <h2 style={{
        margin: '0 0 24px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {heading}
      </h2>

      {/* Gauge */}
      <div style={{
        padding: '24px', borderRadius: 18, marginBottom: 16,
        background: meta.bg, border: `1.5px solid ${meta.color}33`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: meta.color, marginBottom: 16 }}>
          {tr('checkin.result.recovery')}
        </div>
        <ReadinessGauge score={result.readiness_score} color={meta.color} dark={dark}/>
      </div>

      {/* Safety Gate card */}
      {isBlocked && (
        <div style={{
          padding: '14px 16px', borderRadius: 14, marginBottom: 12,
          background: `${accent}14`, border: `1.5px solid ${accent}55`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: accent, marginBottom: 4 }}>
            {tr('checkin.result.safetyGateBlockedLabel')}
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: textSec(dark), lineHeight: 1.5 }}>
            {tr('checkin.result.safetyGateBlockedBody')}
          </p>
        </div>
      )}

      {/* Recommended action */}
      {result.recommended_action && (
        <div style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 16,
          background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 4 }}>
            {tr('checkin.result.recommendedAction')}
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: textSec(dark), lineHeight: 1.5 }}>
            {result.recommended_action}
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
        {result.session_completion_pct != null && (
          <StatCell label={tr('checkin.result.statSessionCompletion')} value={`${result.session_completion_pct}%`} dark={dark}/>
        )}
        {result.passage_risk_pct != null && (
          <StatCell label={tr('checkin.result.statFatigueRisk')} value={`${result.passage_risk_pct}%`} dark={dark}/>
        )}
        {result.pain_alert_level && (
          <StatCell label={tr('checkin.result.statPainAlert')} value={tr(`checkin.result.painAlertLevels.${result.pain_alert_level}`, result.pain_alert_level)} dark={dark} color={
            result.pain_alert_level === 'high' ? accent : result.pain_alert_level === 'moderate' ? '#F5A623' : '#4ade80'
          }/>
        )}
        {result.recovery_status && (
          <StatCell label={tr('checkin.result.statRecovery')} value={tr(`checkin.result.recoveryStatuses.${result.recovery_status}`, result.recovery_status)} dark={dark} color={
            result.recovery_status === 'stable' ? '#4ade80' : result.recovery_status === 'recovering' ? '#F5A623' : accent
          }/>
        )}
      </div>

      {/* Risk classification card */}
      {risk ? (
        <div style={{ marginBottom: 24 }}>
          <RiskCard risk={risk} dark={dark} primary={primary} />
        </div>
      ) : (
        <div style={{ flex: 1 }}/>
      )}

      {/* CTAs */}
      {freeBlocked ? (
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: `${accent}14`, border: `1.5px solid ${accent}55`, textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 4 }}>
            {tr('checkin.result.freeBlockedTitle')}
          </div>
          <div style={{ fontSize: 12, color: textSec(dark), lineHeight: 1.5 }}>
            {tr('checkin.result.freeBlockedBody')}
          </div>
        </div>
      ) : isTrainerContext ? (
        <button onClick={onDone} style={{ ...primaryBtn(isBlocked ? accent : primary) }}>
          {isBlocked ? tr('checkin.result.reviewSafetyAlert') : tr('checkin.result.buildPlan')}
        </button>
      ) : hasTrainer ? (
        requestState === 'pending' ? (
          // Active request — show countdown, block new request
          <div style={{
            padding: '14px 20px', borderRadius: 16, textAlign: 'center',
            background: `${primary}18`, border: `1.5px solid ${primary}44`,
            fontSize: 13, fontWeight: 600, color: primary, lineHeight: 1.6,
          }}>
            <div>{tr('checkin.result.trainerNotified')}</div>
            {minsLeft > 0 && (
              <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4, opacity: 0.8 }}>
                {tr('checkin.result.trainerNotifiedCountdown', { min: minsLeft })}
              </div>
            )}
          </div>
        ) : (
          // idle or expired — button available for new request
          <button
            onClick={() => {
              setRequestState('pending');
              setNotified(true);
              setMinsLeft(workoutReadyExpiryMin);
              onAlert();
            }}
            style={{ ...primaryBtn(isBlocked ? accent : primary) }}
          >
            {isBlocked ? tr('checkin.result.notifyTrainerCaution') : tr('checkin.result.notifyTrainerReady')}
          </button>
        )
      ) : (
        <button onClick={onDone} style={{ ...primaryBtn(isBlocked ? accent : primary) }}>
          {isBlocked ? tr('checkin.result.viewCautionOptions') : tr('checkin.result.startWorkout')}
        </button>
      )}

      {onBack && (
        <button onClick={onBack} style={{ ...outlineBtn(primary), marginTop: 10 }}>
          {tr('checkin.result.backButton')}
        </button>
      )}
    </div>
  );
}
