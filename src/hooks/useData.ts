import { supabase } from '../supabase';
import type {
  PhysicalProfile,
  CheckIn,
  CycleConfig,
  Preferences,
  ExerciseCatalogItem,
} from '../types';
import type { UserProfileV2 } from '../types/profile-v2';
import type { CheckInVariant, CheckInQuick, CheckInDetailed, CheckInVoice, CheckInPostWorkout, SafetyGateResult } from '../types/checkin-v2';
import type { Json } from '../types/supabase';

interface DataResult<T>  { data: T | null;  error: unknown }
interface MutateResult   { error: unknown }

export function useData(userId: string | undefined) {

  async function savePhysicalProfile(
    data: Partial<Omit<PhysicalProfile, 'user_id'>>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('physical_profiles')
      .upsert(
        { user_id: userId, ...data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[useData] savePhysicalProfile error:', error);
    return { error };
  }

  async function saveCheckin(
    data: Omit<CheckIn, never>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from('checkins')
      .upsert(
        { user_id: userId, date: today, ...data },
        { onConflict: 'user_id,date' }
      );
    if (error) console.error('[useData] saveCheckin error:', error);
    return { error };
  }

  async function logWorkoutSession(
    data: Record<string, unknown>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('workout_sessions')
      .insert({ user_id: userId, ...data });
    if (error) console.error('[useData] logWorkoutSession error:', error);
    return { error };
  }

  async function fetchPhysicalProfile(): Promise<DataResult<PhysicalProfile>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('physical_profiles')
      .select('weight_kg, height_cm, fitness_level, primary_goal, restrictions')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useData] fetchPhysicalProfile error:', error);
    return { data: data as PhysicalProfile | null, error };
  }

  // ── Cycle config ─────────────────────────────────────────────────────────

  async function saveCycleConfig(payload: {
    cycleLength:   number;
    periodLength:  number;
    lastStartDate: string;
  }): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('cycle_config')
      .upsert(
        {
          user_id:         userId,
          cycle_length:    payload.cycleLength,
          period_length:   payload.periodLength,
          last_start_date: payload.lastStartDate,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[useData] saveCycleConfig error:', error);
    return { error };
  }

  async function fetchCycleConfig(): Promise<DataResult<CycleConfig>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('cycle_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useData] fetchCycleConfig error:', error);
    return { data: data as CycleConfig | null, error };
  }

  // ── Preferences ──────────────────────────────────────────────────────────

  async function savePreferences(
    prefs: Partial<Omit<Preferences, 'user_id' | 'updated_at'>>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('preferences')
      .upsert(
        { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[useData] savePreferences error:', error);
    return { error };
  }

  async function fetchPreferences(): Promise<DataResult<Preferences>> {
    if (!userId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) console.error('[useData] fetchPreferences error:', error);
    return { data: data as Preferences | null, error };
  }

  // ── Profile v2 ─────────────────────────────────────────────────────────────

  const toJson = (v: unknown): Json | null => v != null ? v as unknown as Json : null;

  async function saveProfileV2(
    data: Partial<UserProfileV2>,
    step: string = 'completed'
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('profile_v2')
      .upsert(
        {
          user_id:            userId,
          current_step:       step,
          completed_at:       step === 'completed' ? new Date().toISOString() : null,
          basic_data:          toJson(data.basic_data),
          objectives:          toJson(data.objectives),
          movement_history:    toJson(data.movement_history),
          functional_capacity: toJson(data.functional_capacity),
          environment:         toJson(data.environment),
          availability:        toJson(data.availability),
          preferences:         toJson(data.preferences),
          habits:              toJson(data.habits),
          comorbidities:       toJson(data.comorbidities),
          declared_health:     toJson(data.declared_health),
          sensitive_factors:   toJson(data.sensitive_factors),
          body_rhythm:         toJson(data.body_rhythm),
          consent:             toJson(data.consent),
          risk:                toJson(data.risk),
          updated_at:         new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[useData] saveProfileV2 error:', error);
    return { error };
  }

  // ── Check-in v2 ────────────────────────────────────────────────────────────

  async function saveCheckinV2(data: {
    variant:            CheckInVariant;
    quick_data?:        CheckInQuick;
    detailed_data?:     CheckInDetailed;
    voice_data?:        CheckInVoice;
    post_workout_data?: CheckInPostWorkout;
    safety_gate?:       SafetyGateResult;
  }): Promise<MutateResult> {
    if (!userId) return { error: null };
    const qd = data.quick_data;
    const dd = data.detailed_data;
    const { error } = await supabase
      .from('checkin_prontidao')
      .insert({
        user_id:           userId,
        variant:           data.variant,
        occurred_at:       new Date().toISOString(),
        input_source:      data.variant === 'voice' ? 'voice' : 'form',

        // JSONB variant blobs
        quick_data:        toJson(qd),
        detailed_data:     toJson(dd),
        voice_data:        toJson(data.voice_data),
        post_workout_data: toJson(data.post_workout_data),
        safety_gate:       toJson(data.safety_gate),

        // Denormalised columns for range queries (spec RN-2.x)
        energy_level:      qd?.energy      ?? null,
        sleep_quality:     qd?.sleep_quality ?? null,
        fatigue_level:     qd?.fatigue     ?? null,
        pain_present:      qd?.pain?.present ?? null,
        pain_intensity:    qd?.pain?.intensity ?? null,
        available_minutes: qd?.available_minutes ?? null,
        training_location: dd?.location_today ?? null,

        // Safety gate summary
        readiness_score:   data.safety_gate?.readiness_score ?? null,
        ai_led_blocked:    data.safety_gate?.ai_led_blocked  ?? false,
      });
    if (error) console.error('[useData] saveCheckinV2 error:', error);
    return { error };
  }

  // ── Pain Recurrence Engine ─────────────────────────────────────────────────
  // Increments occurrence_count for the given region; sets alert_triggered when >= 3.

  async function updatePainRecurrence(region: string): Promise<MutateResult> {
    if (!userId) return { error: null };

    const { data: existing } = await supabase
      .from('pain_recurrence_signals')
      .select('occurrence_count')
      .eq('user_id', userId)
      .eq('pain_region', region)
      .maybeSingle();

    const newCount = (existing?.occurrence_count ?? 0) + 1;

    const { error } = await supabase
      .from('pain_recurrence_signals')
      .upsert(
        {
          user_id:           userId,
          pain_region:       region,
          occurrence_count:  newCount,
          window_days:       14,
          alert_triggered:   newCount >= 3,
          last_occurrence_at: new Date().toISOString(),
          updated_at:         new Date().toISOString(),
        },
        { onConflict: 'user_id,pain_region' }
      );

    if (error) console.error('[useData] updatePainRecurrence error:', error);
    return { error };
  }

  // ── Exercise Catalog & Protocols (Módulo 8) ─────────────────────────────────

  async function fetchExercises(): Promise<DataResult<ExerciseCatalogItem[]>> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });
    if (error) console.error('[useData] fetchExercises error:', error);
    return { data: data as ExerciseCatalogItem[] | null, error };
  }

  async function saveExercise(
    exercise: Partial<ExerciseCatalogItem>
  ): Promise<MutateResult & { data?: ExerciseCatalogItem }> {
    const { data, error } = await supabase
      .from('exercises')
      .upsert({
        ...exercise,
        updated_at: new Date().toISOString()
      } as any)
      .select()
      .single();
    if (error) {
      console.error('[useData] saveExercise error:', error);
      return { error };
    }
    return { error, data: data as ExerciseCatalogItem };
  }

  async function fetchProtocolsList(): Promise<DataResult<any[]>> {
    const { data, error } = await supabase
      .from('workout_protocols')
      .select('*, protocol_exercises(*)');
    if (error) console.error('[useData] fetchProtocolsList error:', error);
    return { data, error };
  }

  async function simulateVoiceAssistant(query: string, role: string) {
    const normalized = query.toLowerCase();
    let intent = 'unknown';
    let reply = '';
    let parsedData: any = {};
    let filteredExercises: any[] = [];

    if (normalized.includes('alternativa') || normalized.includes('substitu')) {
      intent = 'find_alternative';
      const exerciseMatch = normalized.match(/(?:para|de|do)\s+([a-zA-Z\s\-]+?)(?:\s+sem|\s+com|$)/);
      const originalExercise = (exerciseMatch && exerciseMatch[1]) ? exerciseMatch[1].trim() : 'burpee';
      
      let constraint = 'none';
      if (normalized.includes('sem impacto') || normalized.includes('baixo impacto')) {
        constraint = 'low_impact';
      } else if (normalized.includes('sem ir ao ch') || normalized.includes('não pode ir ao ch') || normalized.includes('fora do ch')) {
        constraint = 'no_floor';
      } else if (normalized.includes('sentado') || normalized.includes('cadeira')) {
        constraint = 'seated';
      }

      parsedData = {
        query_intent: intent,
        original_exercise: originalExercise,
        constraint
      };

      const { data: exercises } = await supabase.from('exercises').select('*');
      const baseExercise = exercises?.find((e: any) => e.name.toLowerCase().includes(originalExercise.toLowerCase()));

      if (baseExercise) {
        let altNames = baseExercise.alternatives || [];
        let candidates = exercises?.filter((e: any) => 
          altNames.some((an: string) => e.name.toLowerCase().includes(an.toLowerCase())) ||
          (e.muscle_group === baseExercise.muscle_group && e.name !== baseExercise.name)
        ) || [];

        if (constraint === 'low_impact') {
          candidates = candidates.filter((c: any) => 
            c.accessibility_tags?.includes('low_impact') || 
            c.name.toLowerCase().includes('jack') || 
            c.name.toLowerCase().includes('marcha') || 
            c.name.toLowerCase().includes('apoio')
          );
        }

        if (candidates.length > 0) {
          filteredExercises = candidates.slice(0, 3);
          reply = `Você pode usar: ${filteredExercises.map(c => c.name).join(', ')}, que atendem à restrição de ${constraint === 'low_impact' ? 'baixo impacto' : constraint} para o exercício ${baseExercise.name}.`;
        } else {
          if (originalExercise.includes('burpee') && constraint === 'low_impact') {
            reply = 'Você pode usar step jack, marcha acelerada no lugar ou agachamento parcial com elevação de braços.';
          } else {
            reply = `Não encontramos alternativas cadastradas com essa restrição específica para ${originalExercise}.`;
          }
        }
      } else {
        if (originalExercise.includes('burpee') && constraint === 'low_impact') {
          reply = 'Você pode usar step jack, marcha acelerada no lugar ou agachamento parcial com elevação de braços.';
        } else {
          reply = `Exercício "${originalExercise}" não encontrado na biblioteca.`;
        }
      }
    } else if (normalized.includes('buscar') || normalized.includes('procure') || normalized.includes('encontre')) {
      intent = 'exercise_search_query';
      let muscle = 'legs';
      if (normalized.includes('posterior') || normalized.includes('isquio')) {
        muscle = 'Legs';
      } else if (normalized.includes('ombro') || normalized.includes('desenvolvimento')) {
        muscle = 'shoulders';
      }
      
      let equip = '';
      if (normalized.includes('halter')) {
        equip = 'halteres';
      } else if (normalized.includes('barra')) {
        equip = 'barbell';
      }

      parsedData = {
        query_intent: intent,
        target_muscle: muscle,
        equipment: equip
      };

      const { data: exercises } = await supabase.from('exercises').select('*');
      filteredExercises = exercises?.filter((e: any) => 
        e.muscle_group.toLowerCase() === muscle.toLowerCase() ||
        e.name.toLowerCase().includes('stiff') || 
        e.name.toLowerCase().includes('posterior')
      ) || [];

      if (equip) {
        filteredExercises = filteredExercises.filter((e: any) => 
          e.name.toLowerCase().includes('dumb') || 
          e.name.toLowerCase().includes('halter') || 
          e.name.toLowerCase().includes('db')
        );
      }

      filteredExercises = filteredExercises.slice(0, 5);
      if (filteredExercises.length > 0) {
        reply = `Encontrei os seguintes exercícios de ${muscle} recomendados: ${filteredExercises.map(e => e.name).join(', ')}.`;
      } else {
        reply = `Não encontrei exercícios com os critérios de busca informados.`;
      }
    } else {
      intent = 'unknown';
      reply = 'Comando de voz não compreendido. Experimente pedir alternativas de exercícios ou fazer uma busca por grupo muscular e equipamentos.';
    }

    return {
      intent,
      reply,
      parsedData,
      exercises: filteredExercises
    };
  }

  return {
    savePhysicalProfile,
    fetchPhysicalProfile,
    saveCheckin,
    logWorkoutSession,
    saveCycleConfig,
    fetchCycleConfig,
    savePreferences,
    fetchPreferences,
    saveProfileV2,
    saveCheckinV2,
    updatePainRecurrence,
    fetchExercises,
    saveExercise,
    fetchProtocolsList,
    simulateVoiceAssistant,
  };
}
