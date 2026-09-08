-- Drops the temporary auth.uid() diagnostic added while debugging the
-- profile-settings save failure (root cause was a wiped profiles row, not RLS).
DROP FUNCTION IF EXISTS public.debug_whoami();
