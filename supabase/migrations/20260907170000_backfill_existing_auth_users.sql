-- Seed public records for Auth users that existed before the public signup trigger.
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users AS u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'member'
FROM public.profiles AS p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles AS r WHERE r.user_id = p.id
)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_positions (user_id, position)
SELECT p.id, 'general_member'
FROM public.profiles AS p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_positions AS position WHERE position.user_id = p.id
)
ON CONFLICT (user_id, position) DO NOTHING;

INSERT INTO public.applications (user_id, status, email, full_name)
SELECT p.id, 'incomplete', p.email, p.full_name
FROM public.profiles AS p
WHERE NOT EXISTS (
  SELECT 1 FROM public.applications AS application WHERE application.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;
