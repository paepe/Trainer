// POST /api/generate-smart-workout
// Input:  SmartWorkoutRequest  (trainer + client + today + stats + library + task)
// Output: SmartWorkoutResponse (workout | objectives | insight + usage + context_snapshot)
// Uses DeepSeek deepseek-chat. No Supabase calls — client pre-fetches and sends data.
// Privacy: sensitive_factors/body_rhythm are included in client.sensitiveFactors/bodyRhythm only when
// consent.allow_ai_adaptation is true (gated in buildAIContext.ts). When false, both are omitted before the request is sent.
// NOTE: All types and prompt-building logic are inlined (self-contained) for Vercel bundling.

// ─── Inlined types (from src/ai/types.ts + src/types/coach-dna.ts) ────────────

type CoachArchetype = 'performance' | 'technician' | 'motivator' | 'guide' | 'drill' | 'movement';
type AITask = 'generate_workout' | 'suggest_objectives' | 'daily_insight';

interface TrainerContext {
  id:                string;
  name:              string;
  archetype:         CoachArchetype;
  coachingStyles:    string[];
  coreValues:        string[];
  coachVoice:        string;
  motto:             string;
  methods:           string[];
  environments:      string[];
  intensity:         string;
  focus: {
    strength:  number;
    endurance: number;
    mobility:  number;
    athletic:  number;
    coord:     number;
    balance:   number;
  };
  preferredFormats:    string[];
  intensityCurve:      string;
  sessionOrder:        string[];
  communicationTone:   string[];
  clientProfiles:      string[];
  favoriteExercises:   string[];
  avoidExercises:      string[];
}

interface ClientContext {
  id:                  string;
  name:                string;
  age?:                number | undefined;
  biologicalSex?:      string | undefined;
  heightCm?:           number | undefined;
  weightKg?:           number | undefined;
  primaryGoal:         string;
  secondaryGoals:      string[];
  voiceNote?:          string | undefined;
  fitnessLevel:        string;
  daysPerWeek:         number;
  sessionDuration:     number;
  preferredTime:       string;
  preferredDays?:      number[] | undefined;
  adherenceBarriers?:   string[] | undefined;
  modalities:          string[];
  hasHealthCondition:  boolean;
  healthCategories:    string[];
  healthFreeText?:     string | undefined;
  healthVoiceNote?:     string | undefined;
  comorbidities:       string[];
  comorbiditiesNote?:   string | undefined;
  mobilityLevel:       string;
  balanceLevel:        string;
  autonomyLevel?:      string | undefined;
  effortTolerance:     string;
  baselinePainLevel:   string;
  accessLevel?:        string | undefined;
  supportResources?:   string[] | undefined;
  instructionFormat?:   string[] | undefined;
  accessibility?:       string[] | undefined;
  locations:           string[];
  equipment:           string[];
  preferenceIntensity: string;
  explanationLevel:    string;
  preferredLanguage?:  string | undefined;
  trainingFocus:       string;
  company?:            string | undefined;
  supportLevel?:       string | undefined;
  riskLevel:           string;
  riskFlags:           string[];
  lifestyleBarriers?:  string[] | undefined;
  sensitiveFactors?: {
    regularMedications?:            string | undefined;
    emotionalHistory:               boolean;
    recreationalSubstance:          boolean;
    voiceNote?:                     string | undefined;
  } | undefined;
  bodyRhythm?: {
    enabled:              boolean;
    cycleCurrentDay?:     number | undefined;
    cycleDurationDays?:   number | undefined;
    adaptationPreference?: string[] | undefined;
  } | undefined;
  abandonHistory?: {
    reasons:               string[];
    hadNegativeExperience?: boolean | undefined;
    fearOfInjury?:          boolean | undefined;
    feltGymConstraint?:     boolean | undefined;
    whatHelped?:            string | undefined;
    whatDisrupted?:         string | undefined;
    voiceNote?:             string | undefined;
  } | undefined;
  consentAiAdaptation?: boolean | undefined;
  trainabilityTier?:   string | undefined;
  priorityGoal?:       string | undefined;
  intensityCeiling?:   string | undefined;
  progressionRate?:    string | undefined;
  safetyFlags?:        string[] | undefined;
  aiNotes?:            string | undefined;
}

