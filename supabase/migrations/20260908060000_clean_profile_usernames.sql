-- Replace hash-tail fallback usernames with readable handles based on full name.

CREATE OR REPLACE FUNCTION public.profile_username_base(_email text, _full_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH raw AS (
    SELECT COALESCE(NULLIF(btrim(_full_name), ''), NULLIF(split_part(_email, '@', 1), ''), 'member') AS value
  ),
  cleaned AS (
    SELECT btrim(regexp_replace(lower(value), '[^a-z0-9]+', '_', 'g'), '_') AS value
    FROM raw
  )
  SELECT left(
    CASE
      WHEN value = '' THEN 'member'
      WHEN length(value) < 3 THEN value || '_bm'
      ELSE value
    END,
    28
  )
  FROM cleaned;
$$;

CREATE OR REPLACE FUNCTION public.allocate_profile_username(_email text, _full_name text, _user_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text := public.profile_username_base(_email, _full_name);
  candidate text := base_username;
  suffix integer := 1;
BEGIN
  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(candidate)
      AND (_user_id IS NULL OR id <> _user_id)
  ) LOOP
    suffix := suffix + 1;
    candidate := left(base_username, greatest(1, 31 - length(suffix::text))) || '_' || suffix::text;
  END LOOP;

  RETURN candidate;
END;
$$;

DO $$
DECLARE
  profile_row record;
BEGIN
  FOR profile_row IN
    SELECT id, email, full_name
    FROM public.profiles
    WHERE username ~ '^[a-z0-9_]+_[0-9a-f]{12}$'
  LOOP
    UPDATE public.profiles
    SET username = public.allocate_profile_username(profile_row.email, profile_row.full_name, profile_row.id)
    WHERE id = profile_row.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.default_profile_username(_email text, _full_name text, _user_id uuid)
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT public.allocate_profile_username(_email, _full_name, _user_id);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    NEW.email,
    display_name,
    NEW.raw_user_meta_data->>'avatar_url',
    public.allocate_profile_username(NEW.email, display_name, NEW.id)
  )
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(NEW.email) = 'nikhil.sai.gatla.nsg@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_positions (user_id, position) VALUES (NEW.id, 'founding_president') ON CONFLICT DO NOTHING;
    INSERT INTO public.applications (user_id, status, full_name, email, submitted_at, decided_at)
      VALUES (NEW.id, 'approved', display_name, NEW.email, now(), now())
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

REVOKE EXECUTE ON FUNCTION public.profile_username_base(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.allocate_profile_username(text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.default_profile_username(text, text, uuid) FROM PUBLIC, anon;

NOTIFY pgrst, 'reload schema';
