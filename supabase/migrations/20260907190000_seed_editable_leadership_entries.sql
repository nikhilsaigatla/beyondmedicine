CREATE TABLE IF NOT EXISTS public.leadership_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position text NOT NULL,
  title text NOT NULL,
  division text NOT NULL,
  name text,
  image_url text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.leadership_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.leadership_entries TO authenticated;
ALTER TABLE public.leadership_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leadership entries readable" ON public.leadership_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "leadership entries managed" ON public.leadership_entries FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.leadership_entries (position, title, division, name, image_url, description, sort_order) VALUES
('founding_president','Founder & President','Founding Leadership','Nikhil Sai Gatla','/images/nikhil-gatla.jpeg','Founder and President of Beyond Medicine.',1),
('vc_administration','Vice Chair of Administration','Executive Division','Yukta Bhutoria','/images/yukta-bhutoria.jpeg','Oversees internal operations, task delegation, and coordination of administrative workflows.',10),
('vc_mentorship','Vice Chair of Mentorship','Executive Division','Nia Tilokani','/images/nia-tilokani.jpeg','Oversees mentorship programs and training pipelines.',11),
('vc_public_relations','Vice Chair of Public Relations','Executive Division','Sruthi Kalapatapu','/images/sruthi-kalapatapu.jpeg','Oversees external communication, branding, outreach, and public-facing materials.',12),
('communications_chair','Communications Chair','Administrative Division','Aadhya Sri Polkam','/images/aadhya-polkam.jpeg','Manages internal and external messaging, announcements, and member communications.',20),
('secretary_chair','Secretary Chair','Administrative Division','Akshaya Pulluru',NULL,'Maintains records, meeting notes, and organizational documentation.',21),
('welcome_chair','Welcome Chair','Administrative Division','Tanush Ram Rachakonda','/images/tanush-rachakonda.jpg','Onboards new members and ensures a strong first experience.',22),
('technology_chair','Technology Chair','Administrative Division','Xander Martinez',NULL,'Maintains the member portal, website, and internal technical tools.',23),
('applications_chair','Applications Chair','Administrative Division','Sohni Pathan','/images/sohni-pathan.png','Manages membership and leadership applications.',24),
('social_media_chair','Social Media Chair','Public Relations Division','Riley Del Rosario','/images/riley-del-rosario.png','Leads social channels, content calendars, and digital presence.',30),
('outreach_chair','Outreach Co-Chair','Public Relations Division','Yashvi Lokesh',NULL,'Coordinates partnerships, collaborations, and community engagement.',31),
('outreach_chair','Outreach Co-Chair','Public Relations Division',NULL,NULL,'Coordinates partnerships, collaborations, and community engagement.',32),
('treasury_chair','Treasury Co-Chair','Public Relations Division','Hashini Krishna',NULL,'Oversees budgeting, finances, and fund allocation.',33),
('treasury_chair','Treasury Co-Chair','Public Relations Division','Lasya Sri Vemprala',NULL,'Oversees budgeting, finances, and fund allocation.',34),
('mentor_biological','Mentor of Biological Sciences','Mentorship Tracks',NULL,NULL,'Guides research in biology and biomedical sciences.',40),
('mentor_physical','Mentor of Physical Sciences','Mentorship Tracks',NULL,NULL,'Guides research in physics, chemistry, and physical sciences.',41),
('mentor_social','Mentor of Social Sciences','Mentorship Tracks',NULL,NULL,'Guides research in psychology, sociology, and related fields.',42),
('mentor_quantitative','Mentor of Quantitative Sciences','Mentorship Tracks',NULL,NULL,'Guides research in mathematics, statistics, and quantitative methods.',43),
('mentor_computational','Mentor of Computational Sciences','Mentorship Tracks',NULL,NULL,'Guides research in computer science, data science, and computational methods.',44),
('mentor_in_training','Mentor in Training','Mentorship Training',NULL,NULL,'Develops mentorship skills through structured training.',50),
('mentor_in_training','Mentor in Training','Mentorship Training',NULL,NULL,'Develops mentorship skills through structured training.',51),
('mentor_in_training','Mentor in Training','Mentorship Training',NULL,NULL,'Develops mentorship skills through structured training.',52),
('shadow_mentor','Shadow Mentor','Mentorship Training',NULL,NULL,'Shadows senior mentors to learn mentorship practices.',53),
('shadow_mentor','Shadow Mentor','Mentorship Training',NULL,NULL,'Shadows senior mentors to learn mentorship practices.',54);
