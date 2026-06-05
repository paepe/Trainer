import React from 'react';
import i18n from '../../../i18n';
import { supabase } from '../../../supabase';
import type {
  M5Data, PredictiveScore, PerformanceInsight,
  WeeklyStats, SessionSummary, PainEventSummary, Milestone,
} from './perf-types';

// ── Region normalization — maps legacy / display-string DB values to canonical keys ──
const REGION_NORMALIZE: Record<string, string> = {
  // legacy display strings (WorkoutModeScreen pre-standardization)
  'lower back': 'lower_back', 'upper back': 'upper_back',
  'neck':       'neck',       'shoulder':   'shoulder',
  'elbow':      'elbow',      'wrist':      'wrist',
  'hip':        'hip',        'knee':       'knee',
  'ankle':      'ankle',      'other':      'other',
  // legacy PainRegion values pre-standardization
  'cervical':   'neck',       'lumbar':     'lower_back',
};
function normalizeRegion(r: string): string {
  return REGION_NORMALIZE[r.toLowerCase()] ?? r.toLowerCase();
}

// ── Colour helpers ────────────────────────────────────────────────────────────
// `cyan`/`cyanDeep` are the profile SIGNATURE slots: they resolve to cyan for a
// client and coral for a trainer via runtimeProfile (set in App.tsx). The hex
// concatenation pattern (`${C.cyan}22`) keeps working because getters return hex.
import { vizSignature, vizSignatureDeep } from '../../../theme/runtimeProfile';

export const C = {
  get cyan()     { return vizSignature(); },     // profile signature: cyan (client) / coral (trainer)
  get cyanDeep() { return vizSignatureDeep(); },
  coral:    '#EF5B3C',
  amber:    '#F5B45A',
  green:    '#4ADE80',
  lavender: '#A78BFA',
};

export function band(score: number): string {
  if (score >= 75) return 'low';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'high';
  return 'critical';
}

export function bandColor(b: string): string {
  switch (b) {
    case 'low':      return C.green;
    case 'moderate': return C.amber;
    case 'high':     return C.coral;
    default:         return '#FF4D4D';
  }
}

export function scoreColor(score: number): string {
  return bandColor(band(score));
}

export function goodScoreColor(score: number): string {
  if (score >= 75) return C.green;
  if (score >= 50) return C.amber;
  return C.coral;
}

// ── Date utilities ────────────────────────────────────────────────────────────

function startOfWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday start
  return d.toISOString().slice(0, 10);
}

function daysSince(isoStr: string): number {
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000);
}

// ── 9 Predictive score functions (RF-5.8) ────────────────────────────────────

function computeChurnRisk(
  adherenceRate: number,
  checkinDropRate: number,
  missedSessions: number,
): PredictiveScore {
  let score = 15;
  if (adherenceRate < 0.60) score += 35;
  else if (adherenceRate < 0.70) score += 15;
  if (checkinDropRate > 0.40) score += 25;
  if (missedSessions >= 3) score += 10;
  return {
    score: Math.min(score, 100),
    name: 'Churn Risk',
    code: 'churn_risk_score',
    desc: 'Risk of dropout based on adherence and engagement.',
    action: adherenceRate < 0.60 ? 'Contact student — review availability' : 'Monitor trend',
  };
}

function computeFatigueRisk(rpeDelta: number, sleepAvg: number): PredictiveScore {
  let score = 20;
  score += Math.min(rpeDelta * 15, 50);
  if (sleepAvg < 6) score += 18;
  else if (sleepAvg < 7) score += 10;
  return {
    score: Math.min(score, 100),
    name: 'Fatigue Risk',
    code: 'fatigue_risk_score',
    desc: 'Systemic fatigue buildup based on RPE and sleep.',
    action: score >= 70 ? 'Consider deload next week' : 'Maintain current volume',
  };
}

function computePainRecurrence(painCount14d: number): PredictiveScore {
  return {
    score: Math.min(10 + painCount14d * 22, 100),
    name: 'Pain Recurrence',
    code: 'pain_recurrence_score',
    desc: 'Frequency of recurring pain in the same region over 14 days.',
    action: painCount14d >= 3 ? 'Activate Pain Recurrence Engine — replace exercise' : 'Monitor region',
  };
}

