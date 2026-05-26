import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import type {
  Studio,
  StudioMember,
  Protocol,
  TrainerClient,
  StudioStats,
  CreateProtocolPayload,
  ProtocolExercise,
} from '../../types';

interface MutateResult      { error: unknown }
interface CreateStudioResult { data: Studio | null; error: unknown }
interface CreateProtocolResult { protocol: Protocol | null; error: unknown }

export function useStudioData(userId: string | undefined) {
  const [studio,    setStudio]    = useState<Studio | null>(null);
  const [members,   setMembers]   = useState<StudioMember[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [clients,   setClients]   = useState<TrainerClient[]>([]);
  const [stats,     setStats]     = useState<StudioStats>({
    clients: 0, trainers: 0, plansThisWeek: 0, completedThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    void loadAll(userId);
  }, [userId]);

  async function loadAll(uid: string): Promise<void> {
    setLoading(true);

    const { data: studioData, error: studioErr } = await supabase
      .from('studios')
      .select('*')
      .eq('owner_id', uid)
      .maybeSingle();
    if (studioErr) console.error('[useStudioData] studios fetch error:', studioErr);

    if (!studioData) { setStudio(null); setLoading(false); return; }
    setStudio(studioData as Studio);

    const [membersRes, protocolsRes] = await Promise.all([
      supabase
        .from('studio_members')
        .select('*, profile:profiles!studio_members_user_id_fkey(id, name, email, role)')
        .eq('studio_id', studioData.id),
      supabase
        .from('workout_protocols')
        .select('*, exercises:protocol_exercises(id)')
        .eq('studio_id', studioData.id)
        .order('created_at', { ascending: false }),
    ]);
    if (membersRes.error)   console.error('[useStudioData] members error:',   membersRes.error);
    if (protocolsRes.error) console.error('[useStudioData] protocols error:', protocolsRes.error);

    const memberList   = (membersRes.data   || []) as StudioMember[];
    const protocolList = (protocolsRes.data || []) as Protocol[];
    setMembers(memberList);
    setProtocols(protocolList);

    const trainerIds = memberList.map(m => m.user_id);
    if (trainerIds.length > 0) {
      const { data: tcRows, error: tcErr } = await supabase
        .from('trainer_clients')
        .select('id, status, trainer_id, client_id')
        .in('trainer_id', trainerIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (tcErr) console.error('[useStudioData] trainer_clients error:', tcErr);

      if (tcRows && tcRows.length > 0) {
        const clientIds = [...new Set(tcRows.map(r => r.client_id as string))];

        const [profRes, physRes] = await Promise.all([
          supabase.from('profiles').select('id, name, email').in('id', clientIds),
          supabase.from('profile_v2')
            .select('user_id, objectives, movement_history, availability, environment')
            .in('user_id', clientIds),
        ]);
        if (profRes.error) console.error('[useStudioData] profiles error:', profRes.error);
        if (physRes.error) console.error('[useStudioData] profile_v2 error:', physRes.error);

        const profMap = Object.fromEntries((profRes.data || []).map(p => [p.id, p]));
        const physMap = Object.fromEntries((physRes.data || []).map(p => {
          const pv2 = p as {
            user_id:          string;
            objectives?:      { primary_goal?: string }   | null;
            movement_history?: { fitness_level?: string } | null;
            availability?:    { session_duration_min?: number } | null;
            environment?:     { locations?: string[] }    | null;
          };
          return [pv2.user_id, {
            user_id:             pv2.user_id,
            primary_goal:        pv2.objectives?.primary_goal              ?? null,
            fitness_level:       pv2.movement_history?.fitness_level       ?? null,
            available_minutes:   pv2.availability?.session_duration_min    ?? null,
            location_preference: (pv2.environment?.locations?.[0]         ?? null) as string | null,
          }];
        }));
        const trMap   = Object.fromEntries(memberList.map(m => [m.user_id, m.profile]));

        setClients(tcRows.map(tc => ({
          id:         tc.id as string,
          status:     tc.status as 'active' | 'inactive',
          trainer_id: tc.trainer_id as string,
          client:     (profMap[tc.client_id as string]  || null) as TrainerClient['client'],
          trainer:    (trMap[tc.trainer_id as string]   || null) as TrainerClient['trainer'],
          physical:   (physMap[tc.client_id as string]  || null) as TrainerClient['physical'],
        })));
      } else {
        setClients([]);
      }

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [clientsRes, plansRes, sessionsRes] = await Promise.all([
        supabase.from('trainer_clients').select('*', { count: 'exact', head: true })
          .in('trainer_id', trainerIds).eq('status', 'active'),
        supabase.from('workout_plans').select('*', { count: 'exact', head: true })
          .in('created_by', trainerIds)
          .in('status', ['sent', 'active', 'completed'])
          .gte('created_at', weekAgo),
        supabase.from('workout_sessions').select('*', { count: 'exact', head: true })
          .not('completed_at', 'is', null)
          .gte('completed_at', weekAgo),
      ]);
      setStats({
        clients:           clientsRes.count   || 0,
        trainers:          memberList.length,
        plansThisWeek:     plansRes.count      || 0,
        completedThisWeek: sessionsRes.count   || 0,
      });
    } else {
      setClients([]);
      setStats({ clients: 0, trainers: 0, plansThisWeek: 0, completedThisWeek: 0 });
    }

    setLoading(false);
  }

  async function createStudio(name: string): Promise<CreateStudioResult> {
    if (!userId) return { data: null, error: new Error('No userId') };
    const { data, error } = await supabase
      .from('studios')
      .insert({ name, owner_id: userId })
      .select()
      .single();
    if (error) console.error('[useStudioData] createStudio error:', error);
    else void loadAll(userId);
    return { data: data as Studio | null, error };
  }

  async function inviteTrainer(email: string): Promise<MutateResult> {
    if (!studio || !userId) return { error: new Error('Studio not loaded') };
    const { data: found, error: findErr } = await supabase
      .from('profiles').select('id').eq('email', email).maybeSingle();
    if (findErr) console.error('[useStudioData] inviteTrainer lookup error:', findErr);
    if (findErr || !found) return { error: new Error('No account found with that email.') };

    const { error } = await supabase
      .from('studio_members')
      .insert({ studio_id: studio.id, user_id: found.id, role: 'trainer' });
    if (error) { console.error('[useStudioData] inviteTrainer insert error:', error); return { error }; }

    await supabase.from('profiles').update({ role: 'studio_trainer' }).eq('id', found.id);
    void loadAll(userId);
    return { error: null };
  }

  async function removeMember(memberId: string): Promise<void> {
    if (!userId) return;
    const { error } = await supabase.from('studio_members').delete().eq('id', memberId);
    if (error) console.error('[useStudioData] removeMember error:', error);
    void loadAll(userId);
  }

  async function createProtocol(payload: CreateProtocolPayload): Promise<CreateProtocolResult> {
    if (!studio || !userId) return { protocol: null, error: new Error('Studio not loaded') };
    const { data: protocol, error } = await supabase
      .from('workout_protocols')
      .insert({ studio_id: studio.id, created_by: userId, ...payload })
      .select()
      .single();
    if (error) console.error('[useStudioData] createProtocol error:', error);
    else void loadAll(userId);
    return { protocol: protocol as Protocol | null, error };
  }

  async function addProtocolExercise(
    protocolId: string,
    exercise: Omit<ProtocolExercise, 'id' | 'protocol_id'>
  ): Promise<MutateResult> {
    if (!userId) return { error: null };
    const { error } = await supabase
      .from('protocol_exercises')
      .insert({ protocol_id: protocolId, ...exercise });
    if (error) console.error('[useStudioData] addProtocolExercise error:', error);
    else void loadAll(userId);
    return { error };
  }

  async function deleteProtocol(protocolId: string): Promise<void> {
    if (!userId) return;
    const { error } = await supabase.from('workout_protocols').delete().eq('id', protocolId);
    if (error) console.error('[useStudioData] deleteProtocol error:', error);
    void loadAll(userId);
  }

  return {
    studio, members, protocols, clients, stats, loading,
    createStudio, inviteTrainer, removeMember,
    createProtocol, addProtocolExercise, deleteProtocol,
    reload: () => userId ? loadAll(userId) : Promise.resolve(),
  };
}
