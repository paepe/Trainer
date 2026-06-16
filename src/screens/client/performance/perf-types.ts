export type ScoreBand = 'low' | 'moderate' | 'high' | 'critical';
export type InsightSeverity = 'positive' | 'warning' | 'critical' | 'info';
export type AudienceTone = 'cyan' | 'coral' | 'amber' | 'green' | 'lavender';

export interface PredictiveScore {
  score:       number;
  nameKey:     string;
  code:        string;
  descKey:     string;
  actionKey:   string;
  isGoodScore?: boolean;
}

export interface PerformanceInsight {
  id:                  string;
  severity:            InsightSeverity;
  titleKey:            string;
  dataKey:             string;
  dataParams?:         Record<string, unknown>;
  interpretationKey:   string;
  actionKey:           string;
}

export interface WeeklyStats {
  weekNum:  number;
  label:    string;
  volume:   number;
  rpe:      number;
  sessions: number;
}

export interface PainEventSummary {
  date:      string;
  region:    string;
  intensity: number;
  sessionId: string;
}

export interface SessionSummary {
  id:          string;
  date:        string;
  completed:   boolean;
  partial:     boolean;
  rpe:         number | null;
  durationMin: number | null;
  hasPain:     boolean;
}

export interface Milestone {
  id:              string;
  label:           string;
  icon:            string;
  target:          number;
  current:         number;
  unlocked:        boolean;
}

// ── Training Load model (ATL/CTL/TSB) ────────────────────────────────────────
// Classic periodisation model used by TrainingPeaks, Garmin, Strava.
// Calculated from RPE × volume (no external hardware required).
//
// ATL  — Acute Training Load   (7-day exp. weighted avg)  → fatigue proxy
// CTL  — Chronic Training Load (42-day exp. weighted avg) → fitness proxy
// TSB  — Training Stress Balance = CTL − ATL              → form/freshness
// Monotonia — load_avg / load_stddev over 7d              → variety indicator
// Strain     — ATL × Monotonia                            → accumulated stress
export interface TrainingLoad {
  atl:       number;   // 0–∞  (arbitrary load units: kg×reps per day, avg)
  ctl:       number;
  tsb:       number;   // positive = fresh, negative = fatigued
  monotonia: number;   // >2 = dangerously monotonous
  strain:    number;
}

export interface M5Data {
  weeksActive:        number;
  plannedSessions:    number;
  completedSessions:  number;
  partialSessions:    number;
  missedSessions:     number;
  adherenceRate:      number;
  workoutStreak:      number;
  checkinRate:        number;
  weekDays:           string[];
  weekStatus:         number[];
  weeklyStats:        WeeklyStats[];
  recentSessions:     SessionSummary[];
  painEvents14d:      PainEventSummary[];
  painRecurrenceCount: number;
  primaryPainRegion:  string | null;
  sleepAvg:           number;
  energyAvg:          number;
  trainingLoad:       TrainingLoad;
  scores: {
    churnRisk:             PredictiveScore;
    fatigueRisk:           PredictiveScore;
    painRecurrence:        PredictiveScore;
    progressionReadiness:  PredictiveScore;
    sessionCompletion:     PredictiveScore;
    planFit:               PredictiveScore;
    recoveryInstability:   PredictiveScore;
    responseCompatibility: PredictiveScore;
    plateauRisk:           PredictiveScore;
    // Training Load scores (ai_performance gate)
    acuteLoad:             PredictiveScore;
    trainingForm:          PredictiveScore;
    trainingStrain:        PredictiveScore;
  };
  insights:   PerformanceInsight[];
  milestones: Milestone[];
}
