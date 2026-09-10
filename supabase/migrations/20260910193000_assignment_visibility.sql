ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
  CHECK (status IN ('published', 'hidden'));

CREATE INDEX IF NOT EXISTS assignments_status_course_idx
  ON public.assignments (status, course_id);

DROP POLICY IF EXISTS "assignments visible" ON public.assignments;
CREATE POLICY "assignments visible" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    public.owns_course(auth.uid(), course_id)
    OR public.is_super_admin(auth.uid())
    OR (status = 'published' AND public.is_enrolled(auth.uid(), course_id))
  );

DROP POLICY IF EXISTS "submissions student inserts" ON public.submissions;
CREATE POLICY "submissions student inserts" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.id = assignment_id
        AND a.status = 'published'
        AND public.is_enrolled(auth.uid(), a.course_id)
    )
  );
