export type UserRole =
  | 'client'
  | 'trainer'
  | 'studio_admin'
  | 'studio_trainer'
  | 'internal_trainer'
  | 'technical_coordinator'
  | 'studio_manager'
  | 'finance'
  | 'moderator'
  | 'ai_system';

export const TRAINER_ROLES: readonly UserRole[] = [
  'trainer', 'studio_trainer', 'studio_admin',
  'internal_trainer', 'technical_coordinator', 'studio_manager',
] as const;

export interface Profile {
  id:         string;
  name:       string;
  email:      string;
  phone:      string;
  dob:        string;
  location:   string;
  gender:     'male' | 'female' | 'non-binary' | 'prefer_not_to_say' | '';
  role:       UserRole;
  avatar_url: string | null;
  created_at: string;
}

/** Shared navigation function — eliminates implicit `any` on nav payloads */
export type NavFn = (screen: string, payload?: Record<string, unknown>) => void;

export type PlanKey = 'free' | 'ai_fitness' | 'ai_performance' | 'trial' | 'pro' | 'elite';

export interface Subscription {
  plan_key:           PlanKey;
  status:             'active' | 'trialing' | 'canceled' | 'past_due';
  billing_cycle:      'monthly' | 'annual' | null;
  current_period_end: string | null;
}
