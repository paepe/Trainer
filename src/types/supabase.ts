export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      active_context: {
        Row: {
          active_role: string
          studio_id: string | null
          switched_at: string
          user_id: string
        }
        Insert: {
          active_role: string
          studio_id?: string | null
          switched_at?: string
          user_id: string
        }
        Update: {
          active_role?: string
          studio_id?: string | null
          switched_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_context_active_role_fkey"
            columns: ["active_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "active_context_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_context_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          accepted: boolean | null
          checkin_id: string | null
          context: Json | null
          created_at: string | null
          id: string
          modified: boolean | null
          plan_id: string | null
          suggestion: string | null
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          checkin_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          modified?: boolean | null
          plan_id?: string | null
          suggestion?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          checkin_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          modified?: boolean | null
          plan_id?: string | null
          suggestion?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          actor_role: string
          created_at: string
          id: string
          metadata: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_role: string
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_prontidao: {
        Row: {
          ai_led_blocked: boolean | null
          available_minutes: number | null
          created_at: string | null
          detailed_data: Json | null
          energy_level: number | null
          fatigue_level: number | null
          id: string
          input_source: string
          occurred_at: string | null
          pain_intensity: number | null
          pain_present: boolean | null
          post_workout_data: Json | null
          quick_data: Json | null
          readiness_score: number | null
          safety_gate: Json | null
          sleep_quality: string | null
          training_location: string | null
          user_id: string
          variant: string
          voice_data: Json | null
        }
        Insert: {
          ai_led_blocked?: boolean | null
          available_minutes?: number | null
          created_at?: string | null
          detailed_data?: Json | null
          energy_level?: number | null
          fatigue_level?: number | null
          id?: string
          input_source?: string
          occurred_at?: string | null
          pain_intensity?: number | null
          pain_present?: boolean | null
          post_workout_data?: Json | null
          quick_data?: Json | null
          readiness_score?: number | null
          safety_gate?: Json | null
          sleep_quality?: string | null
          training_location?: string | null
          user_id: string
          variant: string
          voice_data?: Json | null
        }
        Update: {
          ai_led_blocked?: boolean | null
          available_minutes?: number | null
          created_at?: string | null
          detailed_data?: Json | null
          energy_level?: number | null
          fatigue_level?: number | null
          id?: string
          input_source?: string
          occurred_at?: string | null
          pain_intensity?: number | null
          pain_present?: boolean | null
          post_workout_data?: Json | null
          quick_data?: Json | null
          readiness_score?: number | null
          safety_gate?: Json | null
          sleep_quality?: string | null
          training_location?: string | null
          user_id?: string
          variant?: string
          voice_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_prontidao_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          available_minutes: number | null
          created_at: string | null
          date: string | null
          energy: number | null
          equipment: string[] | null
          goal: string | null
          id: string
          location: string | null
          minutes: number | null
          sleep_quality: string | null
          soreness: string[] | null
          user_id: string | null
        }
        Insert: {
          available_minutes?: number | null
          created_at?: string | null
          date?: string | null
          energy?: number | null
          equipment?: string[] | null
          goal?: string | null
          id?: string
          location?: string | null
          minutes?: number | null
          sleep_quality?: string | null
          soreness?: string[] | null
          user_id?: string | null
        }
        Update: {
          available_minutes?: number | null
          created_at?: string | null
          date?: string | null
          energy?: number | null
          equipment?: string[] | null
          goal?: string | null
          id?: string
          location?: string | null
          minutes?: number | null
          sleep_quality?: string | null
          soreness?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_risk_signals: {
        Row: {
          computed_at: string | null
          id: string
          reasons: string[] | null
          risk_score: number
          user_id: string
        }
        Insert: {
          computed_at?: string | null
          id?: string
          reasons?: string[] | null
          risk_score?: number
          user_id: string
        }
        Update: {
          computed_at?: string | null
          id?: string
          reasons?: string[] | null
          risk_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "churn_risk_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_dna: {
        Row: {
          archetype: string | null
          audience: Json | null
          background: Json | null
          completed_at: string | null
          created_at: string
          current_step: string
          design: Json | null
          dna_active: boolean
          dna_principles: Json | null
          dna_style: Json | null
          exercises: Json | null
          fitness: Json | null
          focus: Json | null
          id: string
          identity: Json | null
          philosophy: Json | null
          structure: Json | null
          trainer_id: string
          training: Json | null
          updated_at: string
        }
        Insert: {
          archetype?: string | null
          audience?: Json | null
          background?: Json | null
          completed_at?: string | null
          created_at?: string
          current_step?: string
          design?: Json | null
          dna_active?: boolean
          dna_principles?: Json | null
          dna_style?: Json | null
          exercises?: Json | null
          fitness?: Json | null
          focus?: Json | null
          id?: string
          identity?: Json | null
          philosophy?: Json | null
          structure?: Json | null
          trainer_id: string
          training?: Json | null
          updated_at?: string
        }
        Update: {
          archetype?: string | null
          audience?: Json | null
          background?: Json | null
          completed_at?: string | null
          created_at?: string
          current_step?: string
          design?: Json | null
          dna_active?: boolean
          dna_principles?: Json | null
          dna_style?: Json | null
          exercises?: Json | null
          fitness?: Json | null
          focus?: Json | null
          id?: string
          identity?: Json | null
          philosophy?: Json | null
          structure?: Json | null
          trainer_id?: string
          training?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_dna_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_config: {
        Row: {
          cycle_length: number | null
          id: string
          last_start_date: string | null
          period_length: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cycle_length?: number | null
          id?: string
          last_start_date?: string | null
          period_length?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cycle_length?: number | null
          id?: string
          last_start_date?: string | null
          period_length?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          accessibility_tags: string[] | null
          alternatives: string[] | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          equipment: string[] | null
          id: string
          level: string
          movement_pattern: string | null
          muscle_group: string
          name: string
          relative_risk_regions: string[] | null
          restrictions: string[] | null
          short_instruction: string | null
          status: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          accessibility_tags?: string[] | null
          alternatives?: string[] | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          equipment?: string[] | null
          id?: string
          level: string
          movement_pattern?: string | null
          muscle_group: string
          name: string
          relative_risk_regions?: string[] | null
          restrictions?: string[] | null
          short_instruction?: string | null
          status?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          accessibility_tags?: string[] | null
          alternatives?: string[] | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          equipment?: string[] | null
          id?: string
          level?: string
          movement_pattern?: string | null
          muscle_group?: string
          name?: string
          relative_risk_regions?: string[] | null
          restrictions?: string[] | null
          short_instruction?: string | null
          status?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      masked_operational_contexts: {
        Row: {
          context_token: string
          created_at: string
          expires_at: string
          id: string
          purpose: string
          requested_by: string
          resolved_user_id: string
        }
        Insert: {
          context_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose: string
          requested_by: string
          resolved_user_id: string
        }
        Update: {
          context_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          requested_by?: string
          resolved_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "masked_operational_contexts_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masked_operational_contexts_resolved_user_id_fkey"
            columns: ["resolved_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          from_user_id: string | null
          id: string
          params: Json | null
          read_at: string | null
          response: string | null
          response_at: string | null
          template_key: string | null
          title: string
          to_user_id: string
          type: string | null
        }
        Insert: {
          body: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          from_user_id?: string | null
          id?: string
          params?: Json | null
          read_at?: string | null
          response?: string | null
          response_at?: string | null
          template_key?: string | null
          title: string
          to_user_id: string
          type?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          from_user_id?: string | null
          id?: string
          params?: Json | null
          read_at?: string | null
          response?: string | null
          response_at?: string | null
          template_key?: string | null
          title?: string
          to_user_id?: string
          type?: string | null
        }
        Relationships: []
      }
      operational_tasks: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          params: Json | null
          priority: string
          related_alert_id: string | null
          related_session_id: string | null
          status: string
          task_type: string
          template_key: string | null
          title: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          params?: Json | null
          priority?: string
          related_alert_id?: string | null
          related_session_id?: string | null
          status?: string
          task_type: string
          template_key?: string | null
          title: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          params?: Json | null
          priority?: string
          related_alert_id?: string | null
          related_session_id?: string | null
          status?: string
          task_type?: string
          template_key?: string | null
          title?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_tasks_related_alert_id_fkey"
            columns: ["related_alert_id"]
            isOneToOne: false
            referencedRelation: "trainer_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_tasks_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_recurrence_signals: {
        Row: {
          alert_triggered: boolean | null
          created_at: string | null
          id: string
          last_occurrence_at: string | null
          occurrence_count: number
          pain_region: string
          updated_at: string | null
          user_id: string
          window_days: number
        }
        Insert: {
          alert_triggered?: boolean | null
          created_at?: string | null
          id?: string
          last_occurrence_at?: string | null
          occurrence_count?: number
          pain_region: string
          updated_at?: string | null
          user_id: string
          window_days?: number
        }
        Update: {
          alert_triggered?: boolean | null
          created_at?: string | null
          id?: string
          last_occurrence_at?: string | null
          occurrence_count?: number
          pain_region?: string
          updated_at?: string | null
          user_id?: string
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "pain_recurrence_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string
          privacy_tier: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          privacy_tier?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          privacy_tier?: string
        }
        Relationships: []
      }
      physical_profiles: {
        Row: {
          available_minutes: number | null
          birth_year: number | null
          equipment: string[] | null
          fitness_level: string | null
          height_cm: number | null
          id: string
          location_preference: string | null
          primary_goal: string | null
          restrictions: string[] | null
          secondary_goals: string[] | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          available_minutes?: number | null
          birth_year?: number | null
          equipment?: string[] | null
          fitness_level?: string | null
          height_cm?: number | null
          id?: string
          location_preference?: string | null
          primary_goal?: string | null
          restrictions?: string[] | null
          secondary_goals?: string[] | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          available_minutes?: number | null
          birth_year?: number | null
          equipment?: string[] | null
          fitness_level?: string | null
          height_cm?: number | null
          id?: string
          location_preference?: string | null
          primary_goal?: string | null
          restrictions?: string[] | null
          secondary_goals?: string[] | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "physical_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_exercises: {
        Row: {
          actual_load_kg: number | null
          actual_reps: number | null
          actual_sets: number | null
          alternative_exercise: string | null
          completed: boolean | null
          duration_seconds: number | null
          exercise_name: string
          id: string
          intensity: string | null
          load_kg: number | null
          muscle_group: string | null
          notes: string | null
          order_index: number
          plan_id: string
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          video_url: string | null
        }
        Insert: {
          actual_load_kg?: number | null
          actual_reps?: number | null
          actual_sets?: number | null
          alternative_exercise?: string | null
          completed?: boolean | null
          duration_seconds?: number | null
          exercise_name: string
          id?: string
          intensity?: string | null
          load_kg?: number | null
          muscle_group?: string | null
          notes?: string | null
          order_index?: number
          plan_id: string
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          video_url?: string | null
        }
        Update: {
          actual_load_kg?: number | null
          actual_reps?: number | null
          actual_sets?: number | null
          alternative_exercise?: string | null
          completed?: boolean | null
          duration_seconds?: number | null
          exercise_name?: string
          id?: string
          intensity?: string | null
          load_kg?: number | null
          muscle_group?: string | null
          notes?: string | null
          order_index?: number
          plan_id?: string
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_exercises_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      post_workout_feedback: {
        Row: {
          created_at: string | null
          energy_after: number | null
          id: string
          notes: string | null
          overall_feeling: number
          session_id: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          energy_after?: number | null
          id?: string
          notes?: string | null
          overall_feeling: number
          session_id: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          energy_after?: number | null
          id?: string
          notes?: string | null
          overall_feeling?: number
          session_id?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_workout_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_workout_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          ai_focus_endurance: number | null
          ai_focus_mobility: number | null
          ai_focus_strength: number | null
          ai_personalization: boolean | null
          alerts: boolean | null
          analysis: boolean | null
          behaviour: boolean | null
          cycle_tracking: boolean | null
          dark_mode: boolean | null
          default_duration_min: number | null
          default_location: string | null
          goals: boolean | null
          id: string
          language: string | null
          light_palette: string | null
          notifications: boolean | null
          plan_expiry_days: number | null
          preferred_intensity: string | null
          session_history_limit: number | null
          sounds: boolean | null
          trainer_dashboard_limit: number | null
          updated_at: string | null
          user_id: string | null
          white_label: boolean | null
          workout_ready_expiry_min: number | null
        }
        Insert: {
          ai_focus_endurance?: number | null
          ai_focus_mobility?: number | null
          ai_focus_strength?: number | null
          ai_personalization?: boolean | null
          alerts?: boolean | null
          analysis?: boolean | null
          behaviour?: boolean | null
          cycle_tracking?: boolean | null
          dark_mode?: boolean | null
          default_duration_min?: number | null
          default_location?: string | null
          goals?: boolean | null
          id?: string
          language?: string | null
          light_palette?: string | null
          notifications?: boolean | null
          plan_expiry_days?: number | null
          preferred_intensity?: string | null
          session_history_limit?: number | null
          sounds?: boolean | null
          trainer_dashboard_limit?: number | null
          updated_at?: string | null
          user_id?: string | null
          white_label?: boolean | null
          workout_ready_expiry_min?: number | null
        }
        Update: {
          ai_focus_endurance?: number | null
          ai_focus_mobility?: number | null
          ai_focus_strength?: number | null
          ai_personalization?: boolean | null
          alerts?: boolean | null
          analysis?: boolean | null
          behaviour?: boolean | null
          cycle_tracking?: boolean | null
          dark_mode?: boolean | null
          default_duration_min?: number | null
          default_location?: string | null
          goals?: boolean | null
          id?: string
          language?: string | null
          light_palette?: string | null
          notifications?: boolean | null
          plan_expiry_days?: number | null
          preferred_intensity?: string | null
          session_history_limit?: number | null
          sounds?: boolean | null
          trainer_dashboard_limit?: number | null
          updated_at?: string | null
          user_id?: string | null
          white_label?: boolean | null
          workout_ready_expiry_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_v2: {
        Row: {
          abandon_history: Json | null
          availability: Json | null
          basic_data: Json | null
          body_rhythm: Json | null
          comorbidities: Json | null
          completed_at: string | null
          consent: Json | null
          created_at: string | null
          current_step: string
          declared_health: Json | null
          environment: Json | null
          functional_capacity: Json | null
          habits: Json | null
          id: string
          movement_history: Json | null
          objectives: Json | null
          preferences: Json | null
          risk: Json | null
          sensitive_factors: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          abandon_history?: Json | null
          availability?: Json | null
          basic_data?: Json | null
          body_rhythm?: Json | null
          comorbidities?: Json | null
          completed_at?: string | null
          consent?: Json | null
          created_at?: string | null
          current_step?: string
          declared_health?: Json | null
          environment?: Json | null
          functional_capacity?: Json | null
          habits?: Json | null
          id?: string
          movement_history?: Json | null
          objectives?: Json | null
          preferences?: Json | null
          risk?: Json | null
          sensitive_factors?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          abandon_history?: Json | null
          availability?: Json | null
          basic_data?: Json | null
          body_rhythm?: Json | null
          comorbidities?: Json | null
          completed_at?: string | null
          consent?: Json | null
          created_at?: string | null
          current_step?: string
          declared_health?: Json | null
          environment?: Json | null
          functional_capacity?: Json | null
          habits?: Json | null
          id?: string
          movement_history?: Json | null
          objectives?: Json | null
          preferences?: Json | null
          risk?: Json | null
          sensitive_factors?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          dob: string | null
          email: string | null
          gender: string | null
          id: string
          location: string | null
          name: string | null
          phone: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          dob?: string | null
          email?: string | null
          gender?: string | null
          id: string
          location?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          dob?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          location?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      protocol_exercises: {
        Row: {
          alternative_exercise: string | null
          duration_seconds: number | null
          exercise_name: string
          id: string
          intensity: string | null
          load_kg: number | null
          muscle_group: string | null
          notes: string | null
          order_index: number
          protocol_id: string
          reps: number | null
          rest_seconds: number | null
          sets: number | null
          video_url: string | null
        }
        Insert: {
          alternative_exercise?: string | null
          duration_seconds?: number | null
          exercise_name: string
          id?: string
          intensity?: string | null
          load_kg?: number | null
          muscle_group?: string | null
          notes?: string | null
          order_index?: number
          protocol_id: string
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          video_url?: string | null
        }
        Update: {
          alternative_exercise?: string | null
          duration_seconds?: number | null
          exercise_name?: string
          id?: string
          intensity?: string | null
          load_kg?: number | null
          muscle_group?: string | null
          notes?: string | null
          order_index?: number
          protocol_id?: string
          reps?: number | null
          rest_seconds?: number | null
          sets?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_exercises_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "workout_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string
          permission_code: string
          role_code: string
        }
        Insert: {
          granted_at?: string
          permission_code: string
          role_code: string
        }
        Update: {
          granted_at?: string
          permission_code?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_system: boolean
          label: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_system?: boolean
          label: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_system?: boolean
          label?: string
        }
        Relationships: []
      }
      safety_gate_events: {
        Row: {
          ai_led_blocked: boolean | null
          checkin_id: string | null
          created_at: string | null
          human_review_required: boolean | null
          human_reviewed_at: string | null
          human_reviewed_by: string | null
          id: string
          readiness_score: number | null
          status: string
          triggered_signals: string[] | null
          user_id: string
        }
        Insert: {
          ai_led_blocked?: boolean | null
          checkin_id?: string | null
          created_at?: string | null
          human_review_required?: boolean | null
          human_reviewed_at?: string | null
          human_reviewed_by?: string | null
          id?: string
          readiness_score?: number | null
          status: string
          triggered_signals?: string[] | null
          user_id: string
        }
        Update: {
          ai_led_blocked?: boolean | null
          checkin_id?: string | null
          created_at?: string | null
          human_review_required?: boolean | null
          human_reviewed_at?: string | null
          human_reviewed_by?: string | null
          id?: string
          readiness_score?: number | null
          status?: string
          triggered_signals?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_gate_events_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkin_prontidao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_gate_events_human_reviewed_by_fkey"
            columns: ["human_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_gate_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_members: {
        Row: {
          created_at: string | null
          id: string
          permissions: Json | null
          role: string | null
          studio_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role?: string | null
          studio_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role?: string | null
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studios_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          payload?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      trainer_alerts: {
        Row: {
          alert_type: string
          body: string | null
          client_id: string
          created_at: string
          event_id: string | null
          id: string
          params: Json | null
          resolved_at: string | null
          session_id: string | null
          severity: string
          status: string
          template_key: string | null
          title: string
          trainer_id: string
        }
        Insert: {
          alert_type: string
          body?: string | null
          client_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          params?: Json | null
          resolved_at?: string | null
          session_id?: string | null
          severity?: string
          status?: string
          template_key?: string | null
          title: string
          trainer_id: string
        }
        Update: {
          alert_type?: string
          body?: string | null
          client_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          params?: Json | null
          resolved_at?: string | null
          session_id?: string | null
          severity?: string
          status?: string
          template_key?: string | null
          title?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "system_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_alerts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_clients: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          permissions: Json | null
          status: string | null
          studio_id: string | null
          trainer_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          permissions?: Json | null
          status?: string | null
          studio_id?: string | null
          trainer_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          permissions?: Json | null
          status?: string | null
          studio_id?: string | null
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_clients_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_clients_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          expires_at: string
          id: string
          invited_email: string
          invited_name: string
          status: string
          token: string
          trainer_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          invited_email: string
          invited_name: string
          status?: string
          token: string
          trainer_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invited_email?: string
          invited_name?: string
          status?: string
          token?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_invitations_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_pain_events: {
        Row: {
          body_region: string
          created_at: string | null
          exercise_id: string | null
          id: string
          intensity: number
          reported_at: string | null
          session_exercise_id: string | null
          session_id: string
          trainer_notified: boolean | null
        }
        Insert: {
          body_region: string
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          intensity: number
          reported_at?: string | null
          session_exercise_id?: string | null
          session_id: string
          trainer_notified?: boolean | null
        }
        Update: {
          body_region?: string
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          intensity?: number
          reported_at?: string | null
          session_exercise_id?: string | null
          session_id?: string
          trainer_notified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_pain_events_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_pain_events_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_session_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_pain_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          ai_notes: string | null
          approved_by: string | null
          assigned_to: string
          created_at: string | null
          created_by: string | null
          id: string
          protocol_id: string | null
          scheduled_date: string | null
          source: string | null
          status: string | null
          trainer_notes: string | null
          updated_at: string | null
        }
        Insert: {
          ai_notes?: string | null
          approved_by?: string | null
          assigned_to: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          protocol_id?: string | null
          scheduled_date?: string | null
          source?: string | null
          status?: string | null
          trainer_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_notes?: string | null
          approved_by?: string | null
          assigned_to?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          protocol_id?: string | null
          scheduled_date?: string | null
          source?: string | null
          status?: string | null
          trainer_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plans_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "workout_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_protocols: {
        Row: {
          contraindications: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_public: boolean | null
          level: string | null
          name: string
          objective: string | null
          studio_id: string | null
          tags: string[] | null
        }
        Insert: {
          contraindications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          level?: string | null
          name: string
          objective?: string | null
          studio_id?: string | null
          tags?: string[] | null
        }
        Update: {
          contraindications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_public?: boolean | null
          level?: string | null
          name?: string
          objective?: string | null
          studio_id?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_protocols_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_protocols_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session_exercises: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          exercise_name: string
          id: string
          load_kg_prescribed: number | null
          muscle_group: string | null
          notes: string | null
          order_index: number
          plan_exercise_id: string | null
          reps_prescribed: number | null
          rest_seconds: number | null
          session_id: string
          sets_prescribed: number | null
          skipped_reason: string | null
          status: string
          substituted_from_id: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          load_kg_prescribed?: number | null
          muscle_group?: string | null
          notes?: string | null
          order_index?: number
          plan_exercise_id?: string | null
          reps_prescribed?: number | null
          rest_seconds?: number | null
          session_id: string
          sets_prescribed?: number | null
          skipped_reason?: string | null
          status?: string
          substituted_from_id?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          load_kg_prescribed?: number | null
          muscle_group?: string | null
          notes?: string | null
          order_index?: number
          plan_exercise_id?: string | null
          reps_prescribed?: number | null
          rest_seconds?: number | null
          session_id?: string
          sets_prescribed?: number | null
          skipped_reason?: string | null
          status?: string
          substituted_from_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_exercises_plan_exercise_id_fkey"
            columns: ["plan_exercise_id"]
            isOneToOne: false
            referencedRelation: "plan_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_exercises_substituted_from_id_fkey"
            columns: ["substituted_from_id"]
            isOneToOne: false
            referencedRelation: "workout_session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_minutes: number | null
          feedback_energy: number | null
          feedback_notes: string | null
          id: string
          notes: string | null
          performance_score: number | null
          plan_id: string | null
          started_at: string | null
          status: string
          total_duration_min: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          feedback_energy?: number | null
          feedback_notes?: string | null
          id?: string
          notes?: string | null
          performance_score?: number | null
          plan_id?: string | null
          started_at?: string | null
          status?: string
          total_duration_min?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          feedback_energy?: number | null
          feedback_notes?: string | null
          id?: string
          notes?: string | null
          performance_score?: number | null
          plan_id?: string | null
          started_at?: string | null
          status?: string
          total_duration_min?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_set_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          load_kg: number | null
          reps_done: number | null
          rpe: number | null
          session_exercise_id: string
          session_id: string
          set_number: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          load_kg?: number | null
          reps_done?: number | null
          rpe?: number | null
          session_exercise_id: string
          session_id: string
          set_number: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          load_kg?: number | null
          reps_done?: number | null
          rpe?: number | null
          session_exercise_id?: string
          session_id?: string
          set_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_set_logs_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_session_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string | null
          duration_minutes: number | null
          id: string
          intensity: string | null
          notes: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          id?: string
          intensity?: string | null
          notes?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string | null
          duration_minutes?: number | null
          id?: string
          intensity?: string | null
          notes?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_trainer_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: {
          result: string
          trainer_id: string
          trainer_name: string
        }[]
      }
      auto_close_stale_sessions: { Args: never; Returns: number }
      get_active_role: { Args: { uid?: string }; Returns: string }
      get_device_tokens: {
        Args: never
        Returns: {
          token: string
        }[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          account_confirmed: boolean
          account_exists: boolean
          expires_at: string
          invited_email: string
          invited_name: string
          status: string
          trainer_name: string
        }[]
      }
      get_pending_invitation_for_user: {
        Args: never
        Returns: {
          token: string
        }[]
      }
      has_permission: { Args: { perm: string; uid?: string }; Returns: boolean }
      studio_has_trainer: { Args: { trainer_uuid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
