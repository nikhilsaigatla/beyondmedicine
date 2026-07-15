
CREATE TYPE public.app_role AS ENUM ('super_admin','executive','officer','board','mentor','member');
CREATE TYPE public.position_title AS ENUM (
  'founding_president','deputy_chair_president',
  'vc_administration','vc_mentorship','vc_public_relations',
  'communications_chair','outreach_chair','treasury_chair','secretary_chair',
  'social_media_chair','website_chair','applications_chair','welcome_chair',
  'board_member',
  'mentor_biological','mentor_physical','mentor_social',
  'mentor_quantitative','mentor_computational','mentor_general',
  'mentor_in_training','shadow_mentor','general_member'
);
CREATE TYPE public.announcement_priority AS ENUM ('normal','high','urgent');
CREATE TYPE public.announcement_audience AS ENUM ('all','executive','officers','board','mentors','members');
CREATE TYPE public.conversation_type AS ENUM ('dm','group','channel');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT, avatar_url TEXT, bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position public.position_title NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, position)
);
CREATE UNIQUE INDEX one_founding_president ON public.user_positions (position) WHERE position = 'founding_president';
GRANT SELECT ON public.user_positions TO authenticated;
GRANT ALL ON public.user_positions TO service_role;
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mentor_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, student_id)
);
GRANT SELECT ON public.mentor_students TO authenticated;
GRANT ALL ON public.mentor_students TO service_role;
ALTER TABLE public.mentor_students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.research_groups TO authenticated;
GRANT ALL ON public.research_groups TO service_role;
ALTER TABLE public.research_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.research_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (group_id, user_id)
);
GRANT SELECT ON public.research_group_members TO authenticated;
GRANT ALL ON public.research_group_members TO service_role;
ALTER TABLE public.research_group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT NOT NULL,
  priority public.announcement_priority NOT NULL DEFAULT 'normal',
  audience public.announcement_audience NOT NULL DEFAULT 'all',
  requires_ack BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.announcement_acks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);
GRANT SELECT, INSERT ON public.announcement_acks TO authenticated;
GRANT ALL ON public.announcement_acks TO service_role;
ALTER TABLE public.announcement_acks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (course_id, student_id)
);
GRANT SELECT, INSERT, DELETE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL, feedback TEXT, grade TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.conversation_type NOT NULL DEFAULT 'dm',
  name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ================= FUNCTIONS =================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_position(_user_id UUID, _position public.position_title)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_positions WHERE user_id = _user_id AND position = _position);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_officer_or_above(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','executive','officer'));
$$;

CREATE OR REPLACE FUNCTION public.in_research_group(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.research_group_members WHERE user_id = _user_id AND group_id = _group_id);
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.course_enrollments WHERE student_id = _user_id AND course_id = _course_id);
$$;

CREATE OR REPLACE FUNCTION public.owns_course(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = _course_id AND mentor_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.mentor_of_assignment(_user_id UUID, _assignment_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.assignments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = _assignment_id AND c.mentor_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.in_conversation(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE user_id = _user_id AND conversation_id = _conversation_id);
$$;

-- ================= POLICIES =================
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profile self-update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profile self-insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profile admin all" ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "roles self-read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles admin all" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "positions readable" ON public.user_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "positions admin all" ON public.user_positions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "pairings visible" ON public.mentor_students FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = student_id OR public.is_super_admin(auth.uid()));
CREATE POLICY "pairings admin all" ON public.mentor_students FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "groups visible" ON public.research_groups FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id OR public.in_research_group(auth.uid(), id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "groups admin all" ON public.research_groups FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "group members visible" ON public.research_group_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.in_research_group(auth.uid(), group_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "group members admin all" ON public.research_group_members FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "announcements readable" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "officers create announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_officer_or_above(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "author or admin updates announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.is_super_admin(auth.uid()));
CREATE POLICY "author or admin deletes announcements" ON public.announcements FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "acks self-read" ON public.announcement_acks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));
CREATE POLICY "acks self-insert" ON public.announcement_acks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "courses visible to participants" ON public.courses FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id OR public.is_enrolled(auth.uid(), id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "courses mentor manages" ON public.courses FOR ALL TO authenticated
  USING (auth.uid() = mentor_id OR public.is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = mentor_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "enrollments visible" ON public.course_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR public.owns_course(auth.uid(), course_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "enrollments mentor manages" ON public.course_enrollments FOR ALL TO authenticated
  USING (public.owns_course(auth.uid(), course_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.owns_course(auth.uid(), course_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "assignments visible" ON public.assignments FOR SELECT TO authenticated
  USING (public.owns_course(auth.uid(), course_id) OR public.is_enrolled(auth.uid(), course_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "assignments mentor manages" ON public.assignments FOR ALL TO authenticated
  USING (public.owns_course(auth.uid(), course_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.owns_course(auth.uid(), course_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "submissions visible" ON public.submissions FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR public.mentor_of_assignment(auth.uid(), assignment_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "submissions student inserts" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "submissions student or mentor updates" ON public.submissions FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR public.mentor_of_assignment(auth.uid(), assignment_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "conversations visible" ON public.conversations FOR SELECT TO authenticated
  USING (public.in_conversation(auth.uid(), id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "conversations self-create" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversation members visible" ON public.conversation_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.in_conversation(auth.uid(), conversation_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "conversation members insert" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (public.in_conversation(auth.uid(), conversation_id) OR auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "messages visible" ON public.messages FOR SELECT TO authenticated
  USING (public.in_conversation(auth.uid(), conversation_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "messages send" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.in_conversation(auth.uid(), conversation_id));

-- ================= SIGNUP TRIGGER =================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(NEW.email) = 'nikhil.sai.gatla.nsg@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_positions (user_id, position) VALUES (NEW.id, 'founding_president') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_positions (user_id, position) VALUES (NEW.id, 'general_member') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime for messages and announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
