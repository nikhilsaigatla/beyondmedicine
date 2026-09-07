CREATE POLICY "users upload own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leadership-photos'
  AND name LIKE 'profiles/' || auth.uid()::text || '/%'
);

CREATE POLICY "users update own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'leadership-photos' AND name LIKE 'profiles/' || auth.uid()::text || '/%')
WITH CHECK (bucket_id = 'leadership-photos' AND name LIKE 'profiles/' || auth.uid()::text || '/%');
