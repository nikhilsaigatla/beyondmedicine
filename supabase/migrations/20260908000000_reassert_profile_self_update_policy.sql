-- Re-create the self-update policy on profiles in case it was dropped or never
-- applied to the live project — this is what silently blocked members from
-- saving their own name/phone/bio/avatar (update() returns 0 rows, no error).
DROP POLICY IF EXISTS "profile self-update" ON public.profiles;
CREATE POLICY "profile self-update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
