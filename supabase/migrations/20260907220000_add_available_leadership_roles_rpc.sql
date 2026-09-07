CREATE OR REPLACE FUNCTION public.available_leadership_roles()
RETURNS TABLE("position" text, title text, division text, max_slots integer, assigned_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT settings.position AS "position",
    settings.title,
    settings.division,
    settings.max_slots,
    COUNT(user_positions.id)::bigint AS assigned_count
  FROM public.leadership_role_settings AS settings
  LEFT JOIN public.user_positions AS user_positions
    ON user_positions.position::text = settings.position
  GROUP BY settings.position, settings.title, settings.division, settings.max_slots
  ORDER BY settings.division, settings.title;
$$;

GRANT EXECUTE ON FUNCTION public.available_leadership_roles() TO anon, authenticated;
