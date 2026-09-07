CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed');
CREATE TYPE public.task_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  division text NOT NULL,
  assignee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task assignees read own tasks" ON public.tasks
  FOR SELECT TO authenticated USING (auth.uid() = assignee_id OR auth.uid() = created_by);
CREATE POLICY "task managers read all tasks" ON public.tasks
  FOR SELECT TO authenticated USING (public.can_manage_applications(auth.uid()));
CREATE POLICY "task managers create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_applications(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "task assignees update own tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = assignee_id OR public.can_manage_applications(auth.uid()))
  WITH CHECK (auth.uid() = assignee_id OR public.can_manage_applications(auth.uid()));
CREATE POLICY "task managers delete tasks" ON public.tasks
  FOR DELETE TO authenticated USING (public.can_manage_applications(auth.uid()));

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
