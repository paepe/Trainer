import React from 'react';
import { supabase } from '../supabase';

export interface PlanRow {
  id:           string;
  icon:         string;
  sort_order:   number;
  monthly_cents: number;
  annual_cents:  number;
  monthly_label: string | null;
  annual_label:  string | null;
}

interface RawDef {
  plan_key:   string;
  icon:       string;
  sort_order: number;
}

interface RawPrice {
  plan_key:      string;
  billing_cycle: 'monthly' | 'annual';
  amount_cents:  number;
  label:         string | null;
}

export type PlanPricesMap = Record<string, PlanRow>;

export function usePlanPrices(audience: 'client' | 'trainer'): {
  plans:   PlanRow[];
  loading: boolean;
} {
  const [plans,   setPlans]   = React.useState<PlanRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      supabase
        .from('plan_definitions')
        .select('plan_key, icon, sort_order')
        .eq('audience', audience)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('plan_prices')
        .select('plan_key, billing_cycle, amount_cents, label')
        .eq('currency', 'EUR')
        .eq('is_active', true)
        .is('valid_until', null),
    ]).then(([defRes, priceRes]) => {
      if (cancelled) return;
      if (defRes.error || priceRes.error) { setLoading(false); return; }

      const defs   = (defRes.data   as RawDef[])   ?? [];
      const prices = (priceRes.data as RawPrice[]) ?? [];

      const priceMap = new Map<string, Partial<PlanRow>>();
      for (const p of prices) {
        const entry = priceMap.get(p.plan_key) ?? {};
        if (p.billing_cycle === 'monthly') {
          entry.monthly_cents = p.amount_cents;
          entry.monthly_label = p.label;
        } else {
          entry.annual_cents  = p.amount_cents;
          entry.annual_label  = p.label;
        }
        priceMap.set(p.plan_key, entry);
      }

      const rows: PlanRow[] = defs.map(d => ({
        id:            d.plan_key,
        icon:          d.icon,
        sort_order:    d.sort_order,
        monthly_cents: priceMap.get(d.plan_key)?.monthly_cents ?? 0,
        annual_cents:  priceMap.get(d.plan_key)?.annual_cents  ?? 0,
        monthly_label: priceMap.get(d.plan_key)?.monthly_label ?? null,
        annual_label:  priceMap.get(d.plan_key)?.annual_label  ?? null,
      }));

      setPlans(rows);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [audience]);

  return { plans, loading };
}
