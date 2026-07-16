
CREATE TYPE public.meeting_visibility AS ENUM ('all_members','leadership','mentors','custom');
CREATE TYPE public.rsvp_status AS ENUM ('pending','yes','no','maybe');

CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  meeting_link text,
  visibility meeting_visibility NOT NULL DEFAULT 'all_members',
  agenda text,
  notes text,
  notes_updated_at timestamptz,
  notes_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved members read meetings" ON public.meetings
  FOR SELECT TO authenticated USING (
    public.has_full_access(auth.uid()) AND (
      visibility = 'all_members'
      OR (visibility = 'leadership' AND public.is_officer_or_above(auth.uid()))
      OR (visibility = 'mentors' AND (public.has_role(auth.uid(),'mentor') OR public.is_super_admin(auth.uid())))
      OR visibility = 'custom'
    )
  );
CREATE POLICY "officers create meetings" ON public.meetings
  FOR INSERT TO authenticated WITH CHECK (public.is_officer_or_above(auth.uid()));
CREATE POLICY "officers update meetings" ON public.meetings
  FOR UPDATE TO authenticated USING (public.is_officer_or_above(auth.uid()))
  WITH CHECK (public.is_officer_or_above(auth.uid()));
CREATE POLICY "super admin delete meetings" ON public.meetings
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.meeting_attendees (
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rsvp rsvp_status NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  PRIMARY KEY (meeting_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_attendees TO authenticated;
GRANT ALL ON public.meeting_attendees TO service_role;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendees read" ON public.meeting_attendees
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_officer_or_above(auth.uid())
  );
CREATE POLICY "own rsvp upsert" ON public.meeting_attendees
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_officer_or_above(auth.uid()));
CREATE POLICY "own rsvp update" ON public.meeting_attendees
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_officer_or_above(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_officer_or_above(auth.uid()));
CREATE POLICY "officers remove attendees" ON public.meeting_attendees
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_officer_or_above(auth.uid()));
