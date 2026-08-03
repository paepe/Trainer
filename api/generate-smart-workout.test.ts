// Session-structure contract on the client generation path (Phase 2).
//
// Before this phase the trainer's declared block order reached the model only as
// one descriptive line inside the Coach DNA dump, with nothing instructing the
// model to follow it. These tests assert the binding instruction itself, because
// that is where the contract lives — a live generation can happen to come back in
// the right order while the prompt says nothing about order at all.

import { describe, it, expect } from 'vitest';
import { buildPrompt } from './generate-smart-workout';
import { DEFAULT_AI_TRAINER } from '../src/ai/buildAIContext';
import { DEFAULT_SESSION_ORDER, SESSION_BLOCKS } from '../src/lib/sessionStructure';

// buildPrompt takes the full AIContext. The interfaces are inlined in the
// handler (self-contained api/* rule) and therefore not importable, so the
// fixture is built loosely and cast once, here.
type Ctx = Parameters<typeof buildPrompt>[0];

function contextWith(
  sessionOrder: string[],
  trainerId = 'trainer-1',
  taskOverrides: Record<string, unknown> = {},
  todayOverrides: Record<string, unknown> = {},
  trainerOverrides: Record<string, unknown> = {},
): Ctx {
  return {
    trainer: {
      id: trainerId, name: 'Kamil', archetype: 'performance',
      coachingStyles: ['functional'], coreValues: ['safety'],
      coachVoice: '', motto: '', methods: [], environments: [],
      intensity: 'moderate',
      focus: { strength: 5, endurance: 5, mobility: 5, athletic: 4, coord: 3, balance: 3 },
      preferredFormats: [], intensityCurve: 'pyramid',
      sessionOrder,
      communicationTone: [], clientProfiles: [],
      favoriteExercises: [], avoidExercises: [],
      ...trainerOverrides,
    },
    client: {
      id: 'client-1', name: 'Ana', primaryGoal: 'hypertrophy', secondaryGoals: [],
      fitnessLevel: 'intermediate', daysPerWeek: 3, sessionDuration: 45,
      preferredTime: 'morning', modalities: [], hasHealthCondition: false,
      healthCategories: [], comorbidities: [], mobilityLevel: 'good',
      balanceLevel: 'good', effortTolerance: 'moderate', baselinePainLevel: 'none',
      locations: ['gym'], equipment: ['dumbbells'], preferenceIntensity: 'moderate',
      explanationLevel: 'standard', trainingFocus: 'strength',
      riskLevel: 'low', riskFlags: [],
    },
    today: {
      checkinAt: new Date().toISOString(), variant: 'quick', readinessScore: 70,
      energyLevel: 4, sleepQuality: 'good', fatigueLevel: 2, painPresent: false,
      painIntensity: 0, painRegions: [], safetyStatus: 'clear', aiLedBlocked: false,
      safetySignals: [], availableMinutes: 45, location: 'gym',
      ...todayOverrides,
    },
    stats: {
      adherenceRate: 0.8, workoutStreak: 2, sessionsLast30d: 10,
      avgEnergy7d: 4, avgReadiness7d: 70, avgRPELast3: 7,
      painEvents14d: 0, painRecurrenceAlert: false,
      predictiveScores: {
        progressionReadiness: 60, fatigueRisk: 20,
        painRecurrence: 10, sessionCompletion: 70, planFit: 70,
      },
    },
    library: {
      excludedRegions: [], favoriteExercises: [], avoidExercises: [],
      equipmentAvailable: ['dumbbells'],
    },
    task: { type: 'generate_workout', durationMin: 45, ...taskOverrides },
    locale: 'en',
    contextVersion: '1.0',
    builtAt: new Date().toISOString(),
  } as unknown as Ctx;
}

/** The declared sequence as the prompt states it, e.g. "warmup → strength". */
function declaredSequence(user: string): string | null {
  const line = user.split('\n').find(l => l.includes('to be followed in this order:'));
  return line ? (line.split('to be followed in this order:')[1] ?? '').replace(/\.$/, '').trim() : null;
}

