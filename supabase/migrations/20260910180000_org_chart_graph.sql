CREATE TYPE public.org_chart_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.org_chart_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'reports_to',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, child_user_id, relationship)
);

CREATE TABLE public.org_chart_node_positions (
  node_id text PRIMARY KEY,
  x numeric(9,2) NOT NULL,
  y numeric(9,2) NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.org_chart_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'reports_to',
  status public.org_chart_request_status NOT NULL DEFAULT 'pending',
  note text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX org_chart_edges_parent_idx ON public.org_chart_edges (parent_user_id);
CREATE INDEX org_chart_edges_child_idx ON public.org_chart_edges (child_user_id);
CREATE INDEX org_chart_requests_status_idx ON public.org_chart_change_requests (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_executive_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
    OR public.has_role(_user_id, 'executive')
    OR EXISTS (
      SELECT 1
      FROM public.user_positions up
      WHERE up.user_id = _user_id
        AND up.position IN (
          'founding_president',
          'deputy_chair_president',
          'vc_administration',
          'vc_mentorship',
          'vc_public_relations'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.touch_org_chart_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER org_chart_edges_updated_at
  BEFORE UPDATE ON public.org_chart_edges
  FOR EACH ROW EXECUTE FUNCTION public.touch_org_chart_updated_at();

CREATE TRIGGER org_chart_node_positions_updated_at
  BEFORE UPDATE ON public.org_chart_node_positions
  FOR EACH ROW EXECUTE FUNCTION public.touch_org_chart_updated_at();

CREATE TRIGGER org_chart_requests_updated_at
  BEFORE UPDATE ON public.org_chart_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_org_chart_updated_at();

GRANT EXECUTE ON FUNCTION public.is_executive_or_above(uuid) TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_chart_edges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_chart_node_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.org_chart_change_requests TO authenticated;
GRANT ALL ON public.org_chart_edges TO service_role;
GRANT ALL ON public.org_chart_node_positions TO service_role;
GRANT ALL ON public.org_chart_change_requests TO service_role;

ALTER TABLE public.org_chart_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_chart_node_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_chart_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org chart edges visible to executives"
  ON public.org_chart_edges
  FOR SELECT TO authenticated
  USING (public.is_executive_or_above(auth.uid()));

CREATE POLICY "org chart edges managed by super admins"
  ON public.org_chart_edges
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "org chart positions visible to executives"
  ON public.org_chart_node_positions
  FOR SELECT TO authenticated
  USING (public.is_executive_or_above(auth.uid()));

CREATE POLICY "org chart positions saved by executives"
  ON public.org_chart_node_positions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_executive_or_above(auth.uid()));

CREATE POLICY "org chart positions updated by executives"
  ON public.org_chart_node_positions
  FOR UPDATE TO authenticated
  USING (public.is_executive_or_above(auth.uid()))
  WITH CHECK (public.is_executive_or_above(auth.uid()));

CREATE POLICY "org chart requests visible to executives"
  ON public.org_chart_change_requests
  FOR SELECT TO authenticated
  USING (public.is_executive_or_above(auth.uid()));

CREATE POLICY "org chart requests created by executives"
  ON public.org_chart_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_executive_or_above(auth.uid())
    AND requested_by = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "org chart requests decided by super admins"
  ON public.org_chart_change_requests
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

NOTIFY pgrst, 'reload schema';
