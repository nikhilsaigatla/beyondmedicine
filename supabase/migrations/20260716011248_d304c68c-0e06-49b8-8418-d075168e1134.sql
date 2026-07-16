
-- Application status enum
CREATE TYPE public.application_status AS ENUM ('incomplete','pending','approved','rejected');

-- Applications table
CREATE TABLE public.applications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'incomplete',
  full_name text,
  grade_level text,
  country text,
  state_region text,
  county text,
  school text,
  email text,
  phone text,
  time_zone text,
  discovery_source text,
  interests text[] NOT NULL DEFAULT '{}',
  custom_interests text[] NOT NULL DEFAULT '{}',
  research_experience boolean,
  research_experience_details text,
  cohort_preference text,
  notes text,
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own application readable" ON public.applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "officers read all applications" ON public.applications
  FOR SELECT TO authenticated USING (public.is_officer_or_above(auth.uid()));
CREATE POLICY "own application upsertable" ON public.applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own application editable" ON public.applications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins update applications" ON public.applications
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Full access helper
CREATE OR REPLACE FUNCTION public.has_full_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
      OR EXISTS (SELECT 1 FROM public.applications WHERE user_id = _user_id AND status = 'approved');
$$;

-- Profile status
CREATE TYPE public.profile_status AS ENUM ('active','suspended');
ALTER TABLE public.profiles ADD COLUMN status profile_status NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN research_interests text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN time_zone text;
ALTER TABLE public.profiles ADD COLUMN phone text;
ALTER TABLE public.profiles ADD COLUMN school text;

-- Extend handle_new_user to also seed applications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(NEW.email) = 'nikhil.sai.gatla.nsg@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_positions (user_id, position) VALUES (NEW.id, 'founding_president') ON CONFLICT DO NOTHING;
    INSERT INTO public.applications (user_id, status, full_name, email, submitted_at, decided_at)
      VALUES (NEW.id, 'approved',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email, now(), now())
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_positions (user_id, position) VALUES (NEW.id, 'general_member') ON CONFLICT DO NOTHING;
    INSERT INTO public.applications (user_id, status, email)
      VALUES (NEW.id, 'incomplete', NEW.email)
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill applications for existing users
INSERT INTO public.applications (user_id, status, email, full_name, submitted_at, decided_at)
SELECT p.id, CASE WHEN public.is_super_admin(p.id) THEN 'approved'::application_status ELSE 'incomplete'::application_status END,
       p.email, p.full_name,
       CASE WHEN public.is_super_admin(p.id) THEN now() END,
       CASE WHEN public.is_super_admin(p.id) THEN now() END
FROM public.profiles p
ON CONFLICT DO NOTHING;

-- Announcement extras
ALTER TABLE public.announcements ADD COLUMN email_notify boolean NOT NULL DEFAULT false;
ALTER TABLE public.announcements ADD COLUMN distribute_public boolean NOT NULL DEFAULT false;
