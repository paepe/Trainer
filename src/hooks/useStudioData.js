import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export function useStudioData(userId) {
  const [studio, setStudio] = useState(null);
  const [members, setMembers] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({ clients: 0, trainers: 0, plansThisWeek: 0, completedThisWeek: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadAll(userId);
  }, [userId]);

  async function loadAll(uid) {
    setLoading(true);
    const ownerId = uid || userId;

    const { data: studioData } = await supabase
      .from('studios')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (!studioData) { setStudio(null); setLoading(false); return; }
    setStudio(studioData);

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

    const memberList = membersRes.data || [];
    const protocolList = protocolsRes.data || [];
    setMembers(memberList);
    setProtocols(protocolList);

    const trainerIds = memberList.map(m => m.user_id);
    if (trainerIds.length > 0) {
      // Fetch full client list with profile + physical_profile + trainer name
      const { data: clientRows } = await supabase
        .from('trainer_clients')
        .select(`
          id, status, trainer_id,
          client:profiles!trainer_clients_client_id_fkey(id, name, email),
          trainer:profiles!trainer_clients_trainer_id_fkey(id, name),
          physical:physical_profiles(primary_goal, fitness_level, available_minutes, location_preference)
        `)
        .in('trainer_id', trainerIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setClients(clientRows || []);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [clientsRes, plansRes, sessionsRes] = await Promise.all([
        // Active clients: unique clients linked to this studio's trainers
        supabase.from('trainer_clients').select('*', { count: 'exact', head: true })
          .in('trainer_id', trainerIds).eq('status', 'active'),
        // Plans sent this week: plans created by this studio's trainers
        supabase.from('workout_plans').select('*', { count: 'exact', head: true })
          .in('created_by', trainerIds)
          .in('status', ['sent', 'active', 'completed'])
          .gte('created_at', weekAgo),
        // Completed this week: workout sessions logged by clients this week
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

  async function createStudio(name) {
    const { data, error } = await supabase
      .from('studios')
      .insert({ name, owner_id: userId })
      .select()
      .single();
    if (!error) await loadAll(userId);
    return { data, error };
  }

  async function inviteTrainer(email) {
    const { data: found, error: findErr } = await supabase
      .from('profiles').select('id').eq('email', email).maybeSingle();
    if (findErr || !found) return { error: new Error('No account found with that email.') };

    const { error } = await supabase
      .from('studio_members')
      .insert({ studio_id: studio.id, user_id: found.id, role: 'trainer' });
    if (error) return { error };

    await supabase.from('profiles').update({ role: 'studio_trainer' }).eq('id', found.id);
    await loadAll(userId);
    return { error: null };
  }

  async function removeMember(memberId) {
    await supabase.from('studio_members').delete().eq('id', memberId);
    await loadAll(userId);
  }

  async function createProtocol({ name, objective, level, duration_minutes, description, contraindications, tags }) {
    const { data: protocol, error } = await supabase
      .from('workout_protocols')
      .insert({ studio_id: studio.id, created_by: userId, name, objective, level, duration_minutes, description, contraindications, tags })
      .select().single();
    if (!error) await loadAll(userId);
    return { protocol, error };
  }

  async function addProtocolExercise(protocolId, exercise) {
    const { error } = await supabase.from('protocol_exercises').insert({ protocol_id: protocolId, ...exercise });
    if (!error) await loadAll(userId);
    return { error };
  }

  async function deleteProtocol(protocolId) {
    await supabase.from('workout_protocols').delete().eq('id', protocolId);
    await loadAll(userId);
  }

  return {
    studio, members, protocols, clients, stats, loading,
    createStudio, inviteTrainer, removeMember,
    createProtocol, addProtocolExercise, deleteProtocol,
    reload: () => loadAll(userId),
  };
}