describe('generate-smart-workout — session structure is binding', () => {
  it('states the trainer declared order as an instruction to follow, not as trivia', () => {
    const { user } = buildPrompt(contextWith(['mobility', 'warmup', 'technique', 'strength', 'conditioning', 'cooldown']));

    expect(user).toContain('## SESSION STRUCTURE');
    expect(declaredSequence(user)).toBe('mobility → warmup → technique → strength → conditioning → cooldown');
    expect(user).toMatch(/must appear as a phase with at least one exercise, in that order/);
  });

  it('carries a non-default trainer order through verbatim', () => {
    // Kamil's case: technique declared, and before strength.
    const { user } = buildPrompt(contextWith(['warmup', 'technique', 'strength', 'cooldown']));
    expect(declaredSequence(user)).toBe('warmup → technique → strength → cooldown');
    expect(user).toContain('Every one of those 4 blocks');
  });

  it('falls back to the agreed default order when the trainer declared none', () => {
    const { user } = buildPrompt(contextWith([]));
    expect(declaredSequence(user)).toBe(DEFAULT_SESSION_ORDER.join(' → '));
  });

  it('drops unknown blocks instead of passing them to the model', () => {
    const { user } = buildPrompt(contextWith(['warmup', 'plyometrics', 'strength', 'cooldown']));
    expect(declaredSequence(user)).toBe('warmup → strength → cooldown');
    expect(user).not.toContain('plyometrics');
  });

  it('gives the autonomous client the default order, with no trainer attribution', () => {
    const { user } = buildPrompt(contextWith(DEFAULT_AI_TRAINER.sessionOrder as string[], 'ai-coach'));

    expect(user).not.toContain('## TRAINER PROFILE');
    expect(declaredSequence(user)).toBe(DEFAULT_SESSION_ORDER.join(' → '));
    expect(user).not.toContain("This trainer's declared block sequence");
  });

  it('never contradicts itself: the descriptive Coach DNA line matches the binding one', () => {
    const { user } = buildPrompt(contextWith(['warmup', 'plyometrics', 'strength', 'cooldown']));
    const descriptive = user.split('\n').find(l => l.startsWith('Session order:'));
    expect(descriptive).toBe(`Session order: ${declaredSequence(user)}`);
  });

  it('teaches the block vocabulary in the system prompt', () => {
    const { system } = buildPrompt(contextWith(['warmup', 'strength', 'cooldown']));
    expect(system).toContain('SESSION STRUCTURE');
    for (const block of SESSION_BLOCKS) expect(system).toContain(block);
  });
});

// ai.checkin_adjustment (docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md Fase 0):
// gates daily calibration by energy/sleep/fatigue only. Must never gate a
// safety signal — pain and Safety Gate reach the prompt for every tier.
describe('generate-smart-workout — checkin-adjustment gate never touches safety', () => {
  it('includes daily calibration by default (adjustmentAllowed unset)', () => {
    const { user } = buildPrompt(contextWith(['warmup', 'strength', 'cooldown']));
    expect(user).toContain('Energy: 4/10');
    expect(user).toContain('Sleep quality: good');
    expect(user).toContain('Fatigue: 2/10');
  });

  it('omits daily calibration when adjustmentAllowed is false, without inventing safe values', () => {
    const { user } = buildPrompt(contextWith(['warmup', 'strength', 'cooldown'], 'trainer-1', { adjustmentAllowed: false }));
    expect(user).not.toContain('Energy: 4/10');
    expect(user).not.toContain('Sleep quality: good');
    expect(user).not.toContain('Fatigue: 2/10');
    expect(user).toContain('Daily calibration: not available on this plan');
  });

  it('still reports pain and Safety Gate when adjustmentAllowed is false', () => {
    const { user } = buildPrompt(
      contextWith(['warmup', 'strength', 'cooldown'], 'trainer-1', { adjustmentAllowed: false }, {
        painPresent: true, painIntensity: 6, painRegions: ['knee'], safetyStatus: 'flagged',
      }),
    );
    expect(user).toContain('Pain present: yes — intensity 6/10, regions: knee');
    expect(user).toContain('Safety gate: flagged');
  });

  it('reports pain and Safety Gate identically whether or not adjustment is allowed', () => {
    const todayOverrides = { painPresent: true, painIntensity: 6, painRegions: ['knee'], safetyStatus: 'flagged' };
    const withAdjustment    = buildPrompt(contextWith(['warmup', 'strength', 'cooldown'], 'trainer-1', { adjustmentAllowed: true },  todayOverrides)).user;
    const withoutAdjustment = buildPrompt(contextWith(['warmup', 'strength', 'cooldown'], 'trainer-1', { adjustmentAllowed: false }, todayOverrides)).user;
    const safetyLine = (u: string) => u.split('\n').filter(l => l.startsWith('Pain present:') || l.startsWith('Safety gate:')).join('\n');
    expect(safetyLine(withAdjustment)).toBe(safetyLine(withoutAdjustment));
  });
});

