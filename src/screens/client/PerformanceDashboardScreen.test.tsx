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

const FITNESS_ADVANCED_CODES = [
  'fatigue_risk_score',
  'recovery_instability_score',
  'progression_readiness_score',
  'response_compatibility_score',
  'plateau_risk_score',
];

const PERFORMANCE_CODES = [
  'acute_load_score',
  'training_form_score',
  'training_strain_score',
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
    acuteLoad:             score('acute_load_score'),
    trainingForm:          score('training_form_score', 75),
    trainingStrain:        score('training_strain_score'),
  },
  trainingLoad: { atl: 12.5, ctl: 10.2, tsb: -2.3, monotonia: 1.4, strain: 17.5 },
  insights: [],
  milestones: [],
};

describe('TelaScores — plano de acesso por tier', () => {
  it('FREE: bloqueia 8 scores (5 fitness-advanced + 3 performance)', () => {
    const nav = vi.fn();
    const { container } = render(
      <TelaScores data={mockData} nav={nav}
        advancedAllowed={false}
        fitnessAdvancedAllowed={false}
        performanceAllowed={false}
      />
    );
    const locked = container.querySelectorAll('button');
    expect(locked.length).toBe(FITNESS_ADVANCED_CODES.length + PERFORMANCE_CODES.length); // 8
    expect(container.textContent).toContain('50'); // free scores visíveis
  });

  it('AI FITNESS: desbloqueia fitness-advanced, mantém performance bloqueado', () => {
    const nav = vi.fn();
    const { container } = render(
      <TelaScores data={mockData} nav={nav}
        advancedAllowed={true}
        fitnessAdvancedAllowed={true}
        performanceAllowed={false}
      />
    );
    const locked = container.querySelectorAll('button');
    expect(locked.length).toBe(PERFORMANCE_CODES.length); // 3
  });

  it('AI PERFORMANCE: nenhum score bloqueado', () => {
    const nav = vi.fn();
    const { container } = render(
      <TelaScores data={mockData} nav={nav}
        advancedAllowed={true}
        fitnessAdvancedAllowed={true}
        performanceAllowed={true}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('navega para plans ao clicar num score bloqueado', () => {
    const nav = vi.fn();
    const { container } = render(
      <TelaScores data={mockData} nav={nav}
        advancedAllowed={false}
        fitnessAdvancedAllowed={false}
        performanceAllowed={false}
      />
    );
    const lockedButtons = container.querySelectorAll('button');
    expect(lockedButtons.length).toBeGreaterThan(0);
    fireEvent.click(lockedButtons[0]!);
    expect(nav).toHaveBeenCalledWith('plans', { source: 'perf_scores' });
  });

  it('FREE_CODES visíveis independentemente do tier', () => {
    const nav = vi.fn();
    const { container } = render(
      <TelaScores data={mockData} nav={nav}
        advancedAllowed={false}
        fitnessAdvancedAllowed={false}
        performanceAllowed={false}
      />
    );
    FREE_CODES.forEach(() => {
      expect(container.textContent).toContain('50');
    });
  });
});
