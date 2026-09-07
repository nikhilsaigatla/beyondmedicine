ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';

UPDATE public.profiles AS profiles
SET verification_status = CASE
  WHEN applications.status = 'approved' THEN 'verified'
  ELSE 'unverified'
END
FROM public.applications AS applications
WHERE applications.user_id = profiles.id;

CREATE OR REPLACE FUNCTION public.sync_profile_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET verification_status = CASE
    WHEN NEW.status = 'approved' THEN 'verified'
    ELSE 'unverified'
  END
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_sync_profile_verification ON public.applications;
CREATE TRIGGER applications_sync_profile_verification
  AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_verification_status();
