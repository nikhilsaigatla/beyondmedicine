CREATE OR REPLACE FUNCTION public.can_manage_applications(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
    OR public.has_role(_user_id, 'executive')
    OR public.has_role(_user_id, 'officer')
    OR public.has_position(_user_id, 'applications_chair');
$$;

DROP POLICY IF EXISTS "officers read all applications" ON public.applications;
CREATE POLICY "application managers read all applications" ON public.applications
  FOR SELECT TO authenticated
  USING (public.can_manage_applications(auth.uid()));

DROP POLICY IF EXISTS "admins update applications" ON public.applications;
CREATE POLICY "application managers update applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (public.can_manage_applications(auth.uid()))
  WITH CHECK (public.can_manage_applications(auth.uid()));
