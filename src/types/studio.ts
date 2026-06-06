import type { FitnessLevel, LocationType } from './workout';

export interface Studio {
  id:         string;
  name:       string;
  owner_id:   string;
  created_at: string;
}

export interface StudioMemberProfile {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

export interface StudioMember {
  id:         string;
  studio_id:  string;
  user_id:    string;
  role:       'trainer' | 'admin';
  created_at: string;
  profile:    StudioMemberProfile | null;
}

export interface ProtocolExercise {
  id:            string;
  protocol_id:   string;
  exercise_name: string;
  sets:          number;
  reps:          number;
  load_kg:       number | null;
  rest_seconds:  number;
  notes?:        string;
  muscle_group?: string;
  order_index?:  number;
}

export interface Protocol {
  id:                string;
  studio_id:         string;
  created_by:        string;
  name:              string;
  objective:         string | null;
  level:             FitnessLevel | null;
  duration_minutes:  number | null;
  description:       string | null;
  contraindications: string[] | null;
  tags:              string[] | null;
  created_at:        string;
  exercises:         Pick<ProtocolExercise, 'id'>[];
}

export interface ClientProfile {
  id:    string;
  name:  string;
  email: string;
}

export interface ClientPhysical {
  user_id:              string;
  primary_goal:         string | null;
  fitness_level:        FitnessLevel | null;
  available_minutes:    number | null;
  location_preference:  LocationType | null;
}

export interface TrainerClient {
  id:         string;
  status:     'active' | 'inactive' | 'pending';
  trainer_id: string;
  client:     ClientProfile | null;
  trainer:    StudioMemberProfile | null;
  physical:   ClientPhysical | null;
}

export interface StudioStats {
  clients:           number;
  trainers:          number;
  plansThisWeek:     number;
  completedThisWeek: number;
}

export interface CreateProtocolPayload {
  name:              string;
  objective:         string | null;
  level:             FitnessLevel | null;
  duration_minutes:  number | null;
  description:       string | null;
  contraindications: string[] | null;
  tags:              string[] | null;
}