// docs/LICENSE_EXERCISE_TYPE_ENFORCEMENT_PLAN.md Fase 0: fitnessOnly and the
// trainer's favourite exercises used to enter the prompt as two directives of
// equal weight, with nothing arbitrating a conflict between them. This
// declares the plan limit's precedence explicitly, without removing any
// favourite from the prompt (a favourite that IS fitness — e.g. Back Squat —
// should still reach the model).
describe('generate-smart-workout — fitnessOnly precedence over trainer favourites (Fase 0)', () => {
  it('marks favourites as a subordinate preference and states precedence when fitnessOnly is true', () => {
    const { user } = buildPrompt(contextWith(
      ['warmup', 'strength', 'cooldown'], 'trainer-1', { fitnessOnly: true }, {},
      { favoriteExercises: ['Back Squat', 'Box Jump'] },
    ));
    expect(user).toContain('Trainer favourite exercises (secondary preference — the PLAN LIMIT below overrides any of these it conflicts with): Back Squat, Box Jump');
    expect(user).toMatch(/PLAN LIMIT — fitness exercises only.*This limit takes precedence over the trainer's favourite exercises/s);
  });

  it('never removes a favourite from the prompt, even under fitnessOnly', () => {
    const { user } = buildPrompt(contextWith(
      ['warmup', 'strength', 'cooldown'], 'trainer-1', { fitnessOnly: true }, {},
      { favoriteExercises: ['Back Squat', 'Box Jump', 'Sprint Intervals'] },
    ));
    expect(user).toContain('Back Squat');
    expect(user).toContain('Box Jump');
    expect(user).toContain('Sprint Intervals');
  });

  it('uses the plain label and no precedence clause when fitnessOnly is false/unset', () => {
    const { user } = buildPrompt(contextWith(
      ['warmup', 'strength', 'cooldown'], 'trainer-1', {}, {},
      { favoriteExercises: ['Back Squat', 'Box Jump'] },
    ));
    expect(user).toContain('Trainer favourite exercises: Back Squat, Box Jump');
    expect(user).not.toContain('secondary preference');
    expect(user).not.toContain('PLAN LIMIT — fitness exercises only');
  });

  it('does not print a favourites line at all when the trainer has none, fitnessOnly or not', () => {
    const on  = buildPrompt(contextWith(['warmup', 'strength', 'cooldown'], 'trainer-1', { fitnessOnly: true })).user;
    const off = buildPrompt(contextWith(['warmup', 'strength', 'cooldown'], 'trainer-1', { fitnessOnly: false })).user;
    expect(on).not.toContain('Trainer favourite exercises');
    expect(off).not.toContain('Trainer favourite exercises');
  });

  it('leaves avoidExercises completely unaffected by fitnessOnly', () => {
    const { user } = buildPrompt(contextWith(
      ['warmup', 'strength', 'cooldown'], 'trainer-1', { fitnessOnly: true }, {},
      { avoidExercises: ['Overhead Press'] },
    ));
    expect(user).toContain('Trainer avoid exercises: Overhead Press');
    expect(user).not.toContain('Trainer avoid exercises (secondary');
  });
});

describe('DEFAULT_AI_TRAINER session order', () => {
  // Phase 0 moved the output contract to the six canonical blocks but left this
  // constant on the retired `main`. It was latent then — the trainer section is
  // skipped for id 'ai-coach', so the value was never printed. Phase 2 makes it
  // load-bearing, so the mismatch would now reach the model.
  it('uses the canonical vocabulary and matches the agreed default', () => {
    expect(DEFAULT_AI_TRAINER.sessionOrder).toEqual(DEFAULT_SESSION_ORDER);
    expect(DEFAULT_AI_TRAINER.sessionOrder).not.toContain('main');
    for (const block of DEFAULT_AI_TRAINER.sessionOrder) {
      expect(SESSION_BLOCKS as readonly string[]).toContain(block);
    }
  });
});
