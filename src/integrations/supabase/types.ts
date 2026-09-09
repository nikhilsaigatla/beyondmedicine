export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      announcement_acks: {
        Row: {
          acknowledged_at: string;
          announcement_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          acknowledged_at?: string;
          announcement_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          acknowledged_at?: string;
          announcement_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcement_acks_announcement_id_fkey";
            columns: ["announcement_id"];
            isOneToOne: false;
            referencedRelation: "announcements";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["announcement_audience"];
          author_id: string;
          body: string;
          created_at: string;
          distribute_public: boolean;
          email_notify: boolean;
          email_division: string | null;
          id: string;
          priority: Database["public"]["Enums"]["announcement_priority"];
          requires_ack: boolean;
          title: string;
        };
        Insert: {
          audience?: Database["public"]["Enums"]["announcement_audience"];
          author_id: string;
          body: string;
          created_at?: string;
          distribute_public?: boolean;
          email_notify?: boolean;
          email_division?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["announcement_priority"];
          requires_ack?: boolean;
          title: string;
        };
        Update: {
          audience?: Database["public"]["Enums"]["announcement_audience"];
          author_id?: string;
          body?: string;
          created_at?: string;
          distribute_public?: boolean;
          email_notify?: boolean;
          email_division?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["announcement_priority"];
          requires_ack?: boolean;
          title?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          cohort_preference: string | null;
          country: string | null;
          county: string | null;
          created_at: string;
          custom_interests: string[];
          decided_at: string | null;
          decided_by: string | null;
          discovery_source: string | null;
          email: string | null;
          desired_position: string | null;
          full_name: string | null;
          grade_level: string | null;
          interests: string[];
          notes: string | null;
          phone: string | null;
          research_experience: boolean | null;
          research_experience_details: string | null;
          school: string | null;
          state_region: string | null;
          status: Database["public"]["Enums"]["application_status"];
          submitted_at: string | null;
          time_zone: string | null;
          updated_at: string;
          verification_status: string;
          user_id: string;
        };
        Insert: {
          cohort_preference?: string | null;
          country?: string | null;
          county?: string | null;
          created_at?: string;
          custom_interests?: string[];
          decided_at?: string | null;
          decided_by?: string | null;
          discovery_source?: string | null;
          email?: string | null;
          desired_position?: string | null;
          full_name?: string | null;
          grade_level?: string | null;
          interests?: string[];
          notes?: string | null;
          phone?: string | null;
          research_experience?: boolean | null;
          research_experience_details?: string | null;
          school?: string | null;
          state_region?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          submitted_at?: string | null;
          time_zone?: string | null;
          updated_at?: string;
          verification_status?: string;
          user_id: string;
        };
        Update: {
          cohort_preference?: string | null;
          country?: string | null;
          county?: string | null;
          created_at?: string;
          custom_interests?: string[];
          decided_at?: string | null;
          decided_by?: string | null;
          discovery_source?: string | null;
          email?: string | null;
          desired_position?: string | null;
          full_name?: string | null;
          grade_level?: string | null;
          interests?: string[];
          notes?: string | null;
          phone?: string | null;
          research_experience?: boolean | null;
          research_experience_details?: string | null;
          school?: string | null;
          state_region?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          submitted_at?: string | null;
          time_zone?: string | null;
          updated_at?: string;
          verification_status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity: string | null;
          entity_id: string | null;
          id: string;
          metadata: Json;
          target_user_id: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          metadata?: Json | Record<string, unknown>;
          target_user_id?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          metadata?: Json | Record<string, unknown>;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          title: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          id: string;
          joined_at: string;
          last_read_at: string | null;
          role: Database["public"]["Enums"]["message_member_role"];
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: Database["public"]["Enums"]["message_member_role"];
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: Database["public"]["Enums"]["message_member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string | null;
          type: Database["public"]["Enums"]["conversation_type"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string | null;
          type?: Database["public"]["Enums"]["conversation_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string | null;
          type?: Database["public"]["Enums"]["conversation_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      course_enrollments: {
        Row: {
          course_id: string;
          id: string;
          student_id: string;
        };
        Insert: {
          course_id: string;
          id?: string;
          student_id: string;
        };
        Update: {
          course_id?: string;
          id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          mentor_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          mentor_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          mentor_id?: string;
          title?: string;
        };
        Relationships: [];
      };
      leadership_entries: {
        Row: {
          assignee_id: string | null;
          created_at: string;
          description: string | null;
          division: string;
          id: string;
          image_url: string | null;
          name: string | null;
          position: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          assignee_id?: string | null;
          created_at?: string;
          description?: string | null;
          division: string;
          id?: string;
          image_url?: string | null;
          name?: string | null;
          position: string;
          sort_order?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          created_at?: string;
          description?: string | null;
          division?: string;
          id?: string;
          image_url?: string | null;
          name?: string | null;
          position?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leadership_role_settings: {
        Row: {
          description: string | null;
          division: string;
          max_slots: number | null;
          position: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          description?: string | null;
          division: string;
          max_slots?: number | null;
          position: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          description?: string | null;
          division?: string;
          max_slots?: number | null;
          position?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meeting_attendees: {
        Row: {
          meeting_id: string;
          responded_at: string | null;
          rsvp: Database["public"]["Enums"]["rsvp_status"];
          user_id: string;
        };
        Insert: {
          meeting_id: string;
          responded_at?: string | null;
          rsvp?: Database["public"]["Enums"]["rsvp_status"];
          user_id: string;
        };
        Update: {
          meeting_id?: string;
          responded_at?: string | null;
          rsvp?: Database["public"]["Enums"]["rsvp_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      meetings: {
        Row: {
          agenda: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          id: string;
          location: string | null;
          meeting_link: string | null;
          notes: string | null;
          notes_updated_at: string | null;
          notes_updated_by: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
          visibility: Database["public"]["Enums"]["meeting_visibility"];
        };
        Insert: {
          agenda?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          meeting_link?: string | null;
          notes?: string | null;
          notes_updated_at?: string | null;
          notes_updated_by?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["meeting_visibility"];
        };
        Update: {
          agenda?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          meeting_link?: string | null;
          notes?: string | null;
          notes_updated_at?: string | null;
          notes_updated_by?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
          visibility?: Database["public"]["Enums"]["meeting_visibility"];
        };
        Relationships: [];
      };
      mentor_students: {
        Row: {
          assigned_at: string;
          id: string;
          mentor_id: string;
          student_id: string;
        };
        Insert: {
          assigned_at?: string;
          id?: string;
          mentor_id: string;
          student_id: string;
        };
        Update: {
          assigned_at?: string;
          id?: string;
          mentor_id?: string;
          student_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          research_interests: string[];
          school: string | null;
          status: Database["public"]["Enums"]["profile_status"];
          suspended_at: string | null;
          time_zone: string | null;
          updated_at: string;
          username: string;
          verification_status: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          research_interests?: string[];
          school?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          suspended_at?: string | null;
          time_zone?: string | null;
          updated_at?: string;
          username?: string;
          verification_status?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          research_interests?: string[];
          school?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          suspended_at?: string | null;
          time_zone?: string | null;
          updated_at?: string;
          username?: string;
          verification_status?: string;
        };
        Relationships: [];
      };
      research_group_members: {
        Row: {
          group_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "research_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "research_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      research_groups: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          mentor_id: string | null;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          mentor_id?: string | null;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          mentor_id?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          assignment_id: string;
          content: string;
          feedback: string | null;
          grade: string | null;
          id: string;
          student_id: string;
          submitted_at: string;
        };
        Insert: {
          assignment_id: string;
          content: string;
          feedback?: string | null;
          grade?: string | null;
          id?: string;
          student_id: string;
          submitted_at?: string;
        };
        Update: {
          assignment_id?: string;
          content?: string;
          feedback?: string | null;
          grade?: string | null;
          id?: string;
          student_id?: string;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          assignee_id: string;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          division: string;
          due_date: string | null;
          id: string;
          priority: Database["public"]["Enums"]["task_priority"];
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          assignee_id: string;
          completed_at?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          division: string;
          due_date?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          division?: string;
          due_date?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_positions: {
        Row: {
          assigned_at: string;
          id: string;
          position: Database["public"]["Enums"]["position_title"];
          user_id: string;
        };
        Insert: {
          assigned_at?: string;
          id?: string;
          position: Database["public"]["Enums"]["position_title"];
          user_id: string;
        };
        Update: {
          assigned_at?: string;
          id?: string;
          position?: Database["public"]["Enums"]["position_title"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_group_members: {
        Args: { _conversation_id: string; _member_ids: string[] };
        Returns: undefined;
      };
      available_leadership_roles: {
        Args: Record<string, never>;
        Returns: {
          assigned_count: number;
          division: string;
          max_slots: number | null;
          position: string;
          title: string;
        }[];
      };
      create_group_conversation: {
        Args: { _member_ids: string[]; _name: string | null };
        Returns: string;
      };
      default_profile_username: {
        Args: { _email: string; _full_name: string | null; _user_id: string };
        Returns: string;
      };
      has_full_access: { Args: { _user_id: string }; Returns: boolean };
      has_position: {
        Args: {
          _position: Database["public"]["Enums"]["position_title"];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      in_conversation: {
        Args: { _conversation_id: string; _user_id: string };
        Returns: boolean;
      };
      in_research_group: {
        Args: { _group_id: string; _user_id: string };
        Returns: boolean;
      };
      is_conversation_manager: {
        Args: { _conversation_id: string; _user_id: string };
        Returns: boolean;
      };
      is_enrolled: {
        Args: { _course_id: string; _user_id: string };
        Returns: boolean;
      };
      is_officer_or_above: { Args: { _user_id: string }; Returns: boolean };
      is_super_admin: { Args: { _user_id: string }; Returns: boolean };
      leave_group_conversation: {
        Args: { _conversation_id: string };
        Returns: undefined;
      };
      mark_conversation_read: {
        Args: { _conversation_id: string };
        Returns: undefined;
      };
      mentor_of_assignment: {
        Args: { _assignment_id: string; _user_id: string };
        Returns: boolean;
      };
      owns_course: {
        Args: { _course_id: string; _user_id: string };
        Returns: boolean;
      };
      remove_group_member: {
        Args: { _conversation_id: string; _member_id: string };
        Returns: undefined;
      };
      rename_group_conversation: {
        Args: { _conversation_id: string; _name: string | null };
        Returns: undefined;
      };
      search_members: {
        Args: { _limit?: number; _query: string };
        Returns: {
          avatar_url: string | null;
          full_name: string | null;
          id: string;
          primary_position: Database["public"]["Enums"]["position_title"] | null;
          username: string;
        }[];
      };
      start_direct_conversation: {
        Args: { _target_user_id: string };
        Returns: string;
      };
    };
    Enums: {
      announcement_audience: "all" | "executive" | "officers" | "board" | "mentors" | "members";
      announcement_priority: "normal" | "high" | "urgent";
      app_role: "super_admin" | "executive" | "officer" | "board" | "mentor" | "member";
      application_status: "incomplete" | "pending" | "approved" | "rejected";
      conversation_type: "dm" | "group" | "channel";
      message_member_role: "owner" | "admin" | "member";
      meeting_visibility: "all_members" | "leadership" | "mentors" | "custom";
      task_priority: "low" | "normal" | "high" | "urgent";
      task_status: "todo" | "in_progress" | "completed";
      position_title:
        | "founding_president"
        | "deputy_chair_president"
        | "vc_administration"
        | "vc_mentorship"
        | "vc_public_relations"
        | "communications_chair"
        | "outreach_chair"
        | "treasury_chair"
        | "secretary_chair"
        | "technology_chair"
        | "social_media_chair"
        | "website_chair"
        | "applications_chair"
        | "welcome_chair"
        | "board_member"
        | "mentor_biological"
        | "mentor_physical"
        | "mentor_social"
        | "mentor_quantitative"
        | "mentor_computational"
        | "mentor_general"
        | "mentor_in_training"
        | "shadow_mentor"
        | "general_member";
      profile_status: "active" | "suspended";
      rsvp_status: "pending" | "yes" | "no" | "maybe";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      announcement_audience: ["all", "executive", "officers", "board", "mentors", "members"],
      announcement_priority: ["normal", "high", "urgent"],
      app_role: ["super_admin", "executive", "officer", "board", "mentor", "member"],
      application_status: ["incomplete", "pending", "approved", "rejected"],
      conversation_type: ["dm", "group", "channel"],
      message_member_role: ["owner", "admin", "member"],
      meeting_visibility: ["all_members", "leadership", "mentors", "custom"],
      position_title: [
        "founding_president",
        "deputy_chair_president",
        "vc_administration",
        "vc_mentorship",
        "vc_public_relations",
        "communications_chair",
        "outreach_chair",
        "treasury_chair",
        "secretary_chair",
        "technology_chair",
        "social_media_chair",
        "website_chair",
        "applications_chair",
        "welcome_chair",
        "board_member",
        "mentor_biological",
        "mentor_physical",
        "mentor_social",
        "mentor_quantitative",
        "mentor_computational",
        "mentor_general",
        "mentor_in_training",
        "shadow_mentor",
        "general_member",
      ],
      profile_status: ["active", "suspended"],
      rsvp_status: ["pending", "yes", "no", "maybe"],
    },
  },
} as const;
