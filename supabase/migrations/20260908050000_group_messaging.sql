-- Extend the existing messaging model for username-based DMs and group chats.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_member_role') THEN
    CREATE TYPE public.message_member_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.default_profile_username(_email text, _full_name text, _user_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH raw AS (
    SELECT COALESCE(NULLIF(split_part(_email, '@', 1), ''), NULLIF(_full_name, ''), 'member') AS value
  ),
  cleaned AS (
    SELECT trim(both '_' FROM regexp_replace(lower(value), '[^a-z0-9_]+', '_', 'g')) AS value
    FROM raw
  )
  SELECT left(CASE WHEN length(value) < 3 THEN value || '_bm' ELSE value END, 19)
    || '_' || substring(replace(_user_id::text, '-', '') FROM 1 FOR 12)
  FROM cleaned;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

UPDATE public.profiles
SET username = public.default_profile_username(email, full_name, id)
WHERE username IS NULL OR btrim(username) = '';

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username ~ '^[a-z0-9_]{3,32}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username));

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.conversations
SET updated_at = created_at
WHERE updated_at IS NULL;

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS role public.message_member_role NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

UPDATE public.conversation_members AS members
SET role = 'owner'
FROM public.conversations AS conversations
WHERE conversations.id = members.conversation_id
  AND conversations.created_by = members.user_id
  AND conversations.type = 'group';

CREATE INDEX IF NOT EXISTS conversation_members_user_id_idx
  ON public.conversation_members (user_id);

CREATE INDEX IF NOT EXISTS conversation_members_conversation_id_idx
  ON public.conversation_members (conversation_id);

CREATE INDEX IF NOT EXISTS conversation_members_last_read_idx
  ON public.conversation_members (user_id, last_read_at);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conversations_updated_at_idx
  ON public.conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS profiles_username_search_idx
  ON public.profiles (lower(username) text_pattern_ops);

CREATE OR REPLACE FUNCTION public.touch_conversation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.conversations SET updated_at = now() WHERE id = OLD.conversation_id;
    RETURN OLD;
  END IF;

  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_touch_conversation ON public.messages;
CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated_at();

DROP TRIGGER IF EXISTS members_touch_conversation ON public.conversation_members;
CREATE TRIGGER members_touch_conversation
  AFTER INSERT OR DELETE ON public.conversation_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated_at();

CREATE OR REPLACE FUNCTION public.is_conversation_manager(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.conversation_members
      WHERE conversation_id = _conversation_id
        AND user_id = _user_id
        AND role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.search_members(_query text, _limit integer DEFAULT 8)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  primary_position public.position_title
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url, positions.position
  FROM public.profiles AS p
  LEFT JOIN LATERAL (
    SELECT up.position
    FROM public.user_positions AS up
    WHERE up.user_id = p.id
    ORDER BY up.assigned_at ASC
    LIMIT 1
  ) AS positions ON true
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND p.status = 'active'
    AND length(trim(_query)) >= 2
    AND (
      lower(p.username) = lower(trim(_query))
      OR lower(p.username) LIKE lower(trim(_query)) || '%'
      OR lower(COALESCE(p.full_name, '')) LIKE '%' || lower(trim(_query)) || '%'
    )
  ORDER BY
    CASE WHEN lower(p.username) = lower(trim(_query)) THEN 0 ELSE 1 END,
    p.full_name NULLS LAST,
    p.username
  LIMIT LEAST(GREATEST(COALESCE(_limit, 8), 1), 20);
$$;

CREATE OR REPLACE FUNCTION public.start_direct_conversation(_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _target_user_id IS NULL OR _target_user_id = actor_id THEN
    RAISE EXCEPTION 'Choose another member';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _target_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  SELECT c.id INTO existing_id
  FROM public.conversations AS c
  JOIN public.conversation_members AS mine
    ON mine.conversation_id = c.id AND mine.user_id = actor_id
  JOIN public.conversation_members AS theirs
    ON theirs.conversation_id = c.id AND theirs.user_id = _target_user_id
  WHERE c.type = 'dm'
    AND (
      SELECT count(*)
      FROM public.conversation_members AS cm
      WHERE cm.conversation_id = c.id
    ) = 2
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  INSERT INTO public.conversations (type, created_by)
  VALUES ('dm', actor_id)
  RETURNING id INTO new_id;

  INSERT INTO public.conversation_members (conversation_id, user_id, role, last_read_at)
  VALUES
    (new_id, actor_id, 'member', now()),
    (new_id, _target_user_id, 'member', NULL);

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_conversation(_name text, _member_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  new_id uuid;
  clean_name text := NULLIF(btrim(COALESCE(_name, '')), '');
  requested_count integer;
  valid_count integer;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH requested AS (
    SELECT DISTINCT member_id
    FROM unnest(COALESCE(_member_ids, ARRAY[]::uuid[])) AS member_id
    WHERE member_id IS NOT NULL AND member_id <> actor_id
  )
  SELECT count(*) INTO requested_count FROM requested;

  IF requested_count < 2 THEN
    RAISE EXCEPTION 'Choose at least two other members';
  END IF;

  WITH requested AS (
    SELECT DISTINCT member_id
    FROM unnest(COALESCE(_member_ids, ARRAY[]::uuid[])) AS member_id
    WHERE member_id IS NOT NULL AND member_id <> actor_id
  )
  SELECT count(*) INTO valid_count
  FROM requested
  JOIN public.profiles AS p ON p.id = requested.member_id AND p.status = 'active';

  IF valid_count <> requested_count THEN
    RAISE EXCEPTION 'One or more members could not be added';
  END IF;

  INSERT INTO public.conversations (type, name, created_by)
  VALUES ('group', clean_name, actor_id)
  RETURNING id INTO new_id;

  INSERT INTO public.conversation_members (conversation_id, user_id, role, last_read_at)
  VALUES (new_id, actor_id, 'owner', now());

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT new_id, member_id, 'member'
  FROM (
    SELECT DISTINCT member_id
    FROM unnest(_member_ids) AS member_id
    WHERE member_id IS NOT NULL AND member_id <> actor_id
  ) AS members;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = _conversation_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rename_group_conversation(_conversation_id uuid, _name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_conversation_manager(auth.uid(), _conversation_id) THEN
    RAISE EXCEPTION 'You cannot rename this group';
  END IF;

  UPDATE public.conversations
  SET name = NULLIF(btrim(COALESCE(_name, '')), ''),
      updated_at = now()
  WHERE id = _conversation_id
    AND type = 'group';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_group_members(_conversation_id uuid, _member_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  requested_count integer;
  valid_count integer;
BEGIN
  IF NOT public.is_conversation_manager(actor_id, _conversation_id) THEN
    RAISE EXCEPTION 'You cannot add members to this group';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = _conversation_id AND type = 'group') THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  WITH requested AS (
    SELECT DISTINCT member_id
    FROM unnest(COALESCE(_member_ids, ARRAY[]::uuid[])) AS member_id
    WHERE member_id IS NOT NULL AND member_id <> actor_id
  )
  SELECT count(*) INTO requested_count FROM requested;

  IF requested_count = 0 THEN
    RETURN;
  END IF;

  WITH requested AS (
    SELECT DISTINCT member_id
    FROM unnest(COALESCE(_member_ids, ARRAY[]::uuid[])) AS member_id
    WHERE member_id IS NOT NULL AND member_id <> actor_id
  )
  SELECT count(*) INTO valid_count
  FROM requested
  JOIN public.profiles AS p ON p.id = requested.member_id AND p.status = 'active';

  IF valid_count <> requested_count THEN
    RAISE EXCEPTION 'One or more members could not be added';
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT _conversation_id, member_id, 'member'
  FROM (
    SELECT DISTINCT member_id
    FROM unnest(_member_ids) AS member_id
    WHERE member_id IS NOT NULL AND member_id <> actor_id
  ) AS members
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_group_member(_conversation_id uuid, _member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_role public.message_member_role;
  target_role public.message_member_role;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _member_id = actor_id THEN
    PERFORM public.leave_group_conversation(_conversation_id);
    RETURN;
  END IF;

  SELECT role INTO actor_role
  FROM public.conversation_members
  WHERE conversation_id = _conversation_id AND user_id = actor_id;

  SELECT role INTO target_role
  FROM public.conversation_members
  WHERE conversation_id = _conversation_id AND user_id = _member_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.is_super_admin(actor_id) AND actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'You cannot remove members from this group';
  END IF;

  IF actor_role = 'admin' AND target_role IN ('owner', 'admin') AND NOT public.is_super_admin(actor_id) THEN
    RAISE EXCEPTION 'Admins can only remove regular members';
  END IF;

  IF target_role = 'owner' AND NOT public.is_super_admin(actor_id) THEN
    RAISE EXCEPTION 'The owner cannot be removed';
  END IF;

  DELETE FROM public.conversation_members
  WHERE conversation_id = _conversation_id
    AND user_id = _member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_group_conversation(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_role public.message_member_role;
  member_count integer;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO actor_role
  FROM public.conversation_members
  WHERE conversation_id = _conversation_id AND user_id = actor_id;

  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = _conversation_id AND type = 'group') THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  SELECT count(*) INTO member_count
  FROM public.conversation_members
  WHERE conversation_id = _conversation_id;

  IF actor_role = 'owner' AND member_count > 1 THEN
    RAISE EXCEPTION 'Transfer ownership before leaving this group';
  END IF;

  DELETE FROM public.conversation_members
  WHERE conversation_id = _conversation_id
    AND user_id = actor_id;

  IF member_count <= 1 THEN
    DELETE FROM public.conversations WHERE id = _conversation_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    public.default_profile_username(
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.id
    )
  )
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

DROP POLICY IF EXISTS "conversation members insert" ON public.conversation_members;
CREATE POLICY "conversation members self bootstrap" ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE id = conversation_id
        AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conversation members self read update" ON public.conversation_members;
CREATE POLICY "conversation members self read update" ON public.conversation_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.default_profile_username(text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_manager(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_members(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_group_conversation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_group_members(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group_conversation(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.search_members(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_direct_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_conversation_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rename_group_conversation(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_group_members(uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.remove_group_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.leave_group_conversation(uuid) FROM anon;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
