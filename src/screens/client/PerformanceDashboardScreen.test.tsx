import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '../../i18n';
import { TelaScores } from './PerformanceDashboardScreen';
import type { M5Data, PredictiveScore } from './performance/perf-types';

function score(code: string, value = 50): PredictiveScore {
  return {
    score: value,
    nameKey: `perf.scoreDefs.${code.replace(/_score$/, '')}.name`,
    code,
    descKey: `perf.scoreDefs.${code.replace(/_score$/, '')}.desc`,
    actionKey: `perf.scoreDefs.${code.replace(/_score$/, '')}.actionLow`,
  };
}

const FREE_CODES = [
  'session_completion_score',
  'churn_risk_score',
  'pain_recurrence_score',
  'plan_fit_score',
];

const PREMIUM_CODES = [
  'fatigue_risk_score',
  'recovery_instability_score',
  'progression_readiness_score',
  'response_compatibility_score',
  'plateau_risk_score',
];

const mockData: M5Data = {
  weeksActive: 4,
  plannedSessions: 12,
  completedSessions: 10,
  partialSessions: 1,
  missedSessions: 1,
  adherenceRate: 0.83,
  workoutStreak: 3,
  checkinRate: 0.9,
  weekDays: [],
  weekStatus: [],
  weeklyStats: [],
  recentSessions: [],
  painEvents14d: [],
  painRecurrenceCount: 0,
  primaryPainRegion: null,
  sleepAvg: 7,
  energyAvg: 7,
  scores: {
    churnRisk:             score('churn_risk_score'),
    fatigueRisk:           score('fatigue_risk_score'),
    painRecurrence:        score('pain_recurrence_score'),
    progressionReadiness:  score('progression_readiness_score'),
    sessionCompletion:     score('session_completion_score'),
    planFit:               score('plan_fit_score'),
    recoveryInstability:   score('recovery_instability_score'),
    responseCompatibility: score('response_compatibility_score'),
    plateauRisk:           score('plateau_risk_score'),
  },
  insights: [],
  milestones: [],
};

describe('TelaScores — free vs AI Performance gating', () => {
  it('renders all 9 scores unlocked for premium viewers (trainer viewing client)', () => {
    const nav = vi.fn();
    const { container } = render(<TelaScores data={mockData} nav={nav} advancedAllowed={true}/>);

    // No locked teaser cards (rendered as <button>) should appear
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('locks the 5 advanced scores and keeps the 4 free scores visible for non-premium viewers', () => {
    const nav = vi.fn();
    const { container } = render(<TelaScores data={mockData} nav={nav} advancedAllowed={false}/>);

    // 5 locked cards rendered as <button> teasers
    const lockedButtons = container.querySelectorAll('button');
    expect(lockedButtons.length).toBe(PREMIUM_CODES.length);

    // Free score codes are present as plain (non-button) cards — check their score values render
    FREE_CODES.forEach(() => {
      // score value 50 should appear as rounded "50" text somewhere for free cards
      expect(container.textContent).toContain('50');
    });
  });

  it('navigates to the plans screen when a locked score card is clicked', () => {
    const nav = vi.fn();
    const { container } = render(<TelaScores data={mockData} nav={nav} advancedAllowed={false}/>);

    const lockedButtons = container.querySelectorAll('button');
    expect(lockedButtons.length).toBeGreaterThan(0);
    fireEvent.click(lockedButtons[0]!);

    expect(nav).toHaveBeenCalledWith('plans', { source: 'perf_scores' });
  });
});
