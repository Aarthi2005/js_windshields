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
      glass_stock: {
        Row: {
          glass_type: string
          id: string
          quantity: number
          updated_at: string
          vehicle_model_id: string
        }
        Insert: {
          glass_type: string
          id?: string
          quantity?: number
          updated_at?: string
          vehicle_model_id: string
        }
        Update: {
          glass_type?: string
          id?: string
          quantity?: number
          updated_at?: string
          vehicle_model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glass_stock_vehicle_model_id_fkey"
            columns: ["vehicle_model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_stock: {
        Row: {
          glass_type: string
          id: string
          location: Database["public"]["Enums"]["inventory_location"]
          month: number
          opening_quantity: number
          quantity: number
          updated_at: string
          vehicle_model_id: string
          year: number
        }
        Insert: {
          glass_type: string
          id?: string
          location: Database["public"]["Enums"]["inventory_location"]
          month: number
          opening_quantity?: number
          quantity?: number
          updated_at?: string
          vehicle_model_id: string
          year: number
        }
        Update: {
          glass_type?: string
          id?: string
          location?: Database["public"]["Enums"]["inventory_location"]
          month?: number
          opening_quantity?: number
          quantity?: number
          updated_at?: string
          vehicle_model_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_stock_vehicle_model_id_fkey"
            columns: ["vehicle_model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      stock_history: {
        Row: {
          change: number
          created_at: string
          glass_type: string
          id: string
          location: Database["public"]["Enums"]["inventory_location"]
          month: number | null
          new_quantity: number
          note: string | null
          previous_quantity: number
          user_id: string | null
          vehicle_model_id: string
          year: number | null
        }
        Insert: {
          change: number
          created_at?: string
          glass_type: string
          id?: string
          location?: Database["public"]["Enums"]["inventory_location"]
          month?: number | null
          new_quantity: number
          note?: string | null
          previous_quantity: number
          user_id?: string | null
          vehicle_model_id: string
          year?: number | null
        }
        Update: {
          change?: number
          created_at?: string
          glass_type?: string
          id?: string
          location?: Database["public"]["Enums"]["inventory_location"]
          month?: number | null
          new_quantity?: number
          note?: string | null
          previous_quantity?: number
          user_id?: string | null
          vehicle_model_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_history_vehicle_model_id_fkey"
            columns: ["vehicle_model_id"]
            isOneToOne: false
            referencedRelation: "vehicle_models"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_models: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["vehicle_category"]
          created_at: string
          id: string
          location: Database["public"]["Enums"]["inventory_location"]
          low_stock_threshold: number
          name: string
        }
        Insert: {
          brand?: string | null
          category: Database["public"]["Enums"]["vehicle_category"]
          created_at?: string
          id?: string
          location?: Database["public"]["Enums"]["inventory_location"]
          low_stock_threshold?: number
          name: string
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["vehicle_category"]
          created_at?: string
          id?: string
          location?: Database["public"]["Enums"]["inventory_location"]
          low_stock_threshold?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_month_snapshot: {
        Args: {
          p_location: Database["public"]["Enums"]["inventory_location"]
          p_month: number
          p_year: number
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      inventory_location: "TVM" | "DPI"
      vehicle_category: "CAR" | "BUS" | "COMMERCIAL"
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
      app_role: ["admin", "staff"],
      inventory_location: ["TVM", "DPI"],
      vehicle_category: ["CAR", "BUS", "COMMERCIAL"],
    },
  },
} as const
