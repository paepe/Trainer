import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useRealtimeTable } from './useRealtimeTable';
import type { TrainerAlert, OperationalTask } from '../types/workout';

interface UseAlertsResult {
  alerts:            TrainerAlert[];
  tasks:             OperationalTask[];
  loading:           boolean;
  acknowledgeAlert:  (id: string) => Promise<void>;
  resolveAlert:      (id: string) => Promise<void>;
  completeTask:      (id: string) => Promise<void>;
  reload:            () => void;
}

export function useAlerts(trainerId: string | undefined): UseAlertsResult {
  const [alerts,  setAlerts]  = useState<TrainerAlert[]>([]);
  const [tasks,   setTasks]   = useState<OperationalTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!trainerId) return;
    setLoading(true);

    const [alertsRes, tasksRes] = await Promise.all([
      supabase
        .from('trainer_alerts')
        .select('*')
        .eq('trainer_id', trainerId)
        .in('status', ['open', 'acknowledged'])
        .order('created_at', { ascending: false }),
      supabase
        .from('operational_tasks')
        .select('*')
        .eq('trainer_id', trainerId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false }),
    ]);

    if (alertsRes.error) console.error('[useAlerts] alerts error:', alertsRes.error);
    if (tasksRes.error)  console.error('[useAlerts] tasks error:',  tasksRes.error);

    setAlerts((alertsRes.data ?? []) as TrainerAlert[]);
    setTasks((tasksRes.data ?? []) as OperationalTask[]);
    setLoading(false);
  }, [trainerId]);

  useEffect(() => { void load(); }, [load]);

  // Live subscriptions — auto-reload when alerts or tasks change for this trainer
  useRealtimeTable(
    'trainer_alerts',
    trainerId ? { column: 'trainer_id', value: trainerId } : null,
    () => { void load(); },
    !!trainerId,
  );
  useRealtimeTable(
    'operational_tasks',
    trainerId ? { column: 'trainer_id', value: trainerId } : null,
    () => { void load(); },
    !!trainerId,
  );

  async function acknowledgeAlert(id: string): Promise<void> {
    const { error } = await supabase
      .from('trainer_alerts')
      .update({ status: 'acknowledged' })
      .eq('id', id);
    if (error) console.error('[useAlerts] acknowledgeAlert error:', error);
    else setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
  }

  async function resolveAlert(id: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('trainer_alerts')
      .update({ status: 'resolved', resolved_at: now })
      .eq('id', id);
    if (error) console.error('[useAlerts] resolveAlert error:', error);
    else setAlerts(prev => prev.filter(a => a.id !== id));
  }

  async function completeTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('operational_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.error('[useAlerts] completeTask error:', error);
    else setTasks(prev => prev.filter(t => t.id !== id));
  }

  return {
    alerts, tasks, loading,
    acknowledgeAlert, resolveAlert, completeTask,
    reload: () => { void load(); },
  };
}
