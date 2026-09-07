CREATE OR REPLACE FUNCTION public.role_rank(_role public.app_role)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _role
    WHEN 'super_admin' THEN 100
    WHEN 'executive' THEN 80
    WHEN 'board' THEN 70
    WHEN 'officer' THEN 60
    WHEN 'mentor' THEN 40
    ELSE 10
  END;
$$;

CREATE OR REPLACE FUNCTION public.position_rank(_position public.position_title)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _position
    WHEN 'founding_president' THEN 100
    WHEN 'deputy_chair_president' THEN 90
    WHEN 'vc_administration' THEN 80
    WHEN 'vc_mentorship' THEN 80
    WHEN 'vc_public_relations' THEN 80
    WHEN 'board_member' THEN 70
    WHEN 'communications_chair' THEN 60
    WHEN 'secretary_chair' THEN 60
    WHEN 'technology_chair' THEN 60
    WHEN 'applications_chair' THEN 60
    WHEN 'welcome_chair' THEN 60
    WHEN 'social_media_chair' THEN 60
    WHEN 'outreach_chair' THEN 60
    WHEN 'treasury_chair' THEN 60
    WHEN 'website_chair' THEN 60
    WHEN 'mentor_biological' THEN 40
    WHEN 'mentor_physical' THEN 40
    WHEN 'mentor_social' THEN 40
    WHEN 'mentor_quantitative' THEN 40
    WHEN 'mentor_computational' THEN 40
    WHEN 'mentor_general' THEN 40
    WHEN 'mentor_in_training' THEN 30
    WHEN 'shadow_mentor' THEN 30
    ELSE 10
  END;
$$;

CREATE OR REPLACE FUNCTION public.actor_rank(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
    COALESCE((SELECT MAX(public.role_rank(role)) FROM public.user_roles WHERE user_id = _user_id), 0),
    COALESCE((SELECT MAX(public.position_rank(position)) FROM public.user_positions WHERE user_id = _user_id), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_position(_user_id uuid, _position public.position_title)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id) OR public.actor_rank(_user_id) > public.position_rank(_position);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id) OR public.actor_rank(_user_id) > public.role_rank(_role);
$$;

DROP POLICY IF EXISTS "roles admin all" ON public.user_roles;
CREATE POLICY "leaders manage lower roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.can_manage_role(auth.uid(), role))
  WITH CHECK (public.can_manage_role(auth.uid(), role));

DROP POLICY IF EXISTS "positions admin all" ON public.user_positions;
CREATE POLICY "leaders manage lower positions" ON public.user_positions
  FOR ALL TO authenticated
  USING (public.can_manage_position(auth.uid(), position))
  WITH CHECK (public.can_manage_position(auth.uid(), position));
