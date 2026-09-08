-- Admin audit log for privileged account actions (suspend/reactivate/delete)
-- plus automatic logging of role/position/mentor-pairing/leadership changes
-- via triggers, so existing client flows in portal.admin.tsx and
-- leadership-manager.tsx get audited without any app-code changes.

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_target_user_idx ON public.admin_audit_log (target_user_id);

-- Only application managers+ can read; nobody can write directly (client-side
-- inserts are never trusted — writes happen via SECURITY DEFINER trigger or
-- the service-role admin server functions).
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit log readable by managers" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_officer_or_above(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_role_position_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  action_name text;
  row_data record;
BEGIN
  row_data := COALESCE(NEW, OLD);
  action_name := TG_ARGV[0] || CASE WHEN TG_OP = 'INSERT' THEN '_ASSIGNED' ELSE '_REMOVED' END;
  INSERT INTO public.admin_audit_log (actor_user_id, target_user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(),
    row_data.user_id,
    action_name,
    TG_TABLE_NAME,
    row_data.id::text,
    to_jsonb(row_data) - 'id' - 'user_id'
  );
  RETURN row_data;
END;
$$;

CREATE TRIGGER user_roles_audit AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_position_audit('ROLE');
CREATE TRIGGER user_positions_audit AFTER INSERT OR DELETE ON public.user_positions
  FOR EACH ROW EXECUTE FUNCTION public.log_role_position_audit('POSITION');

CREATE OR REPLACE FUNCTION public.log_mentor_pairing_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row_data record;
BEGIN
  row_data := COALESCE(NEW, OLD);
  INSERT INTO public.admin_audit_log (actor_user_id, target_user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(),
    row_data.student_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'MENTOR_PAIRING_CREATED' ELSE 'MENTOR_PAIRING_REMOVED' END,
    'mentor_students',
    row_data.id::text,
    jsonb_build_object('mentor_id', row_data.mentor_id, 'student_id', row_data.student_id)
  );
  RETURN row_data;
END;
$$;

CREATE TRIGGER mentor_students_audit AFTER INSERT OR DELETE ON public.mentor_students
  FOR EACH ROW EXECUTE FUNCTION public.log_mentor_pairing_audit();

CREATE OR REPLACE FUNCTION public.log_leadership_assignment_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.admin_audit_log (actor_user_id, target_user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(),
    NEW.assignee_id,
    'LEADERSHIP_ASSIGNMENT_CHANGED',
    'leadership_entries',
    NEW.id::text,
    jsonb_build_object('position', NEW.position, 'previous_assignee_id', OLD.assignee_id, 'new_assignee_id', NEW.assignee_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER leadership_entries_assignment_audit AFTER UPDATE ON public.leadership_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_leadership_assignment_audit();
