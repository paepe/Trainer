export type UserRole =
  | 'client'
  | 'trainer'
  | 'studio_admin'
  | 'studio_trainer';

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
