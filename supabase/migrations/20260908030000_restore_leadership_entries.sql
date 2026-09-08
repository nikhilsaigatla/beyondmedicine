-- Restore the original leadership_entries template + photos if the table was
-- emptied by an earlier data clear. Guarded so it's a no-op if rows already exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.leadership_entries) THEN
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
  END IF;
END $$;

-- Reconnect entries to real accounts by matching name -> profiles.full_name.
UPDATE public.leadership_entries AS entries
SET assignee_id = profiles.id
FROM public.profiles AS profiles
WHERE entries.assignee_id IS NULL
  AND entries.name IS NOT NULL
  AND lower(trim(entries.name)) = lower(trim(profiles.full_name));
