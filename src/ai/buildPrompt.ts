import type { AIContext, TaskContext } from './types';

// ─── System prompt (instructs the model on role, rules, output format) ────────

function buildSystemPrompt(task: TaskContext['type'], locale: string): string {
  const base = `You are an AI personal training assistant for TrAIner, a professional fitness coaching platform.
You receive structured context about the trainer (Coach DNA), the client (profile + history), today's readiness (check-in), performance statistics, and an exercise library.

Rules:
- Always honour safety: if safetyStatus is "blocked", refuse to generate a workout and return a safety note instead.
- Never expose raw sensitive fields (body_rhythm details, sensitive_factors, comorbidity specifics beyond generic safety flags).
- Match the trainer's archetype, coaching style, and communication tone.
- Respect equipment and location constraints exactly — never prescribe equipment not listed.
- Honour the trainer's avoidExercises and client's injury/pain restrictions.
- Adapt intensity based on readinessScore, fatigueRisk, and intensityCeiling.
- Respond in ${locale}. All workout titles, coach notes, exercise cues, and adaptation notes must be in ${locale}.
- Return ONLY valid JSON matching the required output shape — no markdown fences, no commentary.`;

  const shapes: Record<typeof task, string> = {
    generate_workout: `
Output shape:
{
  "workout": {
    "title": "string",
    "format": "string",
    "totalDurationMin": number,
    "coachNote": "string — 1-2 sentences in the trainer's voice",
    "adaptations": ["string — each adaptation made for today's readiness"],
    "phases": [
      {
        "phase": "warmup|main|cooldown|technique|conditioning|mobility",
        "label": "string",
        "durationMin": number,
        "exercises": [
          {
            "name": "string",
            "muscleGroup": "string",
            "sets": number,
            "reps": "string — e.g. '3x10' or '30s'",
            "load": "string — e.g. 'bodyweight', '60% 1RM', 'light'",
            "restSeconds": number,
            "cue": "string — 1 coaching cue in trainer's tone",
            "safetyNote": "string | omit if not needed"
          }
        ]
      }
    ]
  },
  "usage": { "input_tokens": 0, "output_tokens": 0 },
  "context_snapshot": { "readinessScore": 0, "safetyStatus": "string", "adaptations": [] }
}`,

    suggest_objectives: `
Output shape:
{
  "objectives": {
    "analysis": "string — 2-3 sentences clinical analysis",
    "objectives": [
      {
        "type": "short_term|medium_term|long_term",
        "title": "string",
        "rationale": "string",
        "metrics": "string — measurable success criteria",
        "priority": "high|medium|low",
        "timeframe": "string — e.g. '4 weeks'"
      }
    ],
    "adjustments": [
      {
        "aspect": "string",
        "current": "string",
        "suggested": "string",
        "reason": "string"
      }
    ]
  },
  "usage": { "input_tokens": 0, "output_tokens": 0 },
  "context_snapshot": { "readinessScore": 0, "safetyStatus": "string", "adaptations": [] }
}`,

    daily_insight: `
Output shape:
{
  "insight": {
    "title": "string — short headline",
    "body": "string — 2-3 sentences in trainer's voice",
    "action": "string | omit if not actionable",
    "tone": "motivational|clinical|empathetic|direct"
  },
  "usage": { "input_tokens": 0, "output_tokens": 0 },
  "context_snapshot": { "readinessScore": 0, "safetyStatus": "string", "adaptations": [] }
}`,
  };

  return base + shapes[task];
}

// ─── User prompt (structured context sections) ────────────────────────────────

