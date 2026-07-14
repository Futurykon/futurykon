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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          probability: number
          question_id: string
          reasoning: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          probability: number
          question_id: string
          reasoning?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          probability?: number
          question_id?: string
          reasoning?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_predictions"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "predictions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      question_scores: {
        Row: {
          log_score: number
          question_id: string
          scored_at: string
          user_id: string
        }
        Insert: {
          log_score: number
          question_id: string
          scored_at?: string
          user_id: string
        }
        Update: {
          log_score?: number
          question_id?: string
          scored_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_scores_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "community_predictions"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "question_scores_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_suggestions: {
        Row: {
          admin_note: string | null
          close_date: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          suggested_by: string
          tags: string[]
          title: string
        }
        Insert: {
          admin_note?: string | null
          close_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          suggested_by: string
          tags?: string[]
          title: string
        }
        Update: {
          admin_note?: string | null
          close_date?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          suggested_by?: string
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          author_id: string | null
          close_date: string | null
          created_at: string
          description: string | null
          id: string
          resolution_criteria: string | null
          resolution_date: string | null
          resolution_status: string | null
          share_token: string
          tags: string[]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["question_visibility"]
        }
        Insert: {
          author_id?: string | null
          close_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolution_criteria?: string | null
          resolution_date?: string | null
          resolution_status?: string | null
          share_token?: string
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["question_visibility"]
        }
        Update: {
          author_id?: string | null
          close_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolution_criteria?: string | null
          resolution_date?: string | null
          resolution_status?: string | null
          share_token?: string
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["question_visibility"]
        }
        Relationships: []
      }
    }
    Views: {
      community_predictions: {
        Row: {
          close_date: string | null
          community_probability: number | null
          prediction_count: number | null
          question_id: string | null
          resolution_status: string | null
          title: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          avg_log_score: number | null
          display_name: string | null
          email: string | null
          scored_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_community_prediction: {
        Args: { question_uuid: string }
        Returns: {
          community_probability: number
          prediction_count: number
          question_id: string
        }[]
      }
      calculate_time_averaged_log_score: {
        Args: {
          p_outcome: boolean
          p_question_id: string
          p_resolution_date: string
          p_user_id: string
        }
        Returns: number
      }
      get_question_by_share_token: {
        Args: { p_token: string }
        Returns: {
          author_id: string | null
          close_date: string | null
          created_at: string
          description: string | null
          id: string
          resolution_criteria: string | null
          resolution_date: string | null
          resolution_status: string | null
          share_token: string
          tags: string[]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["question_visibility"]
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rename_question_tag: {
        Args: { new_tag: string; old_tag: string }
        Returns: undefined
      }
    }
    Enums: {
      question_visibility: "private" | "link_view" | "link_predict" | "public"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      question_visibility: ["private", "link_view", "link_predict", "public"],
    },
  },
} as const
