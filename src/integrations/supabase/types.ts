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
      free_practice_attempts: {
        Row: {
          breath_control: number
          created_at: string
          description: string | null
          duration_sec: number
          id: string
          next_exercise_suggestion: string | null
          overall_score: number
          pitch_accuracy: number
          praise: Json
          rhythm: number
          smoothness: number
          summary: string | null
          tips: Json
          tone_quality: number
          user_id: string
          what_you_sang: string | null
        }
        Insert: {
          breath_control?: number
          created_at?: string
          description?: string | null
          duration_sec?: number
          id?: string
          next_exercise_suggestion?: string | null
          overall_score?: number
          pitch_accuracy?: number
          praise?: Json
          rhythm?: number
          smoothness?: number
          summary?: string | null
          tips?: Json
          tone_quality?: number
          user_id: string
          what_you_sang?: string | null
        }
        Update: {
          breath_control?: number
          created_at?: string
          description?: string | null
          duration_sec?: number
          id?: string
          next_exercise_suggestion?: string | null
          overall_score?: number
          pitch_accuracy?: number
          praise?: Json
          rhythm?: number
          smoothness?: number
          summary?: string | null
          tips?: Json
          tone_quality?: number
          user_id?: string
          what_you_sang?: string | null
        }
        Relationships: []
      }
      lesson_attempts: {
        Row: {
          ai_feedback: Json | null
          ai_score: number
          created_at: string
          id: string
          lesson_id: string
          overall_score: number
          pitch_score: number
          user_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          ai_score?: number
          created_at?: string
          id?: string
          lesson_id: string
          overall_score?: number
          pitch_score?: number
          user_id: string
        }
        Update: {
          ai_feedback?: Json | null
          ai_score?: number
          created_at?: string
          id?: string
          lesson_id?: string
          overall_score?: number
          pitch_score?: number
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          attempts_count: number
          best_score: number
          best_streak: number
          completed: boolean
          current_streak: number
          id: string
          last_attempt_date: string | null
          lesson_id: string
          stars: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number
          best_score?: number
          best_streak?: number
          completed?: boolean
          current_streak?: number
          id?: string
          last_attempt_date?: string | null
          lesson_id: string
          stars?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number
          best_score?: number
          best_streak?: number
          completed?: boolean
          current_streak?: number
          id?: string
          last_attempt_date?: string | null
          lesson_id?: string
          stars?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_streak: number
          daily_goal_minutes: number
          daily_goal_takes: number
          display_name: string | null
          id: string
          last_practice_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          daily_goal_minutes?: number
          daily_goal_takes?: number
          display_name?: string | null
          id: string
          last_practice_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          daily_goal_minutes?: number
          daily_goal_takes?: number
          display_name?: string | null
          id?: string
          last_practice_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      song_attempts: {
        Row: {
          breath_control: number
          created_at: string
          duration_sec: number
          id: string
          mode: string
          overall_score: number
          pitch_accuracy: number
          praise: Json
          rhythm: number
          smoothness: number
          song_id: string
          summary: string | null
          tips: Json
          tone_quality: number
          user_id: string
        }
        Insert: {
          breath_control?: number
          created_at?: string
          duration_sec?: number
          id?: string
          mode: string
          overall_score?: number
          pitch_accuracy?: number
          praise?: Json
          rhythm?: number
          smoothness?: number
          song_id: string
          summary?: string | null
          tips?: Json
          tone_quality?: number
          user_id: string
        }
        Update: {
          breath_control?: number
          created_at?: string
          duration_sec?: number
          id?: string
          mode?: string
          overall_score?: number
          pitch_accuracy?: number
          praise?: Json
          rhythm?: number
          smoothness?: number
          song_id?: string
          summary?: string | null
          tips?: Json
          tone_quality?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_attempts_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          ai_plan: Json | null
          album: string | null
          artist: string | null
          contour_status: string
          created_at: string
          duration_sec: number | null
          id: string
          image_url: string | null
          pitch_contour: Json | null
          preview_url: string | null
          source: string
          source_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_plan?: Json | null
          album?: string | null
          artist?: string | null
          contour_status?: string
          created_at?: string
          duration_sec?: number | null
          id?: string
          image_url?: string | null
          pitch_contour?: Json | null
          preview_url?: string | null
          source: string
          source_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_plan?: Json | null
          album?: string | null
          artist?: string | null
          contour_status?: string
          created_at?: string
          duration_sec?: number | null
          id?: string
          image_url?: string | null
          pitch_contour?: Json | null
          preview_url?: string | null
          source?: string
          source_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