function computeProgressionReadiness(
  adherenceRate: number,
  rpeAvg: number,
  painCount: number,
): PredictiveScore {
  let score = 15;
  score += adherenceRate >= 0.85 ? 35 : 15;
  score += rpeAvg > 0 && rpeAvg <= 7.5 ? 25 : 5;
  score += painCount === 0 ? 25 : 5;
  return {
    score: Math.min(score, 100),
    name: 'Progression Readiness',
    code: 'progression_readiness_score',
    desc: 'Readiness to increase load or volume safely.',
    action: score >= 75 ? 'Safe progression available' : 'Maintain current load',
    isGoodScore: true,
  };
}

function computeSessionCompletion(
  completed: number,
  partial: number,
  planned: number,
): PredictiveScore {
  if (planned === 0) {
    return {
      score: 80, name: 'Session Completion', code: 'session_completion_score',
      desc: 'Completion rate of planned sessions.', action: 'Await data',
      isGoodScore: true,
    };
  }
  const partialRate = partial / planned;
  const score = Math.max(0, Math.min(100, (completed + partial * 0.5) / planned * 90 - partialRate * 30));
  return {
    score,
    name: 'Session Completion',
    code: 'session_completion_score',
    desc: 'Actual completion rate of scheduled sessions.',
    action: score < 60 ? 'Review plan volume' : 'Maintain consistency',
    isGoodScore: true,
  };
}

function computePlanFit(partial: number, planned: number): PredictiveScore {
  if (planned === 0) {
    return {
      score: 85, name: 'Plan Fit', code: 'plan_fit_score',
      desc: 'Plan suitability to student reality.', action: 'Await data',
      isGoodScore: true,
    };
  }
  const partialRate = partial / planned;
  const score = Math.max(0, Math.min(100, 85 - partialRate * 80));
  return {
    score,
    name: 'Plan Fit',
    code: 'plan_fit_score',
    desc: 'Compatibility between prescribed plan and actual execution.',
    action: partialRate > 0.30 ? 'Replan: volume incompatible with routine' : 'Plan well adjusted',
    isGoodScore: true,
  };
}

function computeRecoveryInstability(
  sleepAvg: number,
  rpeAvg: number,
  painLightRecurrent: boolean,
): PredictiveScore {
  let score = 0;
  if (sleepAvg < 6) score += 35;
  else if (sleepAvg < 7) score += 20;
  else score += 5;
  score += rpeAvg > 8 ? 20 : 5;
  if (painLightRecurrent) score += 15;
  return {
    score: Math.min(score, 100),
    name: 'Recovery Instability',
    code: 'recovery_instability_score',
    desc: 'Instability in recovery signals (sleep, RPE, mild pain).',
    action: score >= 50 ? 'Investigate sleep quality and stress' : 'Recovery stable',
  };
}

function computeResponseCompatibility(loadDeltaPct: number, volDeltaPct: number): PredictiveScore {
  const score = Math.max(0, Math.min(100, 60 + loadDeltaPct * 60 + volDeltaPct * 40));
  return {
    score,
    name: 'Response Compatibility',
    code: 'response_compatibility_score',
    desc: 'Compatibility between stimulus and student response.',
    action: score < 50 ? 'Adjust progression — response below expected' : 'Compatible progression',
    isGoodScore: true,
  };
}

function computePlateauRisk(loadChange3w: number): PredictiveScore {
  const score = loadChange3w < 0.03 ? 60 : loadChange3w < 0.06 ? 35 : 15;
  return {
    score,
    name: 'Plateau Risk',
    code: 'plateau_risk_score',
    desc: 'Risk of stagnation based on load variation (3 weeks).',
    action: score >= 60 ? 'Vary stimulus: technique, volume or frequency' : 'Progression in progress',
  };
}

// ── Insight generation (RF-5.10) ──────────────────────────────────────────────

