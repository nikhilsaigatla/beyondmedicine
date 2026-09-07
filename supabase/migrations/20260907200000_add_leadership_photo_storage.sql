INSERT INTO storage.buckets (id, name, public)
VALUES ('leadership-photos', 'leadership-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "leadership photos public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'leadership-photos');

CREATE POLICY "leadership photos admin upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leadership-photos' AND public.is_super_admin(auth.uid()));

CREATE POLICY "leadership photos admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'leadership-photos' AND public.is_super_admin(auth.uid()))
WITH CHECK (bucket_id = 'leadership-photos' AND public.is_super_admin(auth.uid()));

CREATE POLICY "leadership photos admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'leadership-photos' AND public.is_super_admin(auth.uid()));