export function buildUserPrompt(ctx: AIContext): string {
  const { trainer, client, today, stats, library, task } = ctx;

  const lines: string[] = [];

  // ── Trainer / Coach DNA ──────────────────────────────────────────────────────
  lines.push('## TRAINER PROFILE (Coach DNA)');
  lines.push(`Archetype: ${trainer.archetype}`);
  lines.push(`Name: ${trainer.name}`);
  lines.push(`Coaching style: ${trainer.coachingStyles.join(', ') || 'not specified'}`);
  lines.push(`Core values: ${trainer.coreValues.join(', ') || 'not specified'}`);
  if (trainer.motto) lines.push(`Motto: "${trainer.motto}"`);
  if (trainer.coachVoice) lines.push(`Coach voice: ${trainer.coachVoice}`);
  lines.push(`Methods: ${trainer.methods.join(', ') || 'not specified'}`);
  lines.push(`Preferred environments: ${trainer.environments.join(', ') || 'not specified'}`);
  lines.push(`Typical intensity: ${trainer.intensity || 'not specified'}`);
  lines.push(`Focus emphasis (0-10): strength=${trainer.focus.strength}, endurance=${trainer.focus.endurance}, mobility=${trainer.focus.mobility}, athletic=${trainer.focus.athletic}, coord=${trainer.focus.coord}, balance=${trainer.focus.balance}`);
  lines.push(`Preferred session formats: ${trainer.preferredFormats.join(', ') || 'not specified'}`);
  lines.push(`Session order: ${trainer.sessionOrder.join(' → ') || 'not specified'}`);
  lines.push(`Intensity curve: ${trainer.intensityCurve || 'not specified'}`);
  lines.push(`Communication tone: ${trainer.communicationTone.join(', ') || 'not specified'}`);
  if (trainer.favoriteExercises.length > 0)
    lines.push(`Trainer favourite exercises: ${trainer.favoriteExercises.slice(0, 10).join(', ')}`);
  if (trainer.avoidExercises.length > 0)
    lines.push(`Trainer avoid exercises: ${trainer.avoidExercises.slice(0, 10).join(', ')}`);
  lines.push('');

  // ── Client ───────────────────────────────────────────────────────────────────
  lines.push('## CLIENT PROFILE');
  lines.push(`Name: ${client.name}`);
  if (client.age)          lines.push(`Age: ${client.age}`);
  if (client.biologicalSex) lines.push(`Biological sex: ${client.biologicalSex}`);
  lines.push(`Fitness level: ${client.fitnessLevel}`);
  lines.push(`Primary goal: ${client.primaryGoal}`);
  if (client.secondaryGoals.length > 0)
    lines.push(`Secondary goals: ${client.secondaryGoals.join(', ')}`);
  lines.push(`Training frequency: ${client.daysPerWeek}x/week, ${client.sessionDuration} min/session`);
  lines.push(`Preferred time: ${client.preferredTime}`);
  lines.push(`Modalities: ${client.modalities.join(', ') || 'not specified'}`);
  lines.push(`Intensity preference: ${client.preferenceIntensity}`);
  lines.push(`Explanation level: ${client.explanationLevel}`);
  lines.push(`Training focus: ${client.trainingFocus}`);
  if (client.mobilityLevel)   lines.push(`Mobility: ${client.mobilityLevel}`);
  if (client.balanceLevel)    lines.push(`Balance: ${client.balanceLevel}`);
  if (client.effortTolerance) lines.push(`Effort tolerance: ${client.effortTolerance}`);
  if (client.baselinePainLevel && client.baselinePainLevel !== 'none')
    lines.push(`Baseline pain: ${client.baselinePainLevel}`);
  if (client.hasHealthCondition && client.healthCategories.length > 0)
    lines.push(`Health categories: ${client.healthCategories.join(', ')}`);
  if (client.comorbidities.length > 0)
    lines.push(`Comorbidities: ${client.comorbidities.join(', ')}`);
  lines.push(`Risk level: ${client.riskLevel}`);
  if (client.riskFlags.length > 0) lines.push(`Risk flags: ${client.riskFlags.join(', ')}`);
  // Amplified profile (when available)
  if (client.trainabilityTier)  lines.push(`Trainability tier: ${client.trainabilityTier}`);
  if (client.intensityCeiling)  lines.push(`Intensity ceiling: ${client.intensityCeiling}`);
  if (client.progressionRate)   lines.push(`Progression rate: ${client.progressionRate}`);
  if (client.safetyFlags?.length) lines.push(`Safety flags: ${client.safetyFlags.join(', ')}`);
  if (client.aiNotes)           lines.push(`AI notes: ${client.aiNotes}`);
  lines.push('');

  // ── Today ────────────────────────────────────────────────────────────────────
  lines.push("## TODAY'S READINESS (Check-in)");
  lines.push(`Check-in type: ${today.variant}`);
  lines.push(`Readiness score: ${today.readinessScore}/100`);
  lines.push(`Energy: ${today.energyLevel}/10`);
  lines.push(`Sleep quality: ${today.sleepQuality}${today.sleepHours ? ` (${today.sleepHours}h)` : ''}`);
  lines.push(`Fatigue: ${today.fatigueLevel}/10${today.fatigueType ? ` — type: ${today.fatigueType}` : ''}`);
  if (today.emotionalState) lines.push(`Emotional state: ${today.emotionalState}`);
  lines.push(`Pain present: ${today.painPresent ? `yes — intensity ${today.painIntensity}/10${today.painRegions.length ? ', regions: ' + today.painRegions.join(', ') : ''}` : 'no'}`);
  lines.push(`Safety gate: ${today.safetyStatus}${today.safetySignals.length ? ` (signals: ${today.safetySignals.join(', ')})` : ''}`);
  lines.push(`AI-led session blocked: ${today.aiLedBlocked}`);
  lines.push(`Available time: ${today.availableMinutes} min`);
  lines.push(`Location today: ${today.location}`);
  if (today.equipmentToday?.length)
    lines.push(`Equipment today: ${today.equipmentToday.join(', ')}`);
  if (today.cycleActive) {
    lines.push(`Menstrual cycle: active${today.cyclePhase ? ` — phase: ${today.cyclePhase}` : ''}`);
    if (today.cycleAdaptation) lines.push(`Cycle adaptation request: ${today.cycleAdaptation}`);
  }
  lines.push('');

  // ── Stats ─────────────────────────────────────────────────────────────────────
  lines.push('## PERFORMANCE STATISTICS');
  lines.push(`Adherence rate: ${stats.adherenceRate}%`);
  lines.push(`Current streak: ${stats.workoutStreak} sessions`);
  lines.push(`Sessions last 30d: ${stats.sessionsLast30d}`);
  lines.push(`Avg energy (7d): ${stats.avgEnergy7d}/10`);
  lines.push(`Avg readiness (7d): ${stats.avgReadiness7d}`);
  if (stats.avgRPELast3 > 0) lines.push(`Avg RPE (last 3): ${stats.avgRPELast3}/10`);
  lines.push(`Pain events (14d): ${stats.painEvents14d}${stats.primaryPainRegion ? ` — primary region: ${stats.primaryPainRegion}` : ''}`);
  if (stats.painRecurrenceAlert) lines.push('⚠ Pain recurrence alert: yes');
  lines.push(`Predictive scores (0-100): progression_readiness=${stats.predictiveScores.progressionReadiness}, fatigue_risk=${stats.predictiveScores.fatigueRisk}, pain_recurrence=${stats.predictiveScores.painRecurrence}, session_completion=${stats.predictiveScores.sessionCompletion}, plan_fit=${stats.predictiveScores.planFit}`);
  lines.push('');

  // ── Library constraints ───────────────────────────────────────────────────────
  lines.push('## EXERCISE CONSTRAINTS');
  lines.push(`Equipment available: ${library.equipmentAvailable.join(', ') || 'bodyweight only'}`);
  if (library.excludedRegions.length > 0)
    lines.push(`Excluded body regions (injury/pain): ${library.excludedRegions.join(', ')}`);
  if (library.favoriteExercises.length > 0)
    lines.push(`Preferred exercises: ${library.favoriteExercises.slice(0, 8).join(', ')}`);
  if (library.avoidExercises.length > 0)
    lines.push(`Exercises to avoid: ${library.avoidExercises.slice(0, 8).join(', ')}`);
  lines.push('');

  // ── Task ─────────────────────────────────────────────────────────────────────
  lines.push('## TASK');
  const taskLabel: Record<string, string> = {
    generate_workout:    'Generate a smart workout',
    suggest_objectives:  'Suggest training objectives',
    daily_insight:       'Generate a daily insight',
  };
  lines.push(taskLabel[task.type] ?? task.type);
  if (task.durationMin)       lines.push(`Target duration: ${task.durationMin} min`);
  if (task.focusOverride)     lines.push(`Focus override: ${task.focusOverride}`);
  if (task.extraInstructions) lines.push(`Additional instructions: ${task.extraInstructions}`);

  return lines.join('\n');
}

// ─── Prompt pair ─────────────────────────────────────────────────────────────

export function buildPrompt(ctx: AIContext): { system: string; user: string } {
  return {
    system: buildSystemPrompt(ctx.task.type, ctx.locale),
    user:   buildUserPrompt(ctx),
  };
}
