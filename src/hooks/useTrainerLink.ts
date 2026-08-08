import React from 'react';
import { supabase } from '../supabase';

interface UseTrainerLinkResult {
  trainerId:  string | null;
  hasTrainer: boolean;
  loading:    boolean;
}

const cache = new Map<string, string | null>();

export function useTrainerLink(clientId: string | null, revision = 0): UseTrainerLinkResult {
  const [trainerId, setTrainerId] = React.useState<string | null>(null);
  const [loading,   setLoading]   = React.useState(true);

  React.useEffect(() => {
    if (!clientId) { setTrainerId(null); setLoading(false); return; }

    if (cache.has(clientId)) {
      setTrainerId(cache.get(clientId) ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('trainer_clients')
      .select('trainer_id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        const id = data?.trainer_id ?? null;
        cache.set(clientId, id);
        setTrainerId(id);
        setLoading(false);
      });
  }, [clientId, revision]);

  return { trainerId, hasTrainer: trainerId !== null, loading };
}

// Invalidate cache when trainer relationship changes (e.g. after invite acceptance)
export function invalidateTrainerLinkCache(clientId?: string) {
  if (clientId) cache.delete(clientId);
  else cache.clear();
}
