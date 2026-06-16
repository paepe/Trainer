export type FeatureKey =
  | 'scores.basic'
  | 'scores.advanced'
  | 'ai.checkin_adjustment'
  | 'ai.advanced_analysis'
  | 'coach_dna'
  | 'clients.limit'
  | 'studio.branding'
  | 'marketplace.listing'
  | 'marketplace.revenue_share';

export interface FeaturePermission {
  feature_key:  FeatureKey;
  plan_key:     string;
  allowed:      boolean;
  limit_value:  number | null;
}

export interface FeatureAccess {
  allowed:     boolean;
  limitValue:  number | null;
  loading:     boolean;
}
