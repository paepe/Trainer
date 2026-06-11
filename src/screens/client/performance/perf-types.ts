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
  };
  insights:   PerformanceInsight[];
  milestones: Milestone[];
}
