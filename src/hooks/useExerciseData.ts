import { supabase } from '../supabase';
import type { ExerciseCatalogItem } from '../types';

interface DataResult<T>  { data: T | null; error: unknown }
interface MutateResult   { error: unknown }

export function useExerciseData() {

  async function fetchExercises(): Promise<DataResult<ExerciseCatalogItem[]>> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });
    if (error) console.error('[useExerciseData] fetchExercises:', error);
    return { data: data as ExerciseCatalogItem[] | null, error };
  }

  async function saveExercise(
    exercise: Partial<ExerciseCatalogItem>
  ): Promise<MutateResult & { data?: ExerciseCatalogItem }> {
    const { data, error } = await supabase
      .from('exercises')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ ...exercise, updated_at: new Date().toISOString() } as any)
      .select()
      .single();
    if (error) { console.error('[useExerciseData] saveExercise:', error); return { error }; }
    return { error, data: data as ExerciseCatalogItem };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function fetchProtocolsList(): Promise<DataResult<any[]>> {
    const { data, error } = await supabase
      .from('workout_protocols')
      .select('*, protocol_exercises(*)');
    if (error) console.error('[useExerciseData] fetchProtocolsList:', error);
    return { data, error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function simulateVoiceAssistant(query: string, _role: string): Promise<{ intent: string; reply: string; parsedData: any; exercises: any[] }> {
    const normalized = query.toLowerCase();
    let intent = 'unknown';
    let reply  = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedData: any = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filteredExercises: any[] = [];

    if (normalized.includes('alternativa') || normalized.includes('substitu')) {
      intent = 'find_alternative';
      const exerciseMatch = normalized.match(/(?:para|de|do)\s+([a-zA-Z\s\-]+?)(?:\s+sem|\s+com|$)/);
      const originalExercise = exerciseMatch?.[1]?.trim() ?? 'burpee';
      let constraint = 'none';
      if (normalized.includes('sem impacto') || normalized.includes('baixo impacto')) constraint = 'low_impact';
      else if (normalized.includes('sem ir ao ch') || normalized.includes('fora do ch'))  constraint = 'no_floor';
      else if (normalized.includes('sentado') || normalized.includes('cadeira'))           constraint = 'seated';

      parsedData = { query_intent: intent, original_exercise: originalExercise, constraint };

      const { data: exercises } = await supabase.from('exercises').select('*');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const base = exercises?.find((e: any) => e.name.toLowerCase().includes(originalExercise.toLowerCase()));
      if (base) {
        const altNames: string[] = base.alternatives || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let candidates = exercises?.filter((e: any) =>
          altNames.some((an: string) => e.name.toLowerCase().includes(an.toLowerCase())) ||
          (e.muscle_group === base.muscle_group && e.name !== base.name)
        ) ?? [];
        if (constraint === 'low_impact') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          candidates = candidates.filter((c: any) =>
            c.accessibility_tags?.includes('low_impact') ||
            c.name.toLowerCase().includes('jack') ||
            c.name.toLowerCase().includes('marcha') ||
            c.name.toLowerCase().includes('apoio')
          );
        }
        filteredExercises = candidates.slice(0, 3);
        reply = filteredExercises.length > 0
          ? `You can use: ${filteredExercises.map((c: { name: string }) => c.name).join(', ')}.`
          : originalExercise.includes('burpee') && constraint === 'low_impact'
            ? 'You can use step jacks, brisk marching in place, or partial squats with arm raises.'
          : `We found no registered alternatives with that specific restriction for ${originalExercise}.`;
      } else {
        reply = originalExercise.includes('burpee') && constraint === 'low_impact'
        ? 'You can use step jacks, brisk marching in place, or partial squats with arm raises.'
        : `Exercise "${originalExercise}" not found in the library.`;
      }

    } else if (normalized.includes('buscar') || normalized.includes('procure') || normalized.includes('search') || normalized.includes('find')) {
      intent = 'exercise_search_query';
      let muscle = normalized.includes('posterior') || normalized.includes('isquio') || normalized.includes('hamstring') ? 'Legs'
        : normalized.includes('ombro') || normalized.includes('desenvolvimento') || normalized.includes('shoulder') ? 'shoulders'
        : 'legs';
      const equip = normalized.includes('halter') || normalized.includes('dumbbell') ? 'halteres' : normalized.includes('barra') || normalized.includes('barbell') ? 'barbell' : '';

      parsedData = { query_intent: intent, target_muscle: muscle, equipment: equip };
      const { data: exercises } = await supabase.from('exercises').select('*');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filteredExercises = (exercises ?? []).filter((e: any) =>
        e.muscle_group.toLowerCase() === muscle.toLowerCase() ||
        e.name.toLowerCase().includes('stiff') ||
        e.name.toLowerCase().includes('posterior')
      );
      if (equip) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filteredExercises = filteredExercises.filter((e: any) =>
          e.name.toLowerCase().includes('dumb') || e.name.toLowerCase().includes('halter') || e.name.toLowerCase().includes('db')
        );
      }
      filteredExercises = filteredExercises.slice(0, 5);
      reply = filteredExercises.length > 0
        ? `I found the following ${muscle} exercises: ${filteredExercises.map((e: { name: string }) => e.name).join(', ')}.`
        : 'No exercises found with the given search criteria.';
    } else {
      reply = 'Voice command not understood. Try asking for exercise alternatives or searching by muscle group and equipment.';
    }

    return { intent, reply, parsedData, exercises: filteredExercises };
  }

  return { fetchExercises, saveExercise, fetchProtocolsList, simulateVoiceAssistant };
}
