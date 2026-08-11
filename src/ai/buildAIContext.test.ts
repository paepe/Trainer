import { describe, expect, it } from 'vitest';
import { buildClientContext } from './buildAIContext';
import type { UserProfileV2 } from '../types/profile-v2';

function profileWithConsent(allowAI: boolean | undefined): UserProfileV2 {
  return {
    user_id: 'client-1', current_step: 'completed', created_at: '', updated_at: '',
    objectives: { primary_goal: 'strength_gain', secondary_goals: [], voice_note: 'My private objective note' },
    declared_health: {
      has_condition: true, categories: ['cardiovascular'],
      free_text: 'Private clinical detail', voice_note: 'Private health dictation',
    },
    comorbidities: { conditions: ['hypertension'], voice_note: 'Private comorbidity dictation' },
    abandon_history: {
      reasons: [], preferred_intensity: 'moderate', churn_risk_signals: [],
      voice_note: 'Private history dictation',
    },
    sensitive_factors: {
      regular_medications: 'Private medication', declares_emotional_history: true,
      declares_recreational_substance: false, voice_note: 'Private sensitive dictation',
    },
    body_rhythm: { enabled: true, cycle_current_day: 12 },
    ...(allowAI === undefined ? {} : {
      consent: {
        allow_ai_adaptation: allowAI, maintain_access_log: false,
        personal: {} as never, studio: {} as never,
      },
    }),
  };
}

describe('buildClientContext — AI adaptation consent', () => {
  it('uses default-deny when consent is absent', () => {
    const context = buildClientContext(profileWithConsent(undefined));

    expect(context.voiceNote).toBeUndefined();
    expect(context.healthCategories).toEqual([]);
    expect(context.healthFreeText).toBeUndefined();
    expect(context.comorbidities).toEqual([]);
    expect(context.sensitiveFactors).toBeUndefined();
    expect(context.bodyRhythm).toMatchObject({
      enabled: true,
      cycleCurrentDay: 12,
    });
    expect(context.abandonHistory?.voiceNote).toBeUndefined();
  });

  it('keeps the existing privacy mask when consent is explicitly declined', () => {
    const context = buildClientContext(profileWithConsent(false));

    expect(context.hasHealthCondition).toBe(false);
    expect(context.healthVoiceNote).toBeUndefined();
    expect(context.comorbiditiesNote).toBeUndefined();
    expect(context.sensitiveFactors).toBeUndefined();
    expect(context.bodyRhythm).toMatchObject({
      enabled: true,
      cycleCurrentDay: 12,
    });
  });

  it('includes the authorized context only after explicit consent', () => {
    const context = buildClientContext(profileWithConsent(true));

    expect(context.voiceNote).toBe('My private objective note');
    expect(context.healthFreeText).toBe('Private clinical detail');
    expect(context.comorbidities).toEqual(['hypertension']);
    expect(context.sensitiveFactors?.regularMedications).toBe('Private medication');
  });
});
