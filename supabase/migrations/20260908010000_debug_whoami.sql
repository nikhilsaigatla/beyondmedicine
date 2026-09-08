-- Temporary diagnostic: lets the client ask Postgres what auth.uid()/auth.role()
-- resolve to for the current request, to debug why "profile self-update" RLS
-- matches 0 rows for legitimate self-updates. Safe to drop after debugging.
CREATE OR REPLACE FUNCTION public.debug_whoami()
RETURNS TABLE(uid uuid, role text)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT auth.uid(), auth.role();
$$;
GRANT EXECUTE ON FUNCTION public.debug_whoami() TO authenticated;
