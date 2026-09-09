-- Paste this into the Supabase SQL Editor for the project used by .env:
-- https://bkpioxqomigkaupkqfss.supabase.co
--
-- It creates the admissions assignment workspace tables, RLS policies,
-- helper functions, realtime publication entries, and private upload bucket.

DO $$
BEGIN
  CREATE TYPE public.admissions_assignment_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.admissions_submission_status AS ENUM ('draft', 'submitted', 'late', 'reviewed', 'returned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.admissions_submission_type AS ENUM ('text', 'file');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.admissions_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  instructions text,
  due_at timestamptz,
  points numeric(7,2),
  submission_types public.admissions_submission_type[] NOT NULL DEFAULT ARRAY['text']::public.admissions_submission_type[],
  allowed_file_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  max_file_size_mb integer NOT NULL DEFAULT 10 CHECK (max_file_size_mb BETWEEN 1 AND 50),
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_status public.application_status,
  allow_resubmissions boolean NOT NULL DEFAULT true,
  status public.admissions_assignment_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admissions_assignment_targets (
  assignment_id uuid NOT NULL REFERENCES public.admissions_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (assignment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.admissions_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.admissions_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.admissions_submission_status NOT NULL DEFAULT 'draft',
  text_response text,
  file_paths text[] NOT NULL DEFAULT ARRAY[]::text[],
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback text,
  score numeric(7,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX IF NOT EXISTS admissions_assignments_status_due_idx
  ON public.admissions_assignments (status, due_at);
CREATE INDEX IF NOT EXISTS admissions_assignments_target_status_idx
  ON public.admissions_assignments (target_status);
CREATE INDEX IF NOT EXISTS admissions_assignment_targets_user_idx
  ON public.admissions_assignment_targets (user_id);
CREATE INDEX IF NOT EXISTS admissions_submissions_assignment_idx
  ON public.admissions_assignment_submissions (assignment_id);
CREATE INDEX IF NOT EXISTS admissions_submissions_user_status_idx
  ON public.admissions_assignment_submissions (user_id, status);

CREATE OR REPLACE FUNCTION public.can_manage_admissions_assignments(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_applications(_user_id)
    OR public.has_role(_user_id, 'mentor');
$$;

CREATE OR REPLACE FUNCTION public.update_admissions_assignment_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_admissions_submission_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IN ('submitted', 'late') AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at = now();
  END IF;
  IF NEW.status IN ('reviewed', 'returned') AND NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admissions_assignments_updated_at ON public.admissions_assignments;
CREATE TRIGGER admissions_assignments_updated_at
  BEFORE UPDATE ON public.admissions_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_admissions_assignment_timestamp();

DROP TRIGGER IF EXISTS admissions_submissions_updated_at ON public.admissions_assignment_submissions;
CREATE TRIGGER admissions_submissions_updated_at
  BEFORE UPDATE ON public.admissions_assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_admissions_submission_timestamp();

CREATE OR REPLACE FUNCTION public.can_view_admissions_assignment(_user_id uuid, _assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_admissions_assignments(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.admissions_assignments a
      LEFT JOIN public.applications app ON app.user_id = _user_id
      WHERE a.id = _assignment_id
        AND a.status = 'published'
        AND (
          a.target_status IS NULL
          OR app.status = a.target_status
          OR EXISTS (
            SELECT 1
            FROM public.admissions_assignment_targets target
            WHERE target.assignment_id = a.id
              AND target.user_id = _user_id
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_submit_admissions_assignment(_user_id uuid, _assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admissions_assignments a
    WHERE a.id = _assignment_id
      AND public.can_view_admissions_assignment(_user_id, a.id)
      AND a.status = 'published'
      AND (
        a.allow_resubmissions
        OR NOT EXISTS (
          SELECT 1
          FROM public.admissions_assignment_submissions s
          WHERE s.assignment_id = a.id
            AND s.user_id = _user_id
            AND s.status IN ('submitted', 'late', 'reviewed')
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_admissions_assignments(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_admissions_assignment(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_submit_admissions_assignment(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_admissions_assignments(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_admissions_assignment(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_submit_admissions_assignment(uuid, uuid) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admissions_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admissions_assignment_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admissions_assignment_submissions TO authenticated;
GRANT ALL ON public.admissions_assignments TO service_role;
GRANT ALL ON public.admissions_assignment_targets TO service_role;
GRANT ALL ON public.admissions_assignment_submissions TO service_role;

ALTER TABLE public.admissions_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions_assignment_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions_assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admissions assignments visible to assigned learners and managers"
  ON public.admissions_assignments;
DROP POLICY IF EXISTS "admissions assignments managed by mentors and managers"
  ON public.admissions_assignments;
DROP POLICY IF EXISTS "admissions targets visible to owners and managers"
  ON public.admissions_assignment_targets;
DROP POLICY IF EXISTS "admissions targets managed by application managers"
  ON public.admissions_assignment_targets;
DROP POLICY IF EXISTS "admissions submissions visible to owner and managers"
  ON public.admissions_assignment_submissions;
DROP POLICY IF EXISTS "admissions submissions inserted by owner"
  ON public.admissions_assignment_submissions;
DROP POLICY IF EXISTS "admissions submissions updated by owner or managers"
  ON public.admissions_assignment_submissions;

CREATE POLICY "admissions assignments visible to assigned learners and managers"
  ON public.admissions_assignments
  FOR SELECT TO authenticated
  USING (public.can_view_admissions_assignment(auth.uid(), id));

CREATE POLICY "admissions assignments managed by mentors and managers"
  ON public.admissions_assignments
  FOR ALL TO authenticated
  USING (public.can_manage_admissions_assignments(auth.uid()))
  WITH CHECK (public.can_manage_admissions_assignments(auth.uid()));

CREATE POLICY "admissions targets visible to owners and managers"
  ON public.admissions_assignment_targets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_manage_admissions_assignments(auth.uid()));

CREATE POLICY "admissions targets managed by application managers"
  ON public.admissions_assignment_targets
  FOR ALL TO authenticated
  USING (public.can_manage_admissions_assignments(auth.uid()))
  WITH CHECK (public.can_manage_admissions_assignments(auth.uid()));

CREATE POLICY "admissions submissions visible to owner and managers"
  ON public.admissions_assignment_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_manage_admissions_assignments(auth.uid()));

CREATE POLICY "admissions submissions inserted by owner"
  ON public.admissions_assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_submit_admissions_assignment(auth.uid(), assignment_id)
  );

CREATE POLICY "admissions submissions updated by owner or managers"
  ON public.admissions_assignment_submissions
  FOR UPDATE TO authenticated
  USING (
    public.can_manage_admissions_assignments(auth.uid())
    OR (
      auth.uid() = user_id
      AND public.can_submit_admissions_assignment(auth.uid(), assignment_id)
      AND status IN ('draft', 'submitted', 'late', 'returned')
    )
  )
  WITH CHECK (
    public.can_manage_admissions_assignments(auth.uid())
    OR (
      auth.uid() = user_id
      AND public.can_submit_admissions_assignment(auth.uid(), assignment_id)
      AND status IN ('draft', 'submitted', 'late')
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('admissions-submissions', 'admissions-submissions', false, 52428800)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 52428800;

DROP POLICY IF EXISTS "admissions submission files visible to owner and managers"
  ON storage.objects;
DROP POLICY IF EXISTS "admissions submission files uploaded by owner"
  ON storage.objects;
DROP POLICY IF EXISTS "admissions submission files updated by owner"
  ON storage.objects;
DROP POLICY IF EXISTS "admissions submission files deleted by owner or managers"
  ON storage.objects;

CREATE POLICY "admissions submission files visible to owner and managers"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'admissions-submissions'
    AND (
      public.can_manage_admissions_assignments(auth.uid())
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "admissions submission files uploaded by owner"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'admissions-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "admissions submission files updated by owner"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'admissions-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'admissions-submissions'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "admissions submission files deleted by owner or managers"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'admissions-submissions'
    AND (
      public.can_manage_admissions_assignments(auth.uid())
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admissions_assignments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admissions_assignment_submissions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