function generateInsights(params: {
  adherenceRate:    number;
  rpeDelta:         number;
  painCount14d:     number;
  progressionScore: number;
  planFitScore:     number;
}): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  if (params.progressionScore >= 75) {
    insights.push({
      id: 'pi-1', severity: 'positive',
      title: 'Ready to progress',
      data: `Adherence ${Math.round(params.adherenceRate * 100)}% · Stable RPE · No recurring pain`,
      interpretation: 'All indicators point to load readiness.',
      action: 'Increase load 5–10% in next cycle',
    });
  }

  if (params.rpeDelta > 0.8) {
    insights.push({
      id: 'pi-2', severity: 'warning',
      title: 'Rising fatigue',
      data: `RPE rose ${params.rpeDelta.toFixed(1)} pts in recent weeks`,
      interpretation: 'Increasing perceived effort may indicate fatigue buildup.',
      action: 'Monitor for 2 sessions before applying deload',
    });
  }

  if (params.painCount14d >= 3) {
    insights.push({
      id: 'pi-3', severity: 'critical',
      title: 'Pain Recurrence Engine activated',
      data: `${params.painCount14d} pain occurrences in 14 days`,
      interpretation: 'Recurring pain in the same region indicates structural risk.',
      action: 'Replace exercise and notify trainer',
    });
  }

  if (params.planFitScore < 50) {
    insights.push({
      id: 'pi-4', severity: 'warning',
      title: 'Plan incompatible with routine',
      data: `Plan Fit: ${Math.round(params.planFitScore)}%`,
      interpretation: 'High rate of partial sessions indicates plan overload.',
      action: 'Request plan review from trainer',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'pi-0', severity: 'info',
      title: 'Data being built',
      data: 'History still insufficient for predictive analysis',
      interpretation: 'Complete more sessions to activate indicators.',
      action: 'Continue training regularly',
    });
  }

  return insights.slice(0, 4);
}

// ── Milestone builder ─────────────────────────────────────────────────────────

function buildMilestones(totalCompleted: number, streak: number): Milestone[] {
  return [
    { id: 'ms-1', label: '1st session completed',   icon: 'play',    target: 1,  current: totalCompleted, unlocked: totalCompleted >= 1  },
    { id: 'ms-2', label: '10 complete sessions',   icon: 'trophy',  target: 10, current: totalCompleted, unlocked: totalCompleted >= 10 },
    { id: 'ms-3', label: '1 month of consistency',  icon: 'cal',     target: 12, current: totalCompleted, unlocked: totalCompleted >= 12 },
    { id: 'ms-4', label: '7-day streak',    icon: 'flame',   target: 7,  current: streak,         unlocked: streak >= 7          },
    { id: 'ms-5', label: '25 complete sessions',   icon: 'bolt',    target: 25, current: totalCompleted, unlocked: totalCompleted >= 25 },
  ];
}

// ── Main data hook ────────────────────────────────────────────────────────────

