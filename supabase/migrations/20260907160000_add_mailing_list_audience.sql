ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS email_division text;

CREATE OR REPLACE FUNCTION public.can_manage_mailing_list(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_applications(_user_id);
$$;
