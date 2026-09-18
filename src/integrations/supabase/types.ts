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
      assessments: {
        Row: {
          created_at: string
          id: string
          response: string | null
          role: Database["public"]["Enums"]["leadership_role"]
          scenario_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response?: string | null
          role: Database["public"]["Enums"]["leadership_role"]
          scenario_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response?: string | null
          role?: Database["public"]["Enums"]["leadership_role"]
          scenario_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          burnout: number | null
          id: string
          influence: number | null
          loyalty: number | null
          motivation: number | null
          name: string | null
          organization_id: string | null
          personality_json: Json | null
          role: string | null
          trust: number | null
        }
        Insert: {
          burnout?: number | null
          id?: string
          influence?: number | null
          loyalty?: number | null
          motivation?: number | null
          name?: string | null
          organization_id?: string | null
          personality_json?: Json | null
          role?: string | null
          trust?: number | null
        }
        Update: {
          burnout?: number | null
          id?: string
          influence?: number | null
          loyalty?: number | null
          motivation?: number | null
          name?: string | null
          organization_id?: string | null
          personality_json?: Json | null
          role?: string | null
          trust?: number | null
        }
        Relationships: []
      }
      digital_twins: {
        Row: {
          coaching_score: number | null
          communication_score: number | null
          conflict_score: number | null
          delegation_score: number | null
          empathy_score: number | null
          id: string
          overall_score: number | null
          resilience_score: number | null
          strategic_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching_score?: number | null
          communication_score?: number | null
          conflict_score?: number | null
          delegation_score?: number | null
          empathy_score?: number | null
          id?: string
          overall_score?: number | null
          resilience_score?: number | null
          strategic_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching_score?: number | null
          communication_score?: number | null
          conflict_score?: number | null
          delegation_score?: number | null
          empathy_score?: number | null
          id?: string
          overall_score?: number | null
          resilience_score?: number | null
          strategic_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          organization_id: string | null
          payload: Json | null
          severity: number | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json | null
          severity?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          organization_id?: string | null
          payload?: Json | null
          severity?: number | null
        }
        Relationships: []
      }
      personality_profiles: {
        Row: {
          agreeableness: number | null
          conscientiousness: number | null
          extraversion: number | null
          id: string
          neuroticism: number | null
          openness: number | null
          user_id: string
        }
        Insert: {
          agreeableness?: number | null
          conscientiousness?: number | null
          extraversion?: number | null
          id?: string
          neuroticism?: number | null
          openness?: number | null
          user_id: string
        }
        Update: {
          agreeableness?: number | null
          conscientiousness?: number | null
          extraversion?: number | null
          id?: string
          neuroticism?: number | null
          openness?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string | null
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          industry?: string | null
          name?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          accountability: number
          assessment_id: string
          clarity: number
          coaching: number
          coaching_feedback: string
          created_at: string
          empathy: number
          explainability: Json
          missed: string[]
          outcome_projection: Json
          psychological_safety: number
          readiness_score: number
          strengths: string[]
          suggestions: string[]
        }
        Insert: {
          accountability: number
          assessment_id: string
          clarity: number
          coaching: number
          coaching_feedback: string
          created_at?: string
          empathy: number
          explainability?: Json
          missed: string[]
          outcome_projection: Json
          psychological_safety: number
          readiness_score: number
          strengths: string[]
          suggestions: string[]
        }
        Update: {
          accountability?: number
          assessment_id?: string
          clarity?: number
          coaching?: number
          coaching_feedback?: string
          created_at?: string
          empathy?: number
          explainability?: Json
          missed?: string[]
          outcome_projection?: Json
          psychological_safety?: number
          readiness_score?: number
          strengths?: string[]
          suggestions?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          created_at: string
          id: string
          prompt: string
          role: Database["public"]["Enums"]["leadership_role"]
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          role: Database["public"]["Enums"]["leadership_role"]
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          role?: Database["public"]["Enums"]["leadership_role"]
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      leadership_role:
        | "engineering_manager"
        | "team_lead"
        | "project_manager"
        | "hr_manager"
        | "operations_manager"
        | "teacher"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      leadership_role: [
        "engineering_manager",
        "team_lead",
        "project_manager",
        "hr_manager",
        "operations_manager",
        "teacher",
      ],
    },
  },
} as const
