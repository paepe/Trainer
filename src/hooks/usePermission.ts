import React from 'react';
import { supabase } from '../supabase';
import type { UserRole } from '../types/auth';
import { TRAINER_ROLES } from '../types/auth';

interface ActiveContext {
  active_role: UserRole;
  studio_id:   string | null;
  switched_at: string;
}

interface UsePermissionResult {
  activeRole:     UserRole | null;
  studioId:       string | null;
  hasPermission:  (code: string) => boolean;
  isTrainerRole:  (role?: UserRole | null) => boolean;
  switchContext:  (role: UserRole, studioId?: string | null) => Promise<void>;
  loading:        boolean;
}

const permissionCache = new Map<string, Set<string>>();

async function loadPermissions(role: string): Promise<Set<string>> {
  if (permissionCache.has(role)) return permissionCache.get(role)!;

  const { data } = await supabase
    .from('role_permissions')
    .select('permission_code')
    .eq('role_code', role);

  const set = new Set((data ?? []).map((r: { permission_code: string }) => r.permission_code));
  permissionCache.set(role, set);
  return set;
}

export function usePermission(userId: string | undefined): UsePermissionResult {
  const [ctx, setCtx]    = React.useState<ActiveContext | null>(null);
  const [perms, setPerms] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const uid = userId; // narrowed to string by early-return guard above
    let mounted = true;

    async function init() {
      const { data } = await supabase
        .from('active_context')
        .select('active_role, studio_id, switched_at')
        .eq('user_id', uid)
        .maybeSingle();

      if (!mounted) return;

      if (data) {
        setCtx(data as ActiveContext);
        const p = await loadPermissions(data.active_role);
        if (mounted) { setPerms(p); setLoading(false); }
      } else {
        setLoading(false);
      }
    }

    void init();

    const channel = supabase
      .channel(`active_context:${uid}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'active_context', filter: `user_id=eq.${uid}`,
      }, async (payload) => {
        const updated = payload.new as ActiveContext;
        setCtx(updated);
        const p = await loadPermissions(updated.active_role);
        if (mounted) setPerms(p);
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function switchContext(role: UserRole, studioId?: string | null): Promise<void> {
    if (!userId) return;
    await supabase
      .from('active_context')
      .upsert(
        { user_id: userId, active_role: role, studio_id: studioId ?? null, switched_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    // Realtime subscription handles state update
  }

  return {
    activeRole:    ctx?.active_role ?? null,
    studioId:      ctx?.studio_id   ?? null,
    hasPermission: (code: string) => perms.has(code),
    isTrainerRole: (role?: UserRole | null) =>
      role != null && (TRAINER_ROLES as readonly string[]).includes(role),
    switchContext,
    loading,
  };
}
