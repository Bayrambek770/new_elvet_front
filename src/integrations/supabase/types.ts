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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      animals: {
        Row: {
          animal_type: Database["public"]["Enums"]["animal_type"]
          birth_date: string | null
          breed: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          animal_type: Database["public"]["Enums"]["animal_type"]
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          animal_type?: Database["public"]["Enums"]["animal_type"]
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          animal_id: string | null
          appointment_date: string
          client_id: string
          created_at: string | null
          doctor_id: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          service_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          animal_id?: string | null
          appointment_date: string
          client_id: string
          created_at?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          service_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          animal_id?: string | null
          appointment_date?: string
          client_id?: string
          created_at?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          service_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      card_medications: {
        Row: {
          card_id: string
          created_at: string
          executed_at: string
          executor_id: string
          id: string
          medication_id: string
          notes: string | null
          price: number
          quantity: number
        }
        Insert: {
          card_id: string
          created_at?: string
          executed_at?: string
          executor_id: string
          id?: string
          medication_id: string
          notes?: string | null
          price: number
          quantity?: number
        }
        Update: {
          card_id?: string
          created_at?: string
          executed_at?: string
          executor_id?: string
          id?: string
          medication_id?: string
          notes?: string | null
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "card_medications_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "medical_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_medications_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      card_services: {
        Row: {
          card_id: string
          created_at: string
          executed_at: string
          executor_id: string
          id: string
          notes: string | null
          price: number
          quantity: number
          service_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          executed_at?: string
          executor_id: string
          id?: string
          notes?: string | null
          price: number
          quantity?: number
          service_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          executed_at?: string
          executor_id?: string
          id?: string
          notes?: string | null
          price?: number
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_services_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "medical_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      care_execution_log: {
        Row: {
          care_plan_id: string
          created_at: string
          executed_at: string
          id: string
          notes: string | null
          nurse_id: string
        }
        Insert: {
          care_plan_id: string
          created_at?: string
          executed_at?: string
          id?: string
          notes?: string | null
          nurse_id: string
        }
        Update: {
          care_plan_id?: string
          created_at?: string
          executed_at?: string
          id?: string
          notes?: string | null
          nurse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_execution_log_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "hospitalization_care_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalization_care_plan: {
        Row: {
          assigned_nurse_id: string | null
          card_id: string
          created_at: string
          frequency: string | null
          id: string
          notes: string | null
          procedure_name: string
          scheduled_time: string
        }
        Insert: {
          assigned_nurse_id?: string | null
          card_id: string
          created_at?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          procedure_name: string
          scheduled_time: string
        }
        Update: {
          assigned_nurse_id?: string | null
          card_id?: string
          created_at?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          procedure_name?: string
          scheduled_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitalization_care_plan_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "medical_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_cards: {
        Row: {
          anamnesis: string | null
          animal_id: string
          card_number: string
          created_at: string
          diet: string | null
          doctor_id: string
          hospitalization_end: string | null
          hospitalization_start: string | null
          id: string
          is_hospitalized: boolean
          is_paid: boolean
          next_visit_date: string | null
          owner_id: string
          recommendations: string | null
          status: string | null
          total_amount: number
          updated_at: string
          visit_date: string
        }
        Insert: {
          anamnesis?: string | null
          animal_id: string
          card_number: string
          created_at?: string
          diet?: string | null
          doctor_id: string
          hospitalization_end?: string | null
          hospitalization_start?: string | null
          id?: string
          is_hospitalized?: boolean
          is_paid?: boolean
          next_visit_date?: string | null
          owner_id: string
          recommendations?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
          visit_date?: string
        }
        Update: {
          anamnesis?: string | null
          animal_id?: string
          card_number?: string
          created_at?: string
          diet?: string | null
          doctor_id?: string
          hospitalization_end?: string | null
          hospitalization_start?: string | null
          id?: string
          is_hospitalized?: boolean
          is_paid?: boolean
          next_visit_date?: string | null
          owner_id?: string
          recommendations?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_cards_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          full_name: string
          id: string
          is_temp_password: boolean | null
          phone: string | null
          position: string | null
          specialization: string | null
          staff_id: string | null
          temp_password: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_temp_password?: boolean | null
          phone?: string | null
          position?: string | null
          specialization?: string | null
          staff_id?: string | null
          temp_password?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_temp_password?: boolean | null
          phone?: string | null
          position?: string | null
          specialization?: string | null
          staff_id?: string | null
          temp_password?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registration_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_single_use: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_single_use?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_single_use?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      registration_requests: {
        Row: {
          created_at: string | null
          full_name: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          phone: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          phone: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          phone?: string
          status?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          created_at: string | null
          created_by: string
          full_name: string
          id: string
          invited_user_id: string | null
          password_hash: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          full_name: string
          id?: string
          invited_user_id?: string | null
          password_hash?: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          full_name?: string
          id?: string
          invited_user_id?: string | null
          password_hash?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_registration_code: { Args: never; Returns: string }
      generate_staff_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      use_registration_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      animal_type: "dog" | "cat" | "bird" | "rodent" | "reptile" | "other"
      app_role: "client" | "moderator" | "doctor" | "nurse" | "admin"
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
    Enums: {
      animal_type: ["dog", "cat", "bird", "rodent", "reptile", "other"],
      app_role: ["client", "moderator", "doctor", "nurse", "admin"],
    },
  },
} as const