interface TodayContext {
  checkinAt:         string;
  variant:           string;
  readinessScore:    number;
  energyLevel:       number;
  sleepQuality:      string;
  sleepHours?:       number | undefined;
  fatigueLevel:      number;
  fatigueType?:      string | undefined;
  emotionalState?:   string | undefined;
  painPresent:       boolean;
  painIntensity:     number;
  painRegions:       string[];
  safetyStatus:      string;
  aiLedBlocked:      boolean;
  safetySignals:     string[];
  availableMinutes:  number;
  location:          string;
  equipmentToday?:   string[] | undefined;
  cycleActive?:      boolean | undefined;
  cyclePhase?:       string | undefined;
  cycleDayOfPhase?:  number | undefined;
  cycleAdaptation?:  string | undefined;
}

interface StatsContext {
  adherenceRate:        number;
  workoutStreak:        number;
  sessionsLast30d:      number;
  avgEnergy7d:          number;
  avgReadiness7d:       number;
  avgRPELast3:          number;
  painEvents14d:        number;
  primaryPainRegion?:   string | undefined;
  painRecurrenceAlert:  boolean;
  predictiveScores: {
    progressionReadiness: number;
    fatigueRisk:          number;
    painRecurrence:       number;
    sessionCompletion:    number;
    planFit:              number;
  };
}

interface LibraryContext {
  excludedRegions:    string[];
  favoriteExercises:  string[];
  avoidExercises:     string[];
  equipmentAvailable: string[];
}

interface TaskContext {
  type:                AITask;
  durationMin?:        number | undefined;
  focusOverride?:      string | undefined;
  extraInstructions?:  string | undefined;
}

interface AIContext {
  trainer:        TrainerContext;
  client:         ClientContext;
  today:          TodayContext;
  stats:          StatsContext;
  library:        LibraryContext;
  task:           TaskContext;
  locale:         string;
  contextVersion: '1.0';
  builtAt:        string;
}

interface SmartWorkout {
  title:           string;
  format:          string;
  totalDurationMin: number;
  coachNote:       string;
  adaptations:     string[];
  phases:          WorkoutPhase[];
}

interface WorkoutPhase {
  phase:       string;
  label:       string;
  durationMin: number;
  exercises:   WorkoutExercise[];
}

interface WorkoutExercise {
  name:         string;
  muscleGroup:  string;
  sets:         number;
  reps:         string;
  load:         string;
  restSeconds:  number;
  cue:           string;
  safetyNote?:   string | undefined;
}

interface DailyInsight {
  title:    string;
  body:     string;
  action?:  string | undefined;
  tone:     string;
}

type SmartWorkoutRequest = {
  trainer: TrainerContext;
  client:  ClientContext;
  today:   TodayContext;
  stats:   StatsContext;
  library: LibraryContext;
  task:    TaskContext;
  locale:  string;
};

interface SmartWorkoutResponse {
  workout?:    SmartWorkout    | undefined;
  objectives?: { analysis: string; objectives: { type: string; title: string; rationale: string; metrics: string; priority: string; timeframe: string }[]; adjustments: { aspect: string; current: string; suggested: string; reason: string }[] } | undefined;
  insight?:    DailyInsight    | undefined;
  usage: {
    input_tokens:  number;
    output_tokens: number;
  };
  context_snapshot: {
    readinessScore: number;
    safetyStatus:   string;
    adaptations:    string[];
  };
}

// ─── Inlined prompt builder (from src/ai/buildPrompt.ts) ──────────────────────

const LOCALE_TO_LANG: Record<string, string> = {
  'en': 'English', 'en-US': 'English', 'en-GB': 'English',
  'pt': 'Portuguese (Brazil)', 'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)',
  'es': 'Spanish', 'es-ES': 'Spanish', 'es-MX': 'Spanish (Mexico)',
  'de': 'German', 'de-DE': 'German',
};

