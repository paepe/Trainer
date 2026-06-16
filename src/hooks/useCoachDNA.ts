import { supabase } from '../supabase';
import type { CoachDNARow, CoachDNAStep, CoachDNAUpsert } from '../types/coach-dna';

export function useCoachDNA(trainerId: string | undefined) {

  async function fetchCoachDNA(): Promise<{ data: CoachDNARow | null; error: unknown }> {
    if (!trainerId) return { data: null, error: null };
    const { data, error } = await supabase
      .from('coach_dna')
      .select('*')
      .eq('trainer_id', trainerId)
      .single();
    // PGRST116 = no rows found — not an error, just first access
    if (error && (error as { code?: string }).code !== 'PGRST116') {
      console.error('[useCoachDNA] fetchCoachDNA:', error);
    }
    return {
      data: (data as CoachDNARow) ?? null,
      error: (error as { code?: string } | null)?.code === 'PGRST116' ? null : error,
    };
  }

  async function saveCoachDNA(
    updates: CoachDNAUpsert,
    step?: CoachDNAStep,
  ): Promise<{ error: unknown }> {
    if (!trainerId) return { error: null };
    const payload: CoachDNAUpsert & { trainer_id: string } = {
      trainer_id: trainerId,
      ...updates,
      ...(step ? { current_step: step } : {}),
    };
    // CoachDNA sub-types (CoachDNAAudience, etc.) are stricter than Supabase's Json — cast at boundary only.
    const { error } = await supabase
      .from('coach_dna')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(payload as any, { onConflict: 'trainer_id' });
    if (error) console.error('[useCoachDNA] saveCoachDNA:', error);
    return { error };
  }

  async function activateCoachDNA(): Promise<{ error: unknown }> {
    return saveCoachDNA(
      { dna_active: true, completed_at: new Date().toISOString() },
      'completed',
    );
  }

  return { fetchCoachDNA, saveCoachDNA, activateCoachDNA };
}
