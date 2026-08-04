export type FeatureKey =
  | 'scores.basic'
  | 'scores.advanced'
  | 'ai.workout_generation'   // gates whether AI generates the workout at all (creation)
  | 'ai.checkin_adjustment'   // gates daily calibration by energy/sleep/fatigue only — never gates safety signals (pain, Safety Gate)
  | 'ai.advanced_analysis'
  | 'coach_dna'
  | 'clients.limit'
  | 'studio.branding'
  | 'marketplace.listing'
  | 'marketplace.revenue_share'
  // Client plan gates (v2)
  | 'workout.sessions_per_week'      // limit_value = max sessions/week (null = unlimited)
  | 'workout.exercises_per_session'  // limit_value = max exercises (null = unlimited)
  | 'workout.exercise_type'          // limit_value: 0 = fitness only, null = all
  | 'checkin.full'                   // legacy — decomposed below (Fase 4.1); kept, not read, per migração compatível
  | 'trainer_plan.days_per_week'     // limit_value = max trainer plan days (null = all)
  | 'progress.fitness_advanced'      // advanced fitness metrics in progress tab
  | 'progress.performance'           // performance metrics (ATL/CTL/TSB etc.)
  // Fase 4.1 — decomposição de checkin.full e das métricas
  // (docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md): separa dados e
  // execução (patrocináveis pelo vínculo com o treinador) de automação e
  // inteligência variável (nunca patrocinada — sempre paga por quem chama a IA).
  | 'checkin.full_capture'           // formulário estruturado completo (Quick + Detailed) — patrocinável
  | 'checkin.voice_input'            // transcrição por voz (api/parse-voice.ts, custo de IA) — nunca patrocinável
  | 'ai.checkin_interpretation'      // leitura narrativa por IA do check-in — nunca patrocinável
  | 'progress.client_raw_data'       // dados brutos do aluno — patrocinável, determinístico
  | 'progress.coach_operational';    // aderência/frequência/carga/volume — patrocinável, determinístico

export interface FeaturePermission {
  feature_key:  FeatureKey;
  plan_key:     string;
  allowed:      boolean;
  limit_value:  number | null;
}

export interface FeatureAccess {
  allowed:     boolean;
  limitValue:  number | null;
  loading:     boolean;
}