function buildSystemPrompt(task: TaskContext['type'], locale: string, isAutonomous: boolean): string {
  const lang = LOCALE_TO_LANG[locale] ?? locale ?? 'English';
  const base = `You are an AI personal training assistant for TrAIner, a professional fitness coaching platform.
You receive structured context about ${isAutonomous ? 'the client (profile + history), today\'s readiness (check-in), performance statistics, and exercise constraints' : 'the trainer (Coach DNA), the client (profile + history), today\'s readiness (check-in), performance statistics, and an exercise library'}.
${isAutonomous ? 'This client trains autonomously — there is no trainer profile. Base your recommendations solely on the client\'s profile, goals, preferences, health context, and readiness data.' : ''}
Rules:
- Always honour safety: if safetyStatus is "blocked", refuse to generate a workout and return a safety note instead.
- Never expose raw sensitive fields in public-facing output. However, ALL data in the input context is available for personalisation — use body_rhythm, sensitive_factors, comorbidities, habits, and abandon_history to inform exercise selection, intensity, format, and safety decisions.
${isAutonomous ? '- Since there is no trainer, generate a plan consistent with the client\'s stated goals, intensity preference, training focus, and fitness level. Use an encouraging, evidence-based coaching voice.' : '- Match the trainer\'s archetype, coaching style, and communication tone.'}
- Respect equipment and location constraints exactly — never prescribe equipment not listed.
- Honour the trainer's avoidExercises and client's injury/pain restrictions.
- Adapt intensity based on readinessScore, fatigueRisk, and intensityCeiling.
- Respond in ${lang}. All workout titles, coach notes, exercise cues, descriptions, and adaptation notes MUST be written in ${lang}. Never mix languages.
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

function buildUserPrompt(ctx: AIContext): string {
  const { trainer, client, today, stats, library, task } = ctx;

  const lines: string[] = [];

  const isAutonomous = trainer.id === 'ai-coach';

  if (!isAutonomous) {
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
    lines.push(`Session order: ${trainer.sessionOrder.join(' \u2192 ') || 'not specified'}`);
    lines.push(`Intensity curve: ${trainer.intensityCurve || 'not specified'}`);
    lines.push(`Communication tone: ${trainer.communicationTone.join(', ') || 'not specified'}`);
    if (trainer.favoriteExercises.length > 0)
      lines.push(`Trainer favourite exercises: ${trainer.favoriteExercises.slice(0, 10).join(', ')}`);
    if (trainer.avoidExercises.length > 0)
      lines.push(`Trainer avoid exercises: ${trainer.avoidExercises.slice(0, 10).join(', ')}`);
    lines.push('');
  }

  lines.push('## CLIENT PROFILE');
  lines.push(`Name: ${client.name}`);
  if (client.age)              lines.push(`Age: ${client.age}`);
  if (client.biologicalSex)    lines.push(`Biological sex: ${client.biologicalSex}`);
  if (client.heightCm)         lines.push(`Height: ${client.heightCm} cm`);
  if (client.weightKg)         lines.push(`Weight: ${client.weightKg} kg`);
  lines.push(`Fitness level: ${client.fitnessLevel}`);
  lines.push(`Primary goal: ${client.primaryGoal}`);
  if (client.secondaryGoals.length > 0)
    lines.push(`Secondary goals: ${client.secondaryGoals.join(', ')}`);
  if (client.voiceNote)        lines.push(`Goal voice note: "${client.voiceNote}"`);
  lines.push(`Training frequency: ${client.daysPerWeek}x/week, ${client.sessionDuration} min/session`);
  lines.push(`Preferred time: ${client.preferredTime}`);
  if (client.preferredDays?.length) {
    const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    lines.push(`Preferred days: ${client.preferredDays.map(d => dayNames[d] ?? d).join(', ')}`);
  }
  if (client.adherenceBarriers?.length)
    lines.push(`Adherence barriers: ${client.adherenceBarriers.join(', ')}`);
  lines.push(`Modalities: ${client.modalities.join(', ') || 'not specified'}`);
  lines.push(`Intensity preference: ${client.preferenceIntensity}`);
  lines.push(`Explanation level: ${client.explanationLevel}`);
  lines.push(`Training focus: ${client.trainingFocus}`);
  if (client.preferredLanguage) lines.push(`Communication style: ${client.preferredLanguage}`);
  if (client.company)           lines.push(`Training company: ${client.company}`);
  if (client.supportLevel)      lines.push(`Support preference: ${client.supportLevel}`);
  if (client.mobilityLevel)     lines.push(`Mobility: ${client.mobilityLevel}`);
  if (client.balanceLevel)      lines.push(`Balance: ${client.balanceLevel}`);
  if (client.autonomyLevel)     lines.push(`Autonomy: ${client.autonomyLevel}`);
  if (client.effortTolerance)   lines.push(`Effort tolerance: ${client.effortTolerance}`);
  if (client.baselinePainLevel && client.baselinePainLevel !== 'none')
    lines.push(`Baseline pain: ${client.baselinePainLevel}`);
  if (client.supportResources?.length)
    lines.push(`Support resources: ${client.supportResources.join(', ')}`);
  if (client.instructionFormat?.length)
    lines.push(`Instruction format: ${client.instructionFormat.join(', ')}`);
  if (client.accessibility?.length)
    lines.push(`Accessibility needs: ${client.accessibility.join(', ')}`);
  if (client.accessLevel)       lines.push(`Access level: ${client.accessLevel}`);
  if (client.hasHealthCondition && client.healthCategories.length > 0)
    lines.push(`Health categories: ${client.healthCategories.join(', ')}`);
  if (client.healthFreeText)  lines.push(`Health notes: "${client.healthFreeText}"`);
  if (client.healthVoiceNote) lines.push(`Health voice note: "${client.healthVoiceNote}"`);
  if (client.comorbidities.length > 0)
    lines.push(`Comorbidities: ${client.comorbidities.join(', ')}`);
  if (client.comorbiditiesNote) lines.push(`Comorbidities note: "${client.comorbiditiesNote}"`);
  if (client.lifestyleBarriers?.length)
    lines.push(`Lifestyle barriers: ${client.lifestyleBarriers.join(', ')}`);
  if (client.sensitiveFactors) {
    const sf = client.sensitiveFactors;
    lines.push('## SENSITIVE FACTORS (for personalization only — never displayed)');
    if (sf.regularMedications)  lines.push(`Regular medications: ${sf.regularMedications}`);
    if (sf.emotionalHistory)    lines.push('Emotional health history: declared');
    if (sf.recreationalSubstance) lines.push('Recreational substance use: declared');
    if (sf.voiceNote)           lines.push(`Sensitive note: "${sf.voiceNote}"`);
  }
  if (client.bodyRhythm?.enabled) {
    const br = client.bodyRhythm;
    lines.push('## MENSTRUAL CYCLE (for phase-aware training)');
    if (br.cycleDurationDays)   lines.push(`Cycle duration: ${br.cycleDurationDays} days`);
    if (br.cycleCurrentDay != null) lines.push(`Current cycle day: ${br.cycleCurrentDay}`);
    if (br.adaptationPreference?.length)
      lines.push(`Adaptation preferences: ${br.adaptationPreference.join(', ')}`);
  }
  if (client.abandonHistory) {
    const ah = client.abandonHistory;
    lines.push('## TRAINING HISTORY CONTEXT');
    if (ah.reasons.length > 0) lines.push(`Previous abandon reasons: ${ah.reasons.join(', ')}`);
    if (ah.hadNegativeExperience)     lines.push('Had negative training experience: yes');
    if (ah.fearOfInjury)              lines.push('Fear of injury: yes');
    if (ah.feltGymConstraint)         lines.push('Felt constrained by gym environment: yes');
    if (ah.whatHelped)                lines.push(`What helped consistency: "${ah.whatHelped}"`);
    if (ah.whatDisrupted)             lines.push(`What disrupted routine: "${ah.whatDisrupted}"`);
    if (ah.voiceNote)                 lines.push(`Abandon voice note: "${ah.voiceNote}"`);
  }
  if (client.consentAiAdaptation !== undefined)
    lines.push(`AI adaptation consent: ${client.consentAiAdaptation ? 'granted' : 'not granted'}`);
  lines.push(`Risk level: ${client.riskLevel}`);
  if (client.riskFlags.length > 0) lines.push(`Risk flags: ${client.riskFlags.join(', ')}`);
  if (client.trainabilityTier)  lines.push(`Trainability tier: ${client.trainabilityTier}`);
  if (client.intensityCeiling)  lines.push(`Intensity ceiling: ${client.intensityCeiling}`);
  if (client.progressionRate)   lines.push(`Progression rate: ${client.progressionRate}`);
  if (client.safetyFlags?.length) lines.push(`Safety flags: ${client.safetyFlags.join(', ')}`);
  if (client.aiNotes)           lines.push(`AI notes: ${client.aiNotes}`);
  lines.push('');

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

  lines.push('## PERFORMANCE STATISTICS');
  lines.push(`Adherence rate: ${stats.adherenceRate}%`);
  lines.push(`Current streak: ${stats.workoutStreak} sessions`);
  lines.push(`Sessions last 30d: ${stats.sessionsLast30d}`);
  lines.push(`Avg energy (7d): ${stats.avgEnergy7d}/10`);
  lines.push(`Avg readiness (7d): ${stats.avgReadiness7d}`);
  if (stats.avgRPELast3 > 0) lines.push(`Avg RPE (last 3): ${stats.avgRPELast3}/10`);
  lines.push(`Pain events (14d): ${stats.painEvents14d}${stats.primaryPainRegion ? ` — primary region: ${stats.primaryPainRegion}` : ''}`);
  if (stats.painRecurrenceAlert) lines.push('\u26a0 Pain recurrence alert: yes');
  lines.push(`Predictive scores (0-100): progression_readiness=${stats.predictiveScores.progressionReadiness}, fatigue_risk=${stats.predictiveScores.fatigueRisk}, pain_recurrence=${stats.predictiveScores.painRecurrence}, session_completion=${stats.predictiveScores.sessionCompletion}, plan_fit=${stats.predictiveScores.planFit}`);
  lines.push('');

  lines.push('## EXERCISE CONSTRAINTS');
  lines.push(`Equipment available: ${library.equipmentAvailable.join(', ') || 'bodyweight only'}`);
  if (library.excludedRegions.length > 0)
    lines.push(`Excluded body regions (injury/pain): ${library.excludedRegions.join(', ')}`);
  if (library.favoriteExercises.length > 0)
    lines.push(`Preferred exercises: ${library.favoriteExercises.slice(0, 8).join(', ')}`);
  if (library.avoidExercises.length > 0)
    lines.push(`Exercises to avoid: ${library.avoidExercises.slice(0, 8).join(', ')}`);
  lines.push('');

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

function buildPrompt(ctx: AIContext): { system: string; user: string } {
  const isAutonomous = ctx.trainer.id === 'ai-coach';
  return {
    system: buildSystemPrompt(ctx.task.type, ctx.locale, isAutonomous),
    user:   buildUserPrompt(ctx),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

interface VercelRequest  { method?: string; body?: SmartWorkoutRequest }
interface VercelResponse { status(c: number): VercelResponse; json(b: unknown): VercelResponse }

declare const process: { env: Record<string, string | undefined> };

const MAX_TOKENS: Record<string, number> = {
  generate_workout:   2048,
  suggest_objectives: 1536,
  daily_insight:       512,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  if (!body?.trainer || !body?.client || !body?.today || !body?.task) {
    return res.status(400).json({ error: 'trainer, client, today, and task are required' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DEEPSEEK_API_KEY not set' });
  }

  if (body.today.aiLedBlocked || body.today.safetyStatus === 'blocked') {
    const snapshot = {
      readinessScore: body.today.readinessScore,
      safetyStatus:   body.today.safetyStatus,
      adaptations:    ['AI-led session blocked by safety gate'],
    };
    const blockResponse: SmartWorkoutResponse = {
      insight: {
        title:  'Safety Gate Active',
        body:   'Your check-in data indicates this is not a safe moment for an AI-led session. Please consult your trainer before proceeding.',
        action: 'Contact your trainer for guidance.',
        tone:   'empathetic',
      },
      usage: { input_tokens: 0, output_tokens: 0 },
      context_snapshot: snapshot,
    };
    return res.status(200).json(blockResponse);
  }

  const ctx: AIContext = {
    ...body,
    contextVersion: '1.0',
    builtAt: new Date().toISOString(),
  };

  const { system, user } = buildPrompt(ctx);
  const maxTokens = MAX_TOKENS[body.task.type] ?? 1024;

  const ctrl    = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 28_000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'deepseek-chat',
        max_tokens:  maxTokens,
        temperature: 0.45,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user   },
        ],
      }),
      signal: ctrl.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '(unreadable body)');
      throw new Error(`DeepSeek returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
      usage?:   { prompt_tokens?: number; completion_tokens?: number };
      error?:   { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? 'DeepSeek request failed');
    }

    const raw   = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned unexpected format');

    const parsed = JSON.parse(match[0]) as Partial<SmartWorkoutResponse>;

    const usage = {
      input_tokens:  data.usage?.prompt_tokens     ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    };
    const context_snapshot = parsed.context_snapshot ?? {
      readinessScore: body.today.readinessScore,
      safetyStatus:   body.today.safetyStatus,
      adaptations:    [],
    };

    return res.status(200).json({ ...parsed, usage, context_snapshot });

  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      console.warn('[generate-smart-workout] timed out');
      return res.status(504).json({ error: 'Generation timed out' });
    }
    console.error('[generate-smart-workout]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'generation failed' });
  } finally {
    clearTimeout(timeout);
  }
}
