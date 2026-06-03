import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle, primaryBtn, outlineBtn } from '../../theme';
import type { SafetyGateResult } from '../../types/checkin-v2';
import type { RiskClassification } from '../../types/profile-v2';
import { RiskCard } from '../../components/RiskCard';

interface CheckInResultProps {
  dark:              boolean;
  primary:           string;
  accent:            string;
  result:            SafetyGateResult;
  risk?:             RiskClassification;
  onDone:            () => void;
  onAlert:           () => void;
  onBack?:           () => void;
  isTrainerContext?: boolean;
  linkedTrainerId?:  string;
}

// ── Readiness gauge (SVG arc) ─────────────────────────────────────────────────

function ReadinessGauge({ score, color }: { score: number; color: string }) {
  const r    = 50;
  const cx   = 60;
  const cy   = 60;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;

  return (
    <svg width={120} height={120} viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff10" strokeWidth={10}/>
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
        fill="#ffffff55" fontSize={11}
        fontFamily='"Plus Jakarta Sans",sans-serif'>
        /100
      </text>
    </svg>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_META = {
  clear:   { color: '#4ade80', heading: 'Let\'s go!',         bg: '#4ade8012' },
  caution: { color: '#F5A623', heading: 'Today we\'ll go with caution.', bg: '#F5A62312' },
  blocked: { color: '#EF5B3C', heading: 'Today we\'ll go with caution.', bg: '#EF5B3C12' },
};

const PAIN_LABEL = { low: 'low',    moderate: 'moderate', high: 'high'   };
const REC_LABEL  = { stable: 'stable', recovering: 'recovering', at_risk: 'at_risk' };

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: '#ffffff08', border: '1px solid #ffffff12',
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#ffffff55', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color ?? '#fff' }}>
        {value}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CheckInResult({ dark, primary, accent, result, risk, onDone, onAlert, onBack, isTrainerContext, linkedTrainerId }: CheckInResultProps) {
  const meta         = STATUS_META[result.status];
  const isBlocked    = result.ai_led_blocked;
  const hasTrainer   = !!linkedTrainerId;  // client with an active trainer

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary }}>
          SCREEN 04 · READINESS REPORT · CONTEXTUAL
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
            onMouseEnter={e => { e.currentTarget.style.background = '#ffffff08'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            ← Back
          </button>
        )}
      </div>

      <h2 style={{
        margin: '0 0 24px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em',
      }}>
        {meta.heading}
      </h2>

      {/* Gauge */}
      <div style={{
        padding: '24px', borderRadius: 18, marginBottom: 16,
        background: meta.bg, border: `1.5px solid ${meta.color}33`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: meta.color, marginBottom: 16 }}>
          READINESS
        </div>
        <ReadinessGauge score={result.readiness_score} color={meta.color}/>
      </div>

      {/* Safety Gate card */}
      {isBlocked && (
        <div style={{
          padding: '14px 16px', borderRadius: 14, marginBottom: 12,
          background: `${accent}14`, border: `1.5px solid ${accent}55`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: accent, marginBottom: 4 }}>
            SAFETY_GATE = AI-led blocked
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: textSec(dark), lineHeight: 1.5 }}>
            You reported a sign that may affect your safety. Consider professional guidance.
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
            RECOMMENDED_ACTION
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: textSec(dark), lineHeight: 1.5 }}>
            {result.recommended_action}
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
        {result.session_completion_pct != null && (
          <StatCell label="SESSION_COMPLETION" value={`${result.session_completion_pct}%`}/>
        )}
        {result.passage_risk_pct != null && (
          <StatCell label="FATIGUE_RISK" value={`${result.passage_risk_pct}%`}/>
        )}
        {result.pain_alert_level && (
          <StatCell label="PAIN_ALERT" value={PAIN_LABEL[result.pain_alert_level]} color={
            result.pain_alert_level === 'high' ? accent : result.pain_alert_level === 'moderate' ? '#F5A623' : '#4ade80'
          }/>
        )}
        {result.recovery_status && (
          <StatCell label="RECOVERY" value={REC_LABEL[result.recovery_status]} color={
            result.recovery_status === 'stable' ? '#4ade80' : result.recovery_status === 'recovering' ? '#F5A623' : accent
          }/>
        )}
      </div>

      {/* Risk classification card — reuses RiskCard from profile wizard */}
      {risk ? (
        <div style={{ marginBottom: 24 }}>
          <RiskCard risk={risk} dark={dark} primary={primary} />
        </div>
      ) : (
        <div style={{ flex: 1 }}/>
      )}

      {/* CTAs — 3-way matrix */}
      {isTrainerContext ? (
        /* Trainer doing check-in for a client */
        <button onClick={onDone} style={{ ...primaryBtn(isBlocked ? accent : primary) }}>
          {isBlocked ? 'Review safety alert →' : 'Build plan →'}
        </button>
      ) : hasTrainer ? (
        /* Client WITH an active trainer — check-in is already saved and shared
           live with the trainer. "Done" just closes; notifying is OPTIONAL. */
        <>
          <button onClick={onDone} style={{ ...primaryBtn(isBlocked ? accent : primary), marginBottom: 10 }}>
            Done
          </button>
          <button onClick={onAlert} style={{ ...outlineBtn(isBlocked ? accent : primary) }}>
            {isBlocked ? '⚠ Notify trainer — caution today' : '✦ Notify trainer — I\'m ready'}
          </button>
        </>
      ) : (
        /* Client WITHOUT a trainer — full autonomy */
        <button onClick={onDone} style={{ ...primaryBtn(isBlocked ? accent : primary) }}>
          {isBlocked ? 'View caution options' : 'Start workout →'}
        </button>
      )}

      {onBack && (
        <button onClick={onBack} style={{ ...outlineBtn(primary), marginTop: 10 }}>
          ← Back
        </button>
      )}
    </div>
  );
}
