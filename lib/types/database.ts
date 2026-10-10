export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      documents: {
        Row: {
          chapter: string
          created_at: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          file_size: number
          id: string
          last_page: number
          page_count: number | null
          status: Database["public"]["Enums"]["doc_status"]
          storage_path: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_size?: number
          id?: string
          last_page?: number
          page_count?: number | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path: string
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          chapter?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          file_size?: number
          id?: string
          last_page?: number
          page_count?: number | null
          status?: Database["public"]["Enums"]["doc_status"]
          storage_path?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          ends_at: string
          eval_type: Database["public"]["Enums"]["eval_type"]
          id: string
          notes: string
          starts_at: string
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          eval_type?: Database["public"]["Enums"]["eval_type"]
          id?: string
          notes?: string
          starts_at: string
          subject_id: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          eval_type?: Database["public"]["Enums"]["eval_type"]
          id?: string
          notes?: string
          starts_at?: string
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      event_documents: {
        Row: {
          created_at: string
          document_id: string
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          event_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string
          ends_at: string
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          ends_at: string
          id?: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          subject_id: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          ends_at?: string
          id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_events: {
        Row: {
          ends_at: string
          feed_id: string
          id: string
          location: string
          starts_at: string
          summary: string
          uid: string
          user_id: string
        }
        Insert: {
          ends_at: string
          feed_id: string
          id?: string
          location?: string
          starts_at: string
          summary?: string
          uid: string
          user_id?: string
        }
        Update: {
          ends_at?: string
          feed_id?: string
          id?: string
          location?: string
          starts_at?: string
          summary?: string
          uid?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_events_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "ical_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      ical_feeds: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_error: string | null
          last_synced_at: string | null
          name: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          name?: string
          url: string
          user_id?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          name?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          break_minutes: number
          created_at: string
          day_end_hour: number
          day_start_hour: number
          focus_minutes: number
          theme: string
          timezone: string
          updated_at: string
          user_id: string
          week_start: number
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          day_end_hour?: number
          day_start_hour?: number
          focus_minutes?: number
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
          week_start?: number
        }
        Update: {
          break_minutes?: number
          created_at?: string
          day_end_hour?: number
          day_start_hour?: number
          focus_minutes?: number
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          week_start?: number
        }
        Relationships: []
      }
      subjects: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          position: number
          priority: Database["public"]["Enums"]["subject_priority"]
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          position?: number
          priority?: Database["public"]["Enums"]["subject_priority"]
          user_id?: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          priority?: Database["public"]["Enums"]["subject_priority"]
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          done: boolean
          event_id: string
          id: string
          label: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          event_id: string
          id?: string
          label: string
          position?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          event_id?: string
          id?: string
          label?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          label: string
          room: string
          start_time: string
          teacher: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          label: string
          room?: string
          start_time: string
          teacher?: string
          user_id?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          label?: string
          room?: string
          start_time?: string
          teacher?: string
          user_id?: string
          weekday?: number
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
      doc_status: "a_faire" | "en_cours" | "fait"
      doc_type: "cours" | "exos" | "annale" | "corrige"
      eval_type: "ds" | "controle" | "oral"
      event_status: "prevu" | "fait" | "rate"
      subject_priority: "haute" | "normale" | "light"
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

export const Constants = {
  public: {
    Enums: {
      doc_status: ["a_faire", "en_cours", "fait"],
      doc_type: ["cours", "exos", "annale", "corrige"],
      eval_type: ["ds", "controle", "oral"],
      event_status: ["prevu", "fait", "rate"],
      subject_priority: ["haute", "normale", "light"],
    },
  },
} as const

// Alias pratiques
export type Subject = Tables<"subjects">
export type StudyEvent = Tables<"events">
export type Evaluation = Tables<"evaluations">
export type Task = Tables<"tasks">
export type Document = Tables<"documents">
export type EventDocument = Tables<"event_documents">
export type IcalFeed = Tables<"ical_feeds">
export type IcalEvent = Tables<"ical_events">
export type TimetableSlot = Tables<"timetable_slots">
export type Settings = Tables<"settings">
