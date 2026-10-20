/** Additions in 20261019000000_member_portal.sql. Regenerate with Supabase after deployment. */
type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};
export type NotificationPreferences = {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  sms_consent_at: string | null;
  phone: string | null;
  categories: string[];
  updated_at: string;
};
export type PortalEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  location: string;
  meeting_link: string | null;
  requirements: string;
  capacity: number | null;
  registration_deadline: string | null;
  reminder_hours: number | null;
  cancelled: boolean;
  course_id: string | null;
  created_by: string;
  updated_at: string;
};
export type CohortApplication = {
  id: string;
  user_id: string;
  cohort: string;
  status: string;
  topic: string;
  experience: string;
  skills: string;
  previous_work: string;
  paper_path: string | null;
  decision: string | null;
  placement_course_id: string | null;
  submitted_at: string | null;
  updated_at: string;
};
export type PortalTables = {
  notification_preferences: Table<NotificationPreferences, "user_id">;
  notifications: Table<
    {
      id: string;
      user_id: string;
      category: string;
      title: string;
      body: string;
      link: string;
      dedupe_key: string;
      read_at: string | null;
      created_at: string;
    },
    "user_id" | "category" | "title" | "body" | "link" | "dedupe_key"
  >;
  notification_deliveries: Table<
    {
      id: string;
      notification_id: string;
      channel: string;
      status: string;
      attempts: number;
      available_at: string;
      locked_at: string | null;
      provider_id: string | null;
      last_error: string | null;
    },
    "notification_id" | "channel"
  >;
  course_posts: Table<
    {
      id: string;
      course_id: string;
      author_id: string;
      kind: string;
      title: string;
      body: string;
      created_at: string;
    },
    "course_id" | "author_id" | "title" | "body"
  >;
  course_replies: Table<
    { id: string; post_id: string; author_id: string; body: string; created_at: string },
    "post_id" | "author_id" | "body"
  >;
  help_tickets: Table<
    {
      id: string;
      requester_id: string;
      subject: string;
      status: string;
      assigned_to: string | null;
      created_at: string;
    },
    "requester_id" | "subject"
  >;
  help_replies: Table<
    { id: string; ticket_id: string; author_id: string; body: string; created_at: string },
    "ticket_id" | "author_id" | "body"
  >;
  portal_events: Table<PortalEvent, "title" | "starts_at" | "ends_at" | "created_by">;
  event_registrations: Table<
    { event_id: string; user_id: string; created_at: string },
    "event_id" | "user_id"
  >;
  cohort_applications: Table<CohortApplication, "user_id" | "cohort">;
  interview_slots: Table<
    {
      id: string;
      mentor_id: string;
      leader_id: string;
      cohort: string;
      starts_at: string;
      ends_at: string;
      meeting_link: string;
    },
    "mentor_id" | "leader_id" | "starts_at" | "ends_at" | "meeting_link"
  >;
  interview_bookings: Table<
    { id: string; slot_id: string; application_id: string; created_at: string },
    "slot_id" | "application_id"
  >;
};
export type PortalFunctions = {
  save_admissions_assignment: {
    Args: {
      _assignment: string | null;
      _payload: import("@/integrations/supabase/types").Json;
      _targets?: string[];
    };
    Returns: string;
  };
  portal_unread_message_count: { Args: Record<string, never>; Returns: number };
  portal_officer: { Args: { _user: string }; Returns: boolean };
  portal_event_counts: {
    Args: Record<string, never>;
    Returns: { event_id: string; registration_count: number }[];
  };
  available_interview_slots: {
    Args: Record<string, never>;
    Returns: {
      id: string;
      mentor_id: string;
      leader_id: string;
      cohort: string;
      starts_at: string;
      ends_at: string;
    }[];
  };
  move_course_enrollment: {
    Args: { _student: string; _course: string; _from?: string | null };
    Returns: undefined;
  };
  portal_reviewers: {
    Args: Record<string, never>;
    Returns: { id: string; full_name: string | null; is_mentor: boolean; is_officer: boolean }[];
  };
  portal_directory: {
    Args: Record<string, never>;
    Returns: {
      id: string;
      full_name: string | null;
      username: string;
      avatar_url: string | null;
    }[];
  };
  register_portal_event: { Args: { _event: string; _cancel?: boolean }; Returns: undefined };
  save_cohort_portfolio: {
    Args: {
      _topic: string;
      _experience: string;
      _skills: string;
      _previous_work: string;
      _paper_path: string | null;
      _submit?: boolean;
    };
    Returns: undefined;
  };
  book_cohort_interview: { Args: { _slot: string }; Returns: undefined };
  review_cohort_application: {
    Args: {
      _application: string;
      _status: string;
      _decision?: string | null;
      _course?: string | null;
    };
    Returns: undefined;
  };
  queue_portal_reminders: { Args: Record<string, never>; Returns: undefined };
  claim_notification_deliveries: {
    Args: { _limit?: number };
    Returns: PortalTables["notification_deliveries"]["Row"][];
  };
};
