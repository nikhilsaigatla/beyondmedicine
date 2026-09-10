CREATE OR REPLACE FUNCTION public.public_signup_location_counts()
RETURNS TABLE(country text, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    initcap(trim(applications.country)) AS country,
    COUNT(*)::bigint AS member_count
  FROM public.applications AS applications
  WHERE applications.country IS NOT NULL
    AND trim(applications.country) <> ''
  GROUP BY initcap(trim(applications.country))
  ORDER BY member_count DESC, country ASC;
$$;

GRANT EXECUTE ON FUNCTION public.public_signup_location_counts() TO anon, authenticated;
