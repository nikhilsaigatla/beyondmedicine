ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS desired_position text;

CREATE TABLE IF NOT EXISTS public.leadership_role_settings (
  position text PRIMARY KEY,
  title text NOT NULL,
  division text NOT NULL,
  description text,
  max_slots integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.leadership_role_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.leadership_role_settings TO authenticated;
ALTER TABLE public.leadership_role_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadership settings readable" ON public.leadership_role_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leadership settings managed" ON public.leadership_role_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.leadership_role_settings (position, title, division, description, max_slots)
VALUES
  ('founding_president', 'Founder & President', 'Founding Leadership', 'Leads the organization and sets its mission.', 1),
  ('vc_administration', 'Vice Chair of Administration', 'Executive Division', 'Oversees internal operations and administration.', 1),
  ('vc_mentorship', 'Vice Chair of Mentorship', 'Executive Division', 'Oversees mentorship and training programs.', 1),
  ('vc_public_relations', 'Vice Chair of Public Relations', 'Executive Division', 'Oversees public communications and outreach.', 1),
  ('communications_chair', 'Communications Chair', 'Administrative Division', 'Manages member communications and announcements.', 1),
  ('secretary_chair', 'Secretary Chair', 'Administrative Division', 'Maintains records and organizational documentation.', 1),
  ('technology_chair', 'Technology Chair', 'Administrative Division', 'Maintains the portal and technical tools.', 1),
  ('applications_chair', 'Applications Chair', 'Administrative Division', 'Manages membership and leadership applications.', 1),
  ('welcome_chair', 'Welcome Chair', 'Administrative Division', 'Onboards new members.', 1),
  ('social_media_chair', 'Social Media Chair', 'Public Relations Division', 'Leads social content and digital presence.', 1),
  ('outreach_chair', 'Outreach Co-Chair', 'Public Relations Division', 'Coordinates partnerships and community engagement.', 2),
  ('treasury_chair', 'Treasury Co-Chair', 'Public Relations Division', 'Oversees budgeting and fund allocation.', 2),
  ('mentor_biological', 'Mentor of Biological Sciences', 'Mentorship Tracks', 'Guides biological sciences research.', NULL),
  ('mentor_physical', 'Mentor of Physical Sciences', 'Mentorship Tracks', 'Guides physical sciences research.', NULL),
  ('mentor_social', 'Mentor of Social Sciences', 'Mentorship Tracks', 'Guides social sciences research.', NULL),
  ('mentor_quantitative', 'Mentor of Quantitative Sciences', 'Mentorship Tracks', 'Guides quantitative research.', NULL),
  ('mentor_computational', 'Mentor of Computational Sciences', 'Mentorship Tracks', 'Guides computational research.', NULL),
  ('mentor_in_training', 'Mentor in Training', 'Mentorship Training', 'Develops mentorship skills.', 3),
  ('shadow_mentor', 'Shadow Mentor', 'Mentorship Training', 'Learns mentorship through guided practice.', 2)
ON CONFLICT (position) DO NOTHING;