export function useM5Data(userId: string | null) {
  const [data,    setData]    = React.useState<M5Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error,   setError]   = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const staleRef = React.useRef<M5Data | null>(null);

  const reload = React.useCallback(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    fetchM5Data(userId)
      .then(d  => { staleRef.current = d; setData(d); setLastUpdated(new Date()); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [userId]);

  React.useEffect(() => { reload(); }, [reload]);

  return { data: data ?? staleRef.current, loading, error, lastUpdated, reload };
}

// ── Data fetching ─────────────────────────────────────────────────────────────

interface RawSession {
  id:                 string;
  status:             string;
  started_at:         string;
  completed_at:       string | null;
  total_duration_min: number | null;
}

interface RawSetLog {
  session_id: string;
  rpe:        number | null;
  load_kg:    number | null;
  reps_done:  number | null;
  completed_at: string;
}

interface RawPainEvent {
  session_id:  string;
  body_region: string;
  intensity:   number;
  reported_at: string;
}

interface RawCheckin {
  energy_level:  number | null;
  sleep_quality: string | null;
  detailed_data: { sleep_hours?: number } | null;
}

async function fetchM5Data(userId: string): Promise<M5Data> {
  const since6w  = new Date(Date.now() - 42 * 86_400_000).toISOString();
  const since14d = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const [sessionsRes, checkinRes] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, status, started_at, completed_at, total_duration_min')
      .eq('user_id', userId)
      .gte('started_at', since6w)
      .order('started_at'),
    supabase
      .from('checkin_prontidao')
      .select('energy_level, sleep_quality, detailed_data')
      .eq('user_id', userId)
      .gte('occurred_at', since14d),
  ]);

  const sessions  = (sessionsRes.data as RawSession[])  || [];
  const checkins  = (checkinRes.data  as RawCheckin[]) || [];
  const sessionIds = sessions.map(s => s.id);

  let setLogs:    RawSetLog[]    = [];
  let painEvents: RawPainEvent[] = [];

  if (sessionIds.length > 0) {
    const [logsRes, painRes] = await Promise.all([
      supabase
        .from('workout_set_logs')
        .select('session_id, rpe, load_kg, reps_done, completed_at')
        .in('session_id', sessionIds),
      supabase
        .from('workout_pain_events')
        .select('session_id, body_region, intensity, reported_at')
        .in('session_id', sessionIds),
    ]);
    setLogs    = (logsRes.data as RawSetLog[])    || [];
    painEvents = (painRes.data as RawPainEvent[]) || [];
  }

  // ── Adherence ─────────────────────────────────────────────────────────────
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const partialSessions   = sessions.filter(
    s => s.status !== 'completed' && s.status !== 'abandoned' && s.completed_at !== null,
  ).length;
  const missedSessions    = sessions.filter(s => s.status === 'abandoned').length;
  const plannedSessions   = sessions.length;
  const adherenceRate     = plannedSessions > 0
    ? (completedSessions + partialSessions * 0.5) / plannedSessions
    : 0;

  // Streak: consecutive days with a completed session ending today
  const completedDates = new Set(
    sessions.filter(s => s.status === 'completed').map(s => new Date(s.started_at).toDateString()),
  );
  let workoutStreak = 0;
  for (let i = 0; i < 60; i++) {
    if (completedDates.has(new Date(Date.now() - i * 86_400_000).toDateString())) {
      workoutStreak++;
    } else if (i > 0) {
      break;
    }
  }

  // Week strip (last 7 Mon→Sun)
  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const today    = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const weekStatus = weekDays.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - mondayOffset + i);
    const ds = d.toDateString();
    const daySessions = sessions.filter(s => new Date(s.started_at).toDateString() === ds);
    if (daySessions.length === 0) return 0;
    return daySessions.some(s => s.status === 'completed') ? 1 : 0.5;
  });

  // ── Weekly stats (6 buckets) ──────────────────────────────────────────────
  const weekKeys: string[] = [];
  const weekMap: Record<string, WeeklyStats> = {};
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(Date.now() - i * 7 * 86_400_000);
    const key = startOfWeek(d);
    const lbl = `W${6 - i}`;
    weekMap[key] = { label: lbl, volume: 0, rpe: 0, sessions: 0 };
    weekKeys.push(key);
  }

  const rpeAccum: Record<string, number[]> = {};
  for (const log of setLogs) {
    const wk = startOfWeek(new Date(log.completed_at));
    if (!weekMap[wk]) continue;
    if (log.load_kg && log.reps_done) weekMap[wk].volume += log.load_kg * log.reps_done;
    if (log.rpe) {
      rpeAccum[wk] = rpeAccum[wk] || [];
      rpeAccum[wk].push(log.rpe);
    }
  }
  for (const s of sessions) {
    const wk = startOfWeek(new Date(s.started_at));
    if (weekMap[wk] && s.status === 'completed') weekMap[wk].sessions++;
  }
  for (const wk of weekKeys) {
    const arr = rpeAccum[wk] || [];
    const entry = weekMap[wk];
    if (entry) entry.rpe = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }
  const weeklyStats: WeeklyStats[] = weekKeys.map(k => weekMap[k]).filter((w): w is WeeklyStats => w !== undefined);

  // ── RPE trend ─────────────────────────────────────────────────────────────
  const rpeTrend = weeklyStats.map(w => w.rpe).filter(r => r > 0);
  const rpeDelta = rpeTrend.length >= 2 ? (rpeTrend[rpeTrend.length - 1] ?? 0) - (rpeTrend[0] ?? 0) : 0;
  const rpeAvg   = rpeTrend.length > 0  ? rpeTrend.reduce((a, b) => a + b) / rpeTrend.length : 0;

  // ── Load change (plateau detection) ──────────────────────────────────────
  const earlyLoads  = setLogs.filter(l => daysSince(l.completed_at) >= 21 && l.load_kg).map(l => l.load_kg!);
  const recentLoads = setLogs.filter(l => daysSince(l.completed_at) <  21 && l.load_kg).map(l => l.load_kg!);
  const avgEarly    = earlyLoads.length  > 0 ? earlyLoads.reduce((a, b)  => a + b) / earlyLoads.length  : 0;
  const avgRecent   = recentLoads.length > 0 ? recentLoads.reduce((a, b) => a + b) / recentLoads.length : 0;
  const loadChange3w = avgEarly > 0 ? Math.abs(avgRecent - avgEarly) / avgEarly : 0.05;

  const weekVols   = weeklyStats.map(w => w.volume);
  const earlyVol   = weekVols.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const recentVol  = weekVols.slice(3).reduce((a, b)  => a + b, 0) / 3;
  const volDeltaPct = earlyVol > 0 ? (recentVol - earlyVol) / earlyVol : 0;

  // ── Sleep / energy ────────────────────────────────────────────────────────
  const sleepMap: Record<string, number> = { poor: 5.5, fair: 6.5, good: 7.5, excellent: 8.5 };
  const sleepVals = checkins.map(c => {
    const actualHours = c.detailed_data?.sleep_hours;
    return actualHours ?? sleepMap[c.sleep_quality ?? 'fair'] ?? 6.5;
  });
  const sleepAvg  = sleepVals.length > 0 ? sleepVals.reduce((a, b) => a + b) / sleepVals.length : 7;
  const energyAvg = checkins.length > 0
    ? checkins.reduce((a, c) => a + (c.energy_level ?? 7), 0) / checkins.length
    : 7;
  const checkinRate = plannedSessions > 0 ? Math.min(checkins.length / plannedSessions, 1) : 0;

  // ── Pain (14d) ────────────────────────────────────────────────────────────
  const pain14dRaw = painEvents.filter(e => daysSince(e.reported_at) <= 14);
  const painEvents14d: PainEventSummary[] = pain14dRaw.map(e => ({
      date:      `${daysSince(e.reported_at)}d ago`,
    region:    e.body_region,
    intensity: e.intensity,
    exercise:  null,
    sessionId: e.session_id,
  }));

  const regionCounts: Record<string, number> = {};
  for (const e of pain14dRaw) {
    const key = normalizeRegion(e.body_region);
    regionCounts[key] = (regionCounts[key] || 0) + 1;
  }
  const primaryPainRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const painRecurrenceCount = primaryPainRegion ? (regionCounts[primaryPainRegion] ?? 0) : 0;

  // ── Recent sessions ───────────────────────────────────────────────────────
  const recentSessions: SessionSummary[] = sessions.slice(-7).reverse().map(s => {
    const sLogs = setLogs.filter(l => l.session_id === s.id);
    const rpeArr = sLogs.filter(l => l.rpe != null).map(l => l.rpe!);
    const avgRpe = rpeArr.length > 0 ? rpeArr.reduce((a, b) => a + b) / rpeArr.length : null;
    return {
      id:          s.id,
      date:        new Date(s.started_at).toLocaleDateString(i18n.language || 'en-US', { day: '2-digit', month: '2-digit' }),
      completed:   s.status === 'completed',
      partial:     s.status !== 'completed' && s.status !== 'abandoned' && s.completed_at !== null,
      rpe:         avgRpe !== null ? Math.round(avgRpe * 10) / 10 : null,
      durationMin: s.total_duration_min,
      hasPain:     painEvents.some(p => p.session_id === s.id),
    };
  });

  // ── Scores ────────────────────────────────────────────────────────────────
  const painLightRecurrent =
    painRecurrenceCount >= 2 &&
    pain14dRaw.some(e => e.intensity <= 4);

  const scores = {
    churnRisk:             computeChurnRisk(adherenceRate, 0, missedSessions),
    fatigueRisk:           computeFatigueRisk(rpeDelta, sleepAvg),
    painRecurrence:        computePainRecurrence(painRecurrenceCount),
    progressionReadiness:  computeProgressionReadiness(adherenceRate, rpeAvg, painRecurrenceCount),
    sessionCompletion:     computeSessionCompletion(completedSessions, partialSessions, plannedSessions),
    planFit:               computePlanFit(partialSessions, plannedSessions),
    recoveryInstability:   computeRecoveryInstability(sleepAvg, rpeAvg, painLightRecurrent),
    responseCompatibility: computeResponseCompatibility(loadChange3w, volDeltaPct),
    plateauRisk:           computePlateauRisk(loadChange3w),
  };

  const insights = generateInsights({
    adherenceRate,
    rpeDelta,
    painCount14d:     painRecurrenceCount,
    progressionScore: scores.progressionReadiness.score,
    planFitScore:     scores.planFit.score,
  });

  return {
    weeksActive:        6,
    plannedSessions,
    completedSessions,
    partialSessions,
    missedSessions,
    adherenceRate,
    workoutStreak,
    checkinRate,
    weekDays,
    weekStatus,
    weeklyStats,
    recentSessions,
    painEvents14d,
    painRecurrenceCount,
    primaryPainRegion,
    sleepAvg,
    energyAvg,
    scores,
    insights,
    milestones: buildMilestones(completedSessions, workoutStreak),
  };
}
