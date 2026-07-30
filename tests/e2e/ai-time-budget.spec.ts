import { test, expect, request as playwrightRequest } from '@playwright/test';

// Guards the time-budget contract on BOTH generation endpoints: whatever the
// LLM returns, the session the user receives must occupy 90-110% of the time
// they said they had. The prompt states the arithmetic; the server enforces it
// (trim on overflow, extra sets on a short batch). Live calls, so a few runs
// each — enough to catch a broken contract, not a statistical study.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY!;
const PASSWORD     = 'TrAIner2026!';
const RUNS         = 3;

async function tokenFor(email: string) {
  const ctx = await playwrightRequest.newContext();
  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password: PASSWORD },
  });
  const body = await res.json();
  await ctx.dispose();
  return { token: body.access_token as string, userId: body.user.id as string };
}

const flat = (e: any) => (e.sets ?? 1) * ((e.duration_seconds ?? 40) + (e.rest_seconds ?? 30)) / 60;
const smart = (e: any) => (e.sets ?? 1) * ((e.durationSeconds ?? 40) + (e.restSeconds ?? 30)) / 60;

function report(label: string, pct: number[]) {
  console.log(`${label} RATIOS: ${pct.join(', ')}`);
  console.log(`${label} fora da banda 90-110%: ${pct.filter(p => p < 90 || p > 110).length}/${pct.length}`);
}

test('generate-workout: complement path fills its budget', async ({ request }) => {
  test.setTimeout(240_000);
  const { token } = await tokenFor('carlos.silva@trainer.test');
  const BUDGET = 40;
  const pct: number[] = [];

  for (let i = 0; i < RUNS; i++) {
    const res = await request.post('/api/generate-workout', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        checkin: { energy: 7, minutes: 47, goal: 'strength' },
        locale: 'en',
        existing_exercises: [{ exercise_name: 'Bench Press', muscle_group: 'Chest', sets: 4, reps: 8, rest_seconds: 60 }],
        remaining_minutes: BUDGET,
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const { exercises } = await res.json();
    const total = exercises.reduce((a: number, e: any) => a + flat(e), 0);
    pct.push(Math.round(total / BUDGET * 100));
    console.log(`  run ${i + 1}: ${exercises.length} ex, ${Math.round(total)}/${BUDGET} min => ${pct[i]}%`);
  }
  report('FLAT', pct);
  expect(pct.every(p => p >= 90 && p <= 110), `fora da banda: ${pct.join(', ')}`).toBeTruthy();
});

test('generate-smart-workout: client session fills the available window', async ({ request }) => {
  test.setTimeout(240_000);
  const { token, userId } = await tokenFor('tiago.moreira@client.test');
  const BUDGET = 45;
  const pct: number[] = [];

  for (let i = 0; i < RUNS; i++) {
    const res = await request.post('/api/generate-smart-workout', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        trainer: { id: 'ai-coach' },
        client:  {
          id: userId, name: 'Tiago', primaryGoal: 'strength', secondaryGoals: [],
          fitnessLevel: 'intermediate', daysPerWeek: 3, sessionDuration: BUDGET,
          preferredTime: 'evening', modalities: ['strength'],
          hasHealthCondition: false, healthCategories: [], comorbidities: [],
          mobilityLevel: 'good', balanceLevel: 'good', effortTolerance: 'moderate',
          baselinePainLevel: 'none', locations: ['gym'], equipment: ['barbell', 'dumbbell'],
          preferenceIntensity: 'moderate', explanationLevel: 'standard',
          trainingFocus: 'hypertrophy', riskLevel: 'low', riskFlags: [],
        },
        today:   {
          readinessScore: 75, safetyStatus: 'clear', availableMinutes: BUDGET,
          energyLevel: 7, sleepQuality: 'good', fatigueLevel: 3,
          painPresent: false, painRegions: [], safetySignals: [],
          aiLedBlocked: false, location: 'gym', equipmentToday: ['barbell', 'dumbbell'],
          adaptations: [],
        },
        stats:   {
          adherenceRate: 80, workoutStreak: 3, sessionsLast30d: 10,
          avgEnergy7d: 7, avgReadiness7d: 75, avgRPELast3: 7,
          painEvents14d: 0, painRecurrenceAlert: false,
          predictiveScores: { progressionReadiness: 70, fatigueRisk: 20, painRecurrence: 10, sessionCompletion: 85, planFit: 80 },
        },
        library: { excludedRegions: [], favoriteExercises: [], avoidExercises: [], equipmentAvailable: ['barbell', 'dumbbell'] },
        task:    { type: 'generate_workout' },
        locale:  'en',
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    if (!body.workout?.phases?.length) { console.log(`  run ${i + 1}: sem workout (gate) — pulando`); continue; }
    const total = body.workout.phases.flatMap((p: any) => p.exercises ?? []).reduce((a: number, e: any) => a + smart(e), 0);
    pct.push(Math.round(total / BUDGET * 100));
    console.log(`  run ${i + 1}: ${body.workout.phases.length} fases, ${Math.round(total)}/${BUDGET} min => ${pct[pct.length - 1]}% (declarado: ${body.workout.totalDurationMin})`);
  }
  report('SMART', pct);
  expect(pct.length, 'nenhuma geração completou').toBeGreaterThan(0);
  expect(pct.every(p => p >= 90 && p <= 110), `fora da banda: ${pct.join(', ')}`).toBeTruthy();
});
