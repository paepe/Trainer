import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import type { FeatureKey, FeatureAccess, FeaturePermission } from '../types';

// In-memory cache keyed by plan_key. Avoids redundant network calls within
// the same session — the matrix changes only via server-side migrations.
const permissionCache = new Map<string, FeaturePermission[]>();

async function fetchPermissions(planKey: string): Promise<FeaturePermission[]> {
  if (permissionCache.has(planKey)) return permissionCache.get(planKey)!;

  const { data, error } = await supabase
    .from('feature_permissions')
    .select('feature_key, plan_key, allowed, limit_value')
    .eq('plan_key', planKey);

  if (error) {
    console.error('[useFeatureAccess] fetch error:', error);
    return [];
  }

  const permissions = (data ?? []) as FeaturePermission[];
  permissionCache.set(planKey, permissions);
  return permissions;
}

/**
 * Returns access status for a single feature based on the current user's plan.
 *
 * @param planKey  — current user's plan_key (from useAuth subscription)
 * @param feature  — FeatureKey to check
 * @param override — when true, bypasses the matrix and grants full access
 *                   (used for trainers viewing client data)
 */
export function useFeatureAccess(
  planKey: string | undefined,
  feature: FeatureKey,
  override = false,
): FeatureAccess {
  const [access, setAccess] = useState<FeatureAccess>({
    allowed:    false,
    limitValue: null,
    loading:    true,
  });

  const latestPlanKey = useRef(planKey);
  latestPlanKey.current = planKey;

  useEffect(() => {
    if (override) {
      setAccess({ allowed: true, limitValue: null, loading: false });
      return;
    }

    if (!planKey) {
      setAccess({ allowed: false, limitValue: null, loading: false });
      return;
    }

    let cancelled = false;

    fetchPermissions(planKey).then(permissions => {
      if (cancelled) return;
      const row = permissions.find(p => p.feature_key === feature);
      setAccess({
        allowed:    row?.allowed ?? false,
        limitValue: row?.limit_value ?? null,
        loading:    false,
      });
    });

    return () => { cancelled = true; };
  }, [planKey, feature, override]);

  return access;
}

/**
 * Batch variant — resolves multiple features in a single network call.
 * Returns a map of FeatureKey → FeatureAccess.
 */
export function useFeatureAccessMap(
  planKey: string | undefined,
  features: FeatureKey[],
  override = false,
): Record<string, FeatureAccess> {
  const initial = Object.fromEntries(
    features.map(f => [f, { allowed: false, limitValue: null, loading: true }])
  ) as Record<string, FeatureAccess>;

  const [accessMap, setAccessMap] = useState<Record<string, FeatureAccess>>(initial);

  useEffect(() => {
    if (override) {
      setAccessMap(Object.fromEntries(
        features.map(f => [f, { allowed: true, limitValue: null, loading: false }])
      ));
      return;
    }

    if (!planKey) {
      setAccessMap(Object.fromEntries(
        features.map(f => [f, { allowed: false, limitValue: null, loading: false }])
      ));
      return;
    }

    let cancelled = false;

    fetchPermissions(planKey).then(permissions => {
      if (cancelled) return;
      const map: Record<string, FeatureAccess> = {};
      for (const f of features) {
        const row = permissions.find(p => p.feature_key === f);
        map[f] = {
          allowed:    row?.allowed ?? false,
          limitValue: row?.limit_value ?? null,
          loading:    false,
        };
      }
      setAccessMap(map);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey, features.join(','), override]);

  return accessMap;
}

/** Clears the in-memory cache (call on sign-out or plan upgrade). */
export function clearFeaturePermissionCache(): void {
  permissionCache.clear();
}
