-- GENERATED from supabase/migrations/20261019000000_member_portal.sql; do not edit this copy.
-- Regenerate with: npm run sql:portal
-- Run the WHOLE file in Supabase Dashboard > SQL Editor > New query, as postgres.
-- Select the same project used by VITE_SUPABASE_URL. This upgrades an EXISTING
-- Beyond Medicine database whose earlier migrations are already installed.
-- It does not create a new Supabase project, deploy the website, or start email/SMS.
-- It preserves application data and records this version in Supabase's migration
-- history only after the upgrade succeeds. A recorded version is skipped on rerun.
-- If you already pasted the raw migration without recording it, read the guide's
-- migration-history instructions; this script will refuse to guess its state.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';
DO $portal_deploy$
DECLARE
  applied boolean := false;
  missing text[];
  present text[];
  expected_tables text[] := ARRAY[
    'public.notification_preferences','public.notifications','public.notification_deliveries',
    'public.course_posts','public.course_replies','public.help_tickets','public.help_replies',
    'public.portal_events','public.event_registrations','public.cohort_applications',
    'public.interview_slots','public.interview_bookings'
  ];
  migration_sql text := $member_portal_body$
-- Member portal: all authorization lives in Postgres, including RPCs called by the UI.
-- Older migrations revoked PUBLIC without explicitly preserving policy helper access.
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role),public.has_position(uuid,public.position_title),public.is_super_admin(uuid),public.is_officer_or_above(uuid),public.in_research_group(uuid,uuid),public.is_enrolled(uuid,uuid),public.owns_course(uuid,uuid),public.mentor_of_assignment(uuid,uuid),public.in_conversation(uuid,uuid) TO authenticated,service_role;
GRANT INSERT,UPDATE,DELETE ON public.user_roles,public.user_positions,public.mentor_students TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_active(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM profiles WHERE id = _user AND status = 'active')
 AND public.has_full_access(_user);
$$;
CREATE OR REPLACE FUNCTION public.portal_officer(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.portal_active(_user) AND public.is_officer_or_above(_user);
$$;
CREATE OR REPLACE FUNCTION public.portal_course_manager(_user uuid, _course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.portal_active(_user) AND (public.portal_officer(_user) OR public.owns_course(_user, _course));
$$;
CREATE OR REPLACE FUNCTION public.portal_course_member(_user uuid, _course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.portal_active(_user) AND (public.portal_course_manager(_user, _course) OR public.is_enrolled(_user, _course));
$$;
CREATE POLICY "officers read member roles" ON public.user_roles FOR SELECT TO authenticated USING(public.portal_officer(auth.uid()));

-- Full profiles contain private contact information. Public directory data is exposed by RPC.
DROP POLICY IF EXISTS "profiles readable" ON public.profiles;
CREATE POLICY "private profiles scoped" ON public.profiles FOR SELECT TO authenticated USING (
 id = auth.uid() OR public.portal_officer(auth.uid()) OR
 (public.portal_active(auth.uid()) AND (
 EXISTS (SELECT 1 FROM mentor_students WHERE mentor_id = auth.uid() AND student_id = profiles.id)
 OR EXISTS (SELECT 1 FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE c.mentor_id=auth.uid() AND e.student_id=profiles.id)
 OR EXISTS (SELECT 1 FROM courses c WHERE c.mentor_id=profiles.id AND public.is_enrolled(auth.uid(),c.id)))));
CREATE OR REPLACE FUNCTION public.portal_directory()
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.id,p.full_name,p.username,p.avatar_url FROM profiles p
 WHERE public.portal_active(auth.uid()) AND public.portal_active(p.id);
$$;

-- Application owners must never be able to approve themselves.
CREATE OR REPLACE FUNCTION public.portal_guard_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.can_manage_applications(auth.uid()) THEN
   IF TG_OP='INSERT' THEN
     IF NEW.status NOT IN ('incomplete','pending') OR NEW.decided_at IS NOT NULL OR NEW.decided_by IS NOT NULL THEN RAISE EXCEPTION 'Officer approval required'; END IF;
   ELSE
     IF NEW.decided_at IS DISTINCT FROM OLD.decided_at OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
       OR (NEW.status IS DISTINCT FROM OLD.status AND NOT ((OLD.status='incomplete' AND NEW.status='pending') OR (OLD.status='rejected' AND NEW.status IN ('incomplete','pending')))) THEN
       RAISE EXCEPTION 'Officer approval required';
     END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_guard_application BEFORE INSERT OR UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.portal_guard_application();

ALTER TABLE public.courses ADD COLUMN cohort text NOT NULL DEFAULT 'Beginner';
ALTER TABLE public.assignments ADD COLUMN resource_links text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.assignments ADD COLUMN resource_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.assignments ADD COLUMN submission_type text NOT NULL DEFAULT 'either' CHECK (submission_type IN ('text','file','either'));
ALTER TABLE public.submissions ADD COLUMN file_paths text[] NOT NULL DEFAULT '{}';

-- Replace permissive legacy policies, rather than adding policies that would be ORed with them.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('courses','course_enrollments','assignments','submissions','mentor_students') LOOP
 EXECUTE format('DROP POLICY %I ON public.%I', r.policyname,r.tablename);
 END LOOP;
END $$;
CREATE POLICY "course participants read" ON public.courses FOR SELECT TO authenticated USING (public.portal_course_member(auth.uid(),id));
CREATE POLICY "course managers write" ON public.courses FOR ALL TO authenticated
 USING (public.portal_course_manager(auth.uid(),id)) WITH CHECK (public.portal_officer(auth.uid()) OR (public.portal_active(auth.uid()) AND public.has_role(auth.uid(),'mentor') AND mentor_id=auth.uid()));
CREATE POLICY "enrollment scoped read" ON public.course_enrollments FOR SELECT TO authenticated USING (public.portal_course_member(auth.uid(),course_id));
CREATE POLICY "officers enroll" ON public.course_enrollments FOR ALL TO authenticated USING (public.portal_officer(auth.uid())) WITH CHECK (public.portal_officer(auth.uid()) AND public.portal_active(student_id));
CREATE POLICY "assignment participants read" ON public.assignments FOR SELECT TO authenticated USING (public.portal_course_manager(auth.uid(),course_id) OR (status='published' AND public.portal_course_member(auth.uid(),course_id)));
CREATE POLICY "assignment managers write" ON public.assignments FOR ALL TO authenticated USING (public.portal_course_manager(auth.uid(),course_id)) WITH CHECK (public.portal_course_manager(auth.uid(),course_id));
CREATE POLICY "submission scoped read" ON public.submissions FOR SELECT TO authenticated USING (public.portal_active(auth.uid()) AND (student_id=auth.uid() OR EXISTS (SELECT 1 FROM assignments a WHERE a.id=assignment_id AND public.portal_course_manager(auth.uid(),a.course_id))));
CREATE POLICY "student submits" ON public.submissions FOR INSERT TO authenticated WITH CHECK (student_id=auth.uid() AND EXISTS (SELECT 1 FROM assignments a WHERE a.id=assignment_id AND a.status='published' AND public.is_enrolled(auth.uid(),a.course_id) AND public.portal_active(auth.uid())));
CREATE POLICY "submission scoped update" ON public.submissions FOR UPDATE TO authenticated USING (public.portal_active(auth.uid()) AND (student_id=auth.uid() OR EXISTS (SELECT 1 FROM assignments a WHERE a.id=assignment_id AND public.portal_course_manager(auth.uid(),a.course_id)))) WITH CHECK (public.portal_active(auth.uid()) AND (student_id=auth.uid() OR EXISTS (SELECT 1 FROM assignments a WHERE a.id=assignment_id AND public.portal_course_manager(auth.uid(),a.course_id))));
CREATE POLICY "pairings scoped read" ON public.mentor_students FOR SELECT TO authenticated USING (public.portal_active(auth.uid()) AND (mentor_id=auth.uid() OR student_id=auth.uid() OR public.portal_officer(auth.uid())));
CREATE POLICY "officers pair" ON public.mentor_students FOR ALL TO authenticated USING (public.portal_officer(auth.uid())) WITH CHECK (public.portal_officer(auth.uid()) AND public.has_role(mentor_id,'mentor') AND public.portal_active(student_id));

CREATE OR REPLACE FUNCTION public.portal_guard_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.assignments;
BEGIN
 SELECT * INTO a FROM assignments WHERE id=NEW.assignment_id;
 IF auth.uid() IS NOT NULL THEN
   IF TG_OP='UPDATE' AND (NEW.student_id<>OLD.student_id OR NEW.assignment_id<>OLD.assignment_id) THEN RAISE EXCEPTION 'Submission identity cannot change'; END IF;
   IF auth.uid()=NEW.student_id THEN
     IF a.status<>'published' OR NOT public.is_enrolled(auth.uid(),a.course_id) THEN RAISE EXCEPTION 'Assignment unavailable'; END IF;
     IF TG_OP='INSERT' AND (NEW.feedback IS NOT NULL OR NEW.grade IS NOT NULL) THEN RAISE EXCEPTION 'Only mentors can grade'; END IF;
     IF TG_OP='UPDATE' AND (NEW.feedback IS DISTINCT FROM OLD.feedback OR NEW.grade IS DISTINCT FROM OLD.grade) THEN RAISE EXCEPTION 'Only mentors can grade'; END IF;
     IF a.submission_type='file' AND cardinality(NEW.file_paths)=0 THEN RAISE EXCEPTION 'A file is required'; END IF;
     IF a.submission_type='text' AND length(trim(NEW.content))=0 THEN RAISE EXCEPTION 'A written response is required'; END IF;
     IF length(trim(NEW.content))=0 AND cardinality(NEW.file_paths)=0 THEN RAISE EXCEPTION 'Add a response or file'; END IF;
     IF EXISTS (SELECT 1 FROM unnest(NEW.file_paths) p WHERE split_part(p,'/',1)<>auth.uid()::text OR split_part(p,'/',2)<>NEW.assignment_id::text) THEN RAISE EXCEPTION 'Invalid submission file'; END IF;
     IF EXISTS (SELECT 1 FROM unnest(NEW.file_paths) p WHERE NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='course-submissions' AND o.name=p)) THEN RAISE EXCEPTION 'Upload submission files before submitting'; END IF;
     NEW.submitted_at=now();
   ELSIF TG_OP='UPDATE' AND (NEW.content IS DISTINCT FROM OLD.content OR NEW.file_paths IS DISTINCT FROM OLD.file_paths OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN
     RAISE EXCEPTION 'Reviewers cannot change submitted work';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_guard_submission BEFORE INSERT OR UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.portal_guard_submission();

-- Mentors review their course submissions; admissions portfolios require designated reviewers.
CREATE OR REPLACE FUNCTION public.can_manage_admissions_assignments(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.portal_active(_user_id) AND public.can_manage_applications(_user_id); $$;
ALTER TABLE public.admissions_assignments ADD COLUMN targets_only boolean NOT NULL DEFAULT false;
UPDATE public.admissions_assignments a SET targets_only=true WHERE EXISTS(SELECT 1 FROM admissions_assignment_targets t WHERE t.assignment_id=a.id);
CREATE OR REPLACE FUNCTION public.can_view_admissions_assignment(_user_id uuid,_assignment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.can_manage_admissions_assignments(_user_id) OR EXISTS(
 SELECT 1 FROM admissions_assignments a JOIN profiles p ON p.id=_user_id AND p.status='active' LEFT JOIN applications app ON app.user_id=_user_id
 WHERE a.id=_assignment_id AND a.status='published' AND (
 (NOT a.targets_only AND (a.target_status IS NULL OR app.status=a.target_status))
 OR EXISTS(SELECT 1 FROM admissions_assignment_targets t WHERE t.assignment_id=a.id AND t.user_id=_user_id)));
$$;
-- Targets must exist before publishing, so visibility and notifications use the final audience.
CREATE OR REPLACE FUNCTION public.save_admissions_assignment(_assignment uuid,_payload jsonb,_targets uuid[] DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a admissions_assignments; result uuid; BEGIN
 IF NOT public.can_manage_admissions_assignments(auth.uid()) THEN RAISE EXCEPTION 'Admissions manager required'; END IF;
 a=jsonb_populate_record(NULL::admissions_assignments,_payload);
 IF length(trim(coalesce(a.title,'')))=0 THEN RAISE EXCEPTION 'Title is required'; END IF;
 IF a.targets_only AND cardinality(_targets)=0 THEN RAISE EXCEPTION 'Choose at least one target learner'; END IF;
 IF _assignment IS NULL THEN
 INSERT INTO admissions_assignments(title,status,created_by) VALUES(a.title,'draft',auth.uid()) RETURNING id INTO result;
 ELSE
 UPDATE admissions_assignments SET status='draft' WHERE id=_assignment RETURNING id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
 END IF;
 DELETE FROM admissions_assignment_targets WHERE assignment_id=result;
 IF coalesce(a.targets_only,false) THEN INSERT INTO admissions_assignment_targets(assignment_id,user_id,assigned_by) SELECT result,u,auth.uid() FROM unnest(_targets) u ON CONFLICT DO NOTHING; END IF;
 UPDATE admissions_assignments SET title=a.title,summary=a.summary,instructions=a.instructions,due_at=a.due_at,points=a.points,
 submission_types=coalesce(a.submission_types,ARRAY['text']::admissions_submission_type[]),allowed_file_types=coalesce(a.allowed_file_types,'{}'),max_file_size_mb=coalesce(a.max_file_size_mb,10),rubric=coalesce(a.rubric,'[]'),target_status=a.target_status,targets_only=coalesce(a.targets_only,false),allow_resubmissions=coalesce(a.allow_resubmissions,true),status=coalesce(a.status,'draft'),updated_by=auth.uid() WHERE id=result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_admissions_assignment(uuid,jsonb,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admissions_assignment(uuid,jsonb,uuid[]) TO authenticated,service_role;

CREATE TABLE public.notification_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
 email_enabled boolean NOT NULL DEFAULT true,
 sms_enabled boolean NOT NULL DEFAULT false,
 sms_consent_at timestamptz,
 phone text,
 categories text[] NOT NULL DEFAULT ARRAY['membership','messages','events','assignments','cohorts'],
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (NOT sms_enabled OR (sms_consent_at IS NOT NULL AND phone IS NOT NULL AND phone ~ '^\+[1-9][0-9]{7,14}$'))
);
CREATE TABLE public.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 category text NOT NULL, title text NOT NULL, body text NOT NULL, link text NOT NULL CHECK (link LIKE '/portal%'),
 dedupe_key text NOT NULL UNIQUE, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notification_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notification_id uuid NOT NULL REFERENCES public.notifications ON DELETE CASCADE,
 channel text NOT NULL CHECK(channel IN ('email','sms')), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed','skipped')),
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz,
 provider_id text, last_error text, UNIQUE(notification_id,channel)
);
CREATE INDEX notifications_user_unread ON public.notifications(user_id,created_at DESC) WHERE read_at IS NULL;
CREATE INDEX deliveries_pending ON public.notification_deliveries(available_at) WHERE status IN ('pending','processing');
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE(read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notification_preferences,public.notifications,public.notification_deliveries TO service_role;
CREATE POLICY "own preferences" ON public.notification_preferences FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "read own notifications" ON public.notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.portal_preference_consent()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.sms_enabled AND (TG_OP='INSERT' OR NOT OLD.sms_enabled OR NEW.phone IS DISTINCT FROM OLD.phone) THEN NEW.sms_consent_at=now();
 ELSIF TG_OP='UPDATE' THEN NEW.sms_consent_at=OLD.sms_consent_at; END IF;
 IF NOT NEW.sms_enabled THEN NEW.sms_consent_at=NULL; END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER preference_consent BEFORE INSERT OR UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.portal_preference_consent();

CREATE OR REPLACE FUNCTION public.portal_notify(_user uuid,_category text,_title text,_body text,_link text,_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n uuid; BEGIN
 INSERT INTO notifications(user_id,category,title,body,link,dedupe_key) VALUES(_user,_category,_title,_body,_link,_key) ON CONFLICT DO NOTHING RETURNING id INTO n;
 IF n IS NOT NULL THEN INSERT INTO notification_deliveries(notification_id,channel) VALUES(n,'email'),(n,'sms'); END IF;
END $$;
REVOKE ALL ON FUNCTION public.portal_notify(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.claim_notification_deliveries(_limit integer DEFAULT 40)
RETURNS SETOF public.notification_deliveries LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE notification_deliveries SET status='processing',locked_at=now(),attempts=attempts+1
 WHERE id IN (SELECT id FROM notification_deliveries WHERE (status='pending' AND available_at<=now()) OR (status='processing' AND locked_at<now()-interval '10 minutes') ORDER BY available_at LIMIT LEAST(_limit,100) FOR UPDATE SKIP LOCKED)
 RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_deliveries(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(integer) TO service_role;

CREATE TABLE public.course_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES public.courses ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, kind text NOT NULL DEFAULT 'discussion' CHECK(kind IN ('announcement','discussion','resource')),
 title text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.course_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES public.course_posts ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_replies ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.course_posts,public.course_replies TO authenticated;
GRANT ALL ON public.course_posts,public.course_replies TO service_role;
CREATE POLICY "course posts read" ON public.course_posts FOR SELECT TO authenticated USING(public.portal_course_member(auth.uid(),course_id));
CREATE POLICY "course posts create" ON public.course_posts FOR INSERT TO authenticated WITH CHECK(public.portal_course_manager(auth.uid(),course_id) AND author_id=auth.uid());
CREATE POLICY "course posts edit" ON public.course_posts FOR UPDATE TO authenticated USING(public.portal_course_manager(auth.uid(),course_id)) WITH CHECK(public.portal_course_manager(auth.uid(),course_id));
CREATE POLICY "course posts remove" ON public.course_posts FOR DELETE TO authenticated USING(public.portal_course_manager(auth.uid(),course_id));
CREATE OR REPLACE FUNCTION public.portal_guard_course_post()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.author_id<>OLD.author_id OR NEW.course_id<>OLD.course_id THEN RAISE EXCEPTION 'Post author and course cannot change'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER portal_guard_course_post BEFORE UPDATE ON public.course_posts FOR EACH ROW EXECUTE FUNCTION public.portal_guard_course_post();
CREATE POLICY "course replies read" ON public.course_replies FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM course_posts p WHERE p.id=post_id AND public.portal_course_member(auth.uid(),p.course_id)));
CREATE POLICY "course replies insert" ON public.course_replies FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND EXISTS(SELECT 1 FROM course_posts p WHERE p.id=post_id AND public.portal_course_member(auth.uid(),p.course_id)));

CREATE TABLE public.help_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), requester_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 subject text NOT NULL CHECK(length(trim(subject)) BETWEEN 1 AND 200), status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','escalated')),
 assigned_to uuid REFERENCES auth.users, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.help_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES public.help_tickets ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.help_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_replies ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON public.help_tickets TO authenticated;
GRANT UPDATE(status,assigned_to) ON public.help_tickets TO authenticated;
GRANT SELECT,INSERT ON public.help_replies TO authenticated;
GRANT ALL ON public.help_tickets,public.help_replies TO service_role;
CREATE POLICY "private tickets read" ON public.help_tickets FOR SELECT TO authenticated USING(public.portal_active(auth.uid()) AND (requester_id=auth.uid() OR public.portal_officer(auth.uid())));
CREATE POLICY "members open tickets" ON public.help_tickets FOR INSERT TO authenticated WITH CHECK(requester_id=auth.uid() AND public.portal_active(auth.uid()) AND status='open' AND assigned_to IS NULL);
CREATE POLICY "officers triage tickets" ON public.help_tickets FOR UPDATE TO authenticated USING(public.portal_officer(auth.uid())) WITH CHECK(public.portal_officer(auth.uid()) AND (assigned_to IS NULL OR public.portal_officer(assigned_to)));
CREATE POLICY "private replies read" ON public.help_replies FOR SELECT TO authenticated USING(public.portal_active(auth.uid()) AND EXISTS(SELECT 1 FROM help_tickets t WHERE t.id=ticket_id AND (t.requester_id=auth.uid() OR public.portal_officer(auth.uid()))));
CREATE POLICY "private replies send" ON public.help_replies FOR INSERT TO authenticated WITH CHECK(author_id=auth.uid() AND public.portal_active(auth.uid()) AND EXISTS(SELECT 1 FROM help_tickets t WHERE t.id=ticket_id AND (t.requester_id=auth.uid() OR public.portal_officer(auth.uid()))));

CREATE TABLE public.portal_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL DEFAULT '',
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, location text NOT NULL DEFAULT '', meeting_link text CHECK(meeting_link IS NULL OR meeting_link ~ '^https?://'),
 requirements text NOT NULL DEFAULT '', capacity integer CHECK(capacity>0), registration_deadline timestamptz,
 reminder_hours integer CHECK(reminder_hours>0), cancelled boolean NOT NULL DEFAULT false,
 course_id uuid REFERENCES public.courses ON DELETE CASCADE, created_by uuid NOT NULL REFERENCES auth.users, updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at), CHECK(registration_deadline IS NULL OR registration_deadline<=starts_at)
);
CREATE TABLE public.event_registrations (
 event_id uuid NOT NULL REFERENCES public.portal_events ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(event_id,user_id)
);
ALTER TABLE public.portal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.portal_events TO authenticated;
GRANT SELECT ON public.event_registrations TO authenticated;
GRANT ALL ON public.portal_events,public.event_registrations TO service_role;
CREATE POLICY "events visible" ON public.portal_events FOR SELECT TO authenticated USING(public.portal_active(auth.uid()) AND (course_id IS NULL OR public.portal_course_member(auth.uid(),course_id)));
CREATE POLICY "events create" ON public.portal_events FOR INSERT TO authenticated WITH CHECK(created_by=auth.uid() AND (public.portal_officer(auth.uid()) OR public.portal_course_manager(auth.uid(),course_id)));
CREATE POLICY "events update" ON public.portal_events FOR UPDATE TO authenticated USING(public.portal_officer(auth.uid()) OR public.portal_course_manager(auth.uid(),course_id)) WITH CHECK(public.portal_officer(auth.uid()) OR public.portal_course_manager(auth.uid(),course_id));
CREATE POLICY "registration scoped" ON public.event_registrations FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.portal_officer(auth.uid()) OR EXISTS(SELECT 1 FROM portal_events e WHERE e.id=event_id AND public.portal_course_manager(auth.uid(),e.course_id)));
CREATE TRIGGER portal_event_updated BEFORE UPDATE ON public.portal_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.register_portal_event(_event uuid,_cancel boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE e portal_events; BEGIN
 IF NOT public.portal_active(auth.uid()) THEN RAISE EXCEPTION 'Approved membership required'; END IF;
 SELECT * INTO e FROM portal_events WHERE id=_event FOR UPDATE;
 IF NOT FOUND OR (e.course_id IS NOT NULL AND NOT public.portal_course_member(auth.uid(),e.course_id)) THEN RAISE EXCEPTION 'Event unavailable'; END IF;
 IF _cancel THEN DELETE FROM event_registrations WHERE event_id=_event AND user_id=auth.uid(); RETURN; END IF;
 IF EXISTS(SELECT 1 FROM event_registrations WHERE event_id=_event AND user_id=auth.uid()) THEN RETURN; END IF;
 IF e.cancelled OR e.starts_at<=now() OR e.registration_deadline<now() THEN RAISE EXCEPTION 'Registration closed'; END IF;
 IF e.capacity IS NOT NULL AND (SELECT count(*) FROM event_registrations WHERE event_id=_event)>=e.capacity THEN RAISE EXCEPTION 'Event is full'; END IF;
 INSERT INTO event_registrations(event_id,user_id) VALUES(_event,auth.uid());
 PERFORM public.portal_notify(auth.uid(),'events','Registration confirmed',e.title||' — '||to_char(e.starts_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI')||' UTC. View the event for your local time.','/portal/events','registration:'||_event||':'||auth.uid()||':'||clock_timestamp());
END $$;

CREATE TABLE public.cohort_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
 cohort text NOT NULL CHECK(cohort IN ('Intermediate','Advanced')), status text NOT NULL DEFAULT 'Not Started' CHECK(status IN ('Not Started','In Progress','Submitted','Interview Scheduling','Under Review','Decision Released')),
 topic text NOT NULL DEFAULT '', experience text NOT NULL DEFAULT '', skills text NOT NULL DEFAULT '', previous_work text NOT NULL DEFAULT '', paper_path text,
 decision text, placement_course_id uuid REFERENCES public.courses, submitted_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.interview_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mentor_id uuid NOT NULL REFERENCES auth.users, leader_id uuid NOT NULL REFERENCES auth.users,
 cohort text NOT NULL DEFAULT 'Both' CHECK(cohort IN ('Intermediate','Advanced','Both')),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, meeting_link text NOT NULL CHECK(meeting_link ~ '^https?://'), CHECK(ends_at>starts_at), CHECK(mentor_id<>leader_id)
);
CREATE TABLE public.interview_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid NOT NULL UNIQUE REFERENCES public.interview_slots ON DELETE CASCADE,
 application_id uuid NOT NULL UNIQUE REFERENCES public.cohort_applications ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cohort_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.cohort_applications,public.interview_slots,public.interview_bookings TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.interview_slots TO authenticated;
GRANT ALL ON public.cohort_applications,public.interview_slots,public.interview_bookings TO service_role;
CREATE OR REPLACE FUNCTION public.portal_owns_cohort(_user uuid,_application uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM cohort_applications WHERE id=_application AND user_id=_user); $$;
CREATE OR REPLACE FUNCTION public.portal_interview_reviewer(_user uuid,_application uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.portal_active(_user) AND EXISTS(SELECT 1 FROM interview_bookings b JOIN interview_slots s ON s.id=b.slot_id WHERE b.application_id=_application AND (s.mentor_id=_user OR s.leader_id=_user)); $$;
CREATE OR REPLACE FUNCTION public.portal_slot_visible(_user uuid,_slot uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.portal_active(_user) AND EXISTS(SELECT 1 FROM interview_slots s WHERE s.id=_slot AND (public.portal_officer(_user) OR s.mentor_id=_user OR EXISTS(SELECT 1 FROM interview_bookings b JOIN cohort_applications a ON a.id=b.application_id WHERE b.slot_id=s.id AND a.user_id=_user))); $$;
CREATE POLICY "cohort applications private" ON public.cohort_applications FOR SELECT TO authenticated USING(public.portal_active(auth.uid()) AND (user_id=auth.uid() OR public.portal_officer(auth.uid()) OR public.portal_interview_reviewer(auth.uid(),id)));
CREATE POLICY "availability visible" ON public.interview_slots FOR SELECT TO authenticated USING((public.portal_active(auth.uid()) AND (mentor_id=auth.uid() OR public.portal_officer(auth.uid()))) OR public.portal_slot_visible(auth.uid(),id));
CREATE POLICY "reviewers insert availability" ON public.interview_slots FOR INSERT TO authenticated WITH CHECK(public.portal_active(auth.uid()) AND (public.portal_officer(auth.uid()) OR mentor_id=auth.uid()) AND public.has_role(mentor_id,'mentor') AND public.portal_officer(leader_id));
CREATE POLICY "reviewers update availability" ON public.interview_slots FOR UPDATE TO authenticated USING(public.portal_active(auth.uid()) AND (public.portal_officer(auth.uid()) OR mentor_id=auth.uid())) WITH CHECK(public.portal_active(auth.uid()) AND (public.portal_officer(auth.uid()) OR mentor_id=auth.uid()) AND public.has_role(mentor_id,'mentor') AND public.portal_officer(leader_id));
CREATE POLICY "reviewers remove availability" ON public.interview_slots FOR DELETE TO authenticated USING(public.portal_active(auth.uid()) AND (public.portal_officer(auth.uid()) OR mentor_id=auth.uid()));
CREATE POLICY "bookings private" ON public.interview_bookings FOR SELECT TO authenticated USING(public.portal_active(auth.uid()) AND (public.portal_officer(auth.uid()) OR public.portal_owns_cohort(auth.uid(),application_id) OR public.portal_interview_reviewer(auth.uid(),application_id)));
CREATE OR REPLACE FUNCTION public.portal_guard_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_OP='DELETE' THEN IF EXISTS(SELECT 1 FROM interview_bookings WHERE slot_id=OLD.id) THEN RAISE EXCEPTION 'Booked slots cannot be deleted'; END IF; RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM interview_bookings WHERE slot_id=OLD.id) THEN RAISE EXCEPTION 'Booked slots cannot change'; END IF;
 -- Serializes overlapping availability changes and bookings across both reviewers.
 PERFORM pg_advisory_xact_lock(6101901);
 IF EXISTS(SELECT 1 FROM interview_slots s WHERE s.id<>NEW.id AND (s.mentor_id IN (NEW.mentor_id,NEW.leader_id) OR s.leader_id IN (NEW.mentor_id,NEW.leader_id)) AND tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(NEW.starts_at,NEW.ends_at,'[)')) THEN RAISE EXCEPTION 'A reviewer already has an overlapping slot'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_interview_slot BEFORE INSERT OR UPDATE OR DELETE ON public.interview_slots FOR EACH ROW EXECUTE FUNCTION public.portal_guard_slot();

CREATE OR REPLACE FUNCTION public.save_cohort_portfolio(_topic text,_experience text,_skills text,_previous_work text,_paper_path text,_submit boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a cohort_applications; BEGIN
 IF NOT public.portal_active(auth.uid()) THEN RAISE EXCEPTION 'Membership approval required'; END IF;
 SELECT * INTO a FROM cohort_applications WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR a.status NOT IN ('Not Started','In Progress') THEN RAISE EXCEPTION 'Portfolio cannot be edited at this stage'; END IF;
 IF _paper_path IS NOT NULL AND split_part(_paper_path,'/',1)<>auth.uid()::text THEN RAISE EXCEPTION 'Invalid portfolio file'; END IF;
 IF _paper_path IS NOT NULL AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='cohort-portfolios' AND name=_paper_path) THEN RAISE EXCEPTION 'Upload your research paper before submitting'; END IF;
 IF _submit AND (length(trim(_topic))=0 OR length(trim(_experience))=0 OR length(trim(_skills))=0 OR length(trim(_previous_work))=0 OR _paper_path IS NULL) THEN RAISE EXCEPTION 'Complete all portfolio fields and upload a paper'; END IF;
 UPDATE cohort_applications SET topic=_topic,experience=_experience,skills=_skills,previous_work=_previous_work,paper_path=_paper_path,status=CASE WHEN _submit THEN 'Submitted' ELSE 'In Progress' END,submitted_at=CASE WHEN _submit THEN now() END,updated_at=now() WHERE id=a.id;
END $$;
CREATE OR REPLACE FUNCTION public.book_cohort_interview(_slot uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a cohort_applications; s interview_slots; u uuid; BEGIN
 IF NOT public.portal_active(auth.uid()) THEN RAISE EXCEPTION 'Membership approval required'; END IF;
 PERFORM pg_advisory_xact_lock(6101901);
 SELECT * INTO a FROM cohort_applications WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR a.status<>'Interview Scheduling' THEN RAISE EXCEPTION 'Interview scheduling is not open'; END IF;
 SELECT * INTO s FROM interview_slots WHERE id=_slot FOR UPDATE;
 IF NOT FOUND OR s.starts_at<=now() THEN RAISE EXCEPTION 'Slot unavailable'; END IF;
 IF s.cohort NOT IN ('Both',a.cohort) OR auth.uid() IN (s.mentor_id,s.leader_id) THEN RAISE EXCEPTION 'Choose a slot with reviewers for your cohort'; END IF;
 IF NOT public.portal_active(s.mentor_id) OR NOT public.portal_officer(s.leader_id) THEN RAISE EXCEPTION 'Reviewers are no longer available'; END IF;
 INSERT INTO interview_bookings(slot_id,application_id) VALUES(_slot,a.id);
 UPDATE cohort_applications SET status='Under Review',updated_at=now() WHERE id=a.id;
 FOREACH u IN ARRAY ARRAY[a.user_id,s.mentor_id,s.leader_id] LOOP
 PERFORM portal_notify(u,'cohorts','Interview confirmed','Your cohort interview is scheduled. Open the portal for details.','/portal/cohorts','interview:'||a.id||':'||u);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.review_cohort_application(_application uuid,_status text,_decision text DEFAULT NULL,_course uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE a cohort_applications; BEGIN
 IF NOT public.portal_officer(auth.uid()) THEN RAISE EXCEPTION 'Officer review required'; END IF;
 SELECT * INTO a FROM cohort_applications WHERE id=_application FOR UPDATE;
 IF NOT FOUND OR NOT ((a.status='Submitted' AND _status='Interview Scheduling') OR (a.status IN ('Submitted','Interview Scheduling','Under Review') AND _status='Decision Released')) THEN RAISE EXCEPTION 'Invalid application stage'; END IF;
 IF _status='Decision Released' AND length(trim(coalesce(_decision,'')))=0 THEN RAISE EXCEPTION 'A decision is required'; END IF;
 IF _course IS NOT NULL AND _status='Decision Released' THEN
   INSERT INTO course_enrollments(course_id,student_id) VALUES(_course,a.user_id) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE cohort_applications SET status=_status,decision=CASE WHEN _status='Decision Released' THEN _decision END,placement_course_id=_course,updated_at=now() WHERE id=a.id;
 PERFORM portal_notify(a.user_id,'cohorts',CASE WHEN _status='Decision Released' THEN 'Cohort decision released' ELSE 'Schedule your cohort interview' END,'An update is ready in your cohort application.','/portal/cohorts','cohort-stage:'||a.id||':'||_status);
END $$;

-- Only private file buckets; paths are checked against the actual learner/assignment.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
 ('course-submissions','course-submissions',false,20971520,ARRAY['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg']),
 ('course-resources','course-resources',false,20971520,ARRAY['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg']),
 ('cohort-portfolios','cohort-portfolios',false,20971520,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) ON CONFLICT DO NOTHING;
CREATE POLICY "learners upload course files" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='course-submissions' AND (storage.foldername(name))[1]=auth.uid()::text AND EXISTS(SELECT 1 FROM assignments a WHERE a.id::text=(storage.foldername(name))[2] AND a.status='published' AND public.portal_course_member(auth.uid(),a.course_id)));
CREATE POLICY "private course file read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='course-submissions' AND public.portal_active(auth.uid()) AND (public.portal_officer(auth.uid()) OR (storage.foldername(name))[1]=auth.uid()::text OR EXISTS(SELECT 1 FROM assignments a WHERE a.id::text=(storage.foldername(name))[2] AND public.portal_course_manager(auth.uid(),a.course_id))));
CREATE POLICY "mentors upload resources" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='course-resources' AND EXISTS(SELECT 1 FROM assignments a WHERE a.course_id::text=(storage.foldername(name))[1] AND a.id::text=(storage.foldername(name))[2] AND public.portal_course_manager(auth.uid(),a.course_id)));
CREATE POLICY "course participants read resources" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='course-resources' AND EXISTS(SELECT 1 FROM assignments a WHERE a.course_id::text=(storage.foldername(name))[1] AND a.id::text=(storage.foldername(name))[2] AND (public.portal_course_manager(auth.uid(),a.course_id) OR (a.status='published' AND public.portal_course_member(auth.uid(),a.course_id)))));
CREATE POLICY "applicant uploads portfolio" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='cohort-portfolios' AND (storage.foldername(name))[1]=auth.uid()::text AND public.portal_active(auth.uid()) AND EXISTS(SELECT 1 FROM cohort_applications a WHERE a.user_id=auth.uid() AND a.status IN ('Not Started','In Progress')));
CREATE POLICY "portfolio private read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='cohort-portfolios' AND public.portal_active(auth.uid()) AND ((storage.foldername(name))[1]=auth.uid()::text OR public.portal_officer(auth.uid()) OR EXISTS(SELECT 1 FROM cohort_applications a JOIN interview_bookings b ON b.application_id=a.id JOIN interview_slots s ON s.id=b.slot_id WHERE a.user_id::text=(storage.foldername(name))[1] AND s.mentor_id=auth.uid())));

-- Auth metadata stores consent at signup; it is never inferred from providing a phone.
CREATE OR REPLACE FUNCTION public.portal_application_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE meta jsonb; BEGIN
 IF TG_OP='INSERT' THEN
   SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id=NEW.user_id;
   INSERT INTO notification_preferences(user_id,phone,sms_enabled,sms_consent_at)
   VALUES(NEW.user_id,CASE WHEN NEW.phone ~ '^\+[1-9][0-9]{7,14}$' THEN NEW.phone END,
    coalesce(meta->>'sms_consent','false')='true' AND coalesce(NEW.phone ~ '^\+[1-9][0-9]{7,14}$',false),
    CASE WHEN meta->>'sms_consent'='true' THEN now() END) ON CONFLICT DO NOTHING;
 END IF;
 IF NEW.status='pending' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
   PERFORM portal_notify(NEW.user_id,'membership','Application received','Your application is under review. Portal access is pending officer approval.','/portal','application-received:'||NEW.user_id);
 END IF;
 IF NEW.status='approved' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
   PERFORM portal_notify(NEW.user_id,'membership','Membership approved','Your Beyond Medicine account is ready. Welcome to the member portal.','/portal','membership-approved:'||NEW.user_id);
 END IF;
 IF NEW.status='approved' AND lower(coalesce(NEW.cohort_preference,'')) IN ('intermediate','advanced') THEN
   INSERT INTO cohort_applications(user_id,cohort) VALUES(NEW.user_id,initcap(NEW.cohort_preference)) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_application_event AFTER INSERT OR UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.portal_application_event();
INSERT INTO cohort_applications(user_id,cohort) SELECT user_id,initcap(cohort_preference) FROM applications WHERE status='approved' AND lower(cohort_preference) IN ('intermediate','advanced') ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.portal_sync_course_mentors()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE m uuid; s uuid; BEGIN
 IF TG_TABLE_NAME='courses' THEN
   IF NEW.mentor_id IS NOT DISTINCT FROM OLD.mentor_id THEN RETURN NEW; END IF;
   FOR s IN SELECT student_id FROM course_enrollments WHERE course_id=NEW.id LOOP
     INSERT INTO mentor_students(mentor_id,student_id) VALUES(NEW.mentor_id,s) ON CONFLICT DO NOTHING;
     DELETE FROM mentor_students ms WHERE ms.mentor_id=OLD.mentor_id AND ms.student_id=s AND NOT EXISTS(SELECT 1 FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=s AND c.mentor_id=OLD.mentor_id);
   END LOOP;
   RETURN NEW;
 END IF;
 IF TG_OP='INSERT' THEN
   SELECT mentor_id INTO m FROM courses WHERE id=NEW.course_id;
   INSERT INTO mentor_students(mentor_id,student_id) VALUES(m,NEW.student_id) ON CONFLICT DO NOTHING;
   PERFORM portal_notify(NEW.student_id,'assignments','Your course is ready','Your course enrollment has been updated. Open your course workspace to get started.','/portal/courses','enrollment:'||NEW.id);
   RETURN NEW;
 END IF;
 SELECT mentor_id INTO m FROM courses WHERE id=OLD.course_id;
 DELETE FROM mentor_students ms WHERE ms.mentor_id=m AND ms.student_id=OLD.student_id AND NOT EXISTS(SELECT 1 FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=OLD.student_id AND c.mentor_id=m);
 RETURN OLD;
END $$;
CREATE TRIGGER sync_enrollment_mentor AFTER INSERT OR DELETE ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION public.portal_sync_course_mentors();
CREATE TRIGGER sync_course_mentor AFTER UPDATE OF mentor_id ON public.courses FOR EACH ROW EXECUTE FUNCTION public.portal_sync_course_mentors();
INSERT INTO mentor_students(mentor_id,student_id) SELECT c.mentor_id,e.student_id FROM course_enrollments e JOIN courses c ON c.id=e.course_id ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.portal_activity_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE u uuid; owner_id uuid; c uuid; BEGIN
 IF TG_TABLE_NAME='messages' THEN
   FOR u IN SELECT user_id FROM conversation_members WHERE conversation_id=NEW.conversation_id AND user_id<>NEW.sender_id LOOP
     PERFORM portal_notify(u,'messages','New direct message','You have a new message. Sign in to read it.','/portal/messages?conversation='||NEW.conversation_id,'message:'||NEW.id||':'||u);
   END LOOP;
 ELSIF TG_TABLE_NAME='help_replies' THEN
   SELECT requester_id INTO owner_id FROM help_tickets WHERE id=NEW.ticket_id;
   FOR u IN SELECT id FROM profiles WHERE (id=owner_id OR public.portal_officer(id)) AND id<>NEW.author_id LOOP
     PERFORM portal_notify(u,'messages','Beyond Medicine Help Desk','A private Help Desk conversation has a new reply.','/portal/help-desk','help-reply:'||NEW.id||':'||u);
   END LOOP;
 ELSIF TG_TABLE_NAME='help_tickets' THEN
   FOR u IN SELECT id FROM profiles WHERE public.portal_officer(id) LOOP
     PERFORM portal_notify(u,'messages','New Help Desk question','A member needs officer assistance.','/portal/help-desk','help-ticket:'||NEW.id||':'||u);
   END LOOP;
 ELSIF TG_TABLE_NAME='assignments' THEN
   IF NEW.status='published' AND (TG_OP='INSERT' OR OLD.status<>'published' OR NEW.due_date IS DISTINCT FROM OLD.due_date) THEN
     FOR u IN SELECT student_id FROM course_enrollments WHERE course_id=NEW.course_id LOOP
       PERFORM portal_notify(u,'assignments',CASE WHEN TG_OP='UPDATE' AND OLD.status='published' THEN 'Assignment deadline changed' ELSE 'New assignment' END,NEW.title,'/portal/courses?section=assignments','assignment:'||NEW.id||':'||u||':'||clock_timestamp());
     END LOOP;
   END IF;
 ELSIF TG_TABLE_NAME='submissions' THEN
   IF TG_OP='UPDATE' AND (NEW.feedback IS DISTINCT FROM OLD.feedback OR NEW.grade IS DISTINCT FROM OLD.grade) THEN
     PERFORM portal_notify(NEW.student_id,'assignments','Assignment feedback available','Your mentor has updated your feedback or grade.','/portal/courses?section=assignments','feedback:'||NEW.id||':'||clock_timestamp());
   END IF;
 ELSIF TG_TABLE_NAME IN ('course_posts','course_replies') THEN
   IF TG_TABLE_NAME='course_posts' THEN c=NEW.course_id; ELSE SELECT course_id INTO c FROM course_posts WHERE id=NEW.post_id; END IF;
   FOR u IN SELECT student_id FROM course_enrollments WHERE course_id=c UNION SELECT mentor_id FROM courses WHERE id=c LOOP
     IF u<>NEW.author_id THEN PERFORM portal_notify(u,'messages','Course discussion update','New information is available in your course.','/portal/courses?section=discussions','course-post:'||NEW.id||':'||u); END IF;
   END LOOP;
 ELSIF TG_TABLE_NAME='portal_events' THEN
   IF NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.cancelled IS DISTINCT FROM OLD.cancelled OR NEW.location IS DISTINCT FROM OLD.location OR NEW.meeting_link IS DISTINCT FROM OLD.meeting_link OR NEW.registration_deadline IS DISTINCT FROM OLD.registration_deadline THEN
     FOR u IN SELECT user_id FROM event_registrations WHERE event_id=NEW.id LOOP
       PERFORM portal_notify(u,'events',CASE WHEN NEW.cancelled THEN 'Event cancelled' ELSE 'Event schedule updated' END,NEW.title,'/portal/events','event-update:'||NEW.id||':'||u||':'||NEW.updated_at);
     END LOOP;
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notify_messages AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.portal_activity_notification();
CREATE TRIGGER notify_help_replies AFTER INSERT ON public.help_replies FOR EACH ROW EXECUTE FUNCTION public.portal_activity_notification();
CREATE TRIGGER notify_help_tickets AFTER INSERT ON public.help_tickets FOR EACH ROW EXECUTE FUNCTION public.portal_activity_notification();
CREATE TRIGGER notify_assignments AFTER INSERT OR UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.portal_activity_notification();
CREATE TRIGGER notify_submissions AFTER UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.portal_activity_notification();
CREATE TRIGGER notify_course_posts AFTER INSERT ON public.course_posts FOR EACH ROW EXECUTE FUNCTION public.portal_activity_notification();
CREATE TRIGGER notify_course_replies AFTER INSERT ON public.course_replies FOR EACH ROW EXECUTE FUNCTION public.portal_activity_notification();
CREATE TRIGGER notify_event_changes AFTER UPDATE ON public.portal_events FOR EACH ROW EXECUTE FUNCTION public.portal_activity_notification();

CREATE OR REPLACE FUNCTION public.queue_portal_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r record; BEGIN
 FOR r IN
   SELECT e.id::text item,e.title,e.starts_at due,reg.user_id,'events' category,'/portal/events' link,24 hours FROM portal_events e JOIN event_registrations reg ON reg.event_id=e.id WHERE NOT e.cancelled
   UNION ALL SELECT e.id::text,e.title,e.starts_at,reg.user_id,'events','/portal/events',e.reminder_hours FROM portal_events e JOIN event_registrations reg ON reg.event_id=e.id WHERE NOT e.cancelled AND e.reminder_hours IS NOT NULL AND e.reminder_hours<>24
   UNION ALL SELECT e.id||':registration',e.title||' registration deadline',e.registration_deadline,p.id,'events','/portal/events',24 FROM portal_events e JOIN profiles p ON public.portal_active(p.id) AND (e.course_id IS NULL OR public.portal_course_member(p.id,e.course_id)) WHERE NOT e.cancelled AND NOT EXISTS(SELECT 1 FROM event_registrations er WHERE er.event_id=e.id AND er.user_id=p.id)
   UNION ALL SELECT a.id::text,a.title,a.due_date,e.student_id,'assignments','/portal/courses?section=assignments',24 FROM assignments a JOIN course_enrollments e ON e.course_id=a.course_id WHERE a.status='published' AND NOT EXISTS(SELECT 1 FROM submissions s WHERE s.assignment_id=a.id AND s.student_id=e.student_id)
   UNION ALL SELECT a.id::text,a.title,a.due_at,p.id,'assignments','/portal/admissions',24 FROM admissions_assignments a JOIN profiles p ON public.can_view_admissions_assignment(p.id,a.id) WHERE a.status='published' AND NOT public.can_manage_admissions_assignments(p.id) AND NOT EXISTS(SELECT 1 FROM admissions_assignment_submissions s WHERE s.assignment_id=a.id AND s.user_id=p.id AND s.status<>'draft')
   UNION ALL SELECT s.id::text,'Cohort interview',s.starts_at,u,'cohorts','/portal/cohorts',24 FROM interview_bookings b JOIN interview_slots s ON s.id=b.slot_id JOIN cohort_applications a ON a.id=b.application_id CROSS JOIN LATERAL unnest(ARRAY[a.user_id,s.mentor_id,s.leader_id]) u
   UNION ALL SELECT m.id::text,m.title,m.starts_at,p.id,'events','/portal/calendar',24 FROM meetings m JOIN profiles p ON public.portal_active(p.id) AND (m.visibility='all_members' OR (m.visibility='leadership' AND public.portal_officer(p.id)) OR (m.visibility='mentors' AND public.has_role(p.id,'mentor')) OR EXISTS(SELECT 1 FROM meeting_attendees a WHERE a.meeting_id=m.id AND a.user_id=p.id AND a.rsvp IN ('yes','pending','maybe'))) WHERE NOT EXISTS(SELECT 1 FROM meeting_attendees a WHERE a.meeting_id=m.id AND a.user_id=p.id AND a.rsvp='no')
   UNION ALL SELECT t.id::text,t.title,(t.due_date+time '23:59') AT TIME ZONE coalesce((SELECT name FROM pg_timezone_names WHERE name=coalesce(p.time_zone,app.time_zone) LIMIT 1),'UTC'),t.assignee_id,'assignments','/portal',24 FROM tasks t JOIN profiles p ON p.id=t.assignee_id LEFT JOIN applications app ON app.user_id=t.assignee_id WHERE t.status<>'completed'
 LOOP
   IF r.due>now() AND r.due<=now()+make_interval(hours=>r.hours) AND (public.portal_active(r.user_id) OR (r.link='/portal/admissions' AND EXISTS(SELECT 1 FROM profiles WHERE id=r.user_id AND status='active'))) THEN
     PERFORM portal_notify(r.user_id,r.category,'Upcoming: '||r.title,'A scheduled event or deadline is approaching. Open the portal for details.',r.link,'reminder:'||r.category||':'||r.item||':'||r.user_id||':'||r.due||':'||r.hours);
   END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.queue_portal_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.queue_portal_reminders() TO service_role;

CREATE OR REPLACE FUNCTION public.portal_event_counts()
RETURNS TABLE(event_id uuid, registration_count bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT e.id,count(r.user_id) FROM portal_events e LEFT JOIN event_registrations r ON r.event_id=e.id
 WHERE public.portal_active(auth.uid()) AND (e.course_id IS NULL OR public.portal_course_member(auth.uid(),e.course_id)) GROUP BY e.id;
$$;
CREATE OR REPLACE FUNCTION public.portal_unread_message_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT count(*) FROM messages m JOIN conversation_members cm ON cm.conversation_id=m.conversation_id
 WHERE public.portal_active(auth.uid()) AND cm.user_id=auth.uid() AND m.sender_id<>auth.uid()
 AND (cm.last_read_at IS NULL OR m.created_at>cm.last_read_at);
$$;
CREATE OR REPLACE FUNCTION public.available_interview_slots()
RETURNS TABLE(id uuid,mentor_id uuid,leader_id uuid,cohort text,starts_at timestamptz,ends_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.mentor_id,s.leader_id,s.cohort,s.starts_at,s.ends_at FROM interview_slots s WHERE public.portal_active(auth.uid()) AND s.starts_at>now()
 AND public.portal_active(s.mentor_id) AND public.portal_officer(s.leader_id)
 AND (public.portal_officer(auth.uid()) OR public.has_role(auth.uid(),'mentor') OR EXISTS(SELECT 1 FROM cohort_applications a WHERE a.user_id=auth.uid() AND s.cohort IN ('Both',a.cohort)))
 AND NOT EXISTS(SELECT 1 FROM interview_bookings b WHERE b.slot_id=s.id) ORDER BY s.starts_at;
$$;
CREATE OR REPLACE FUNCTION public.move_course_enrollment(_student uuid,_course uuid,_from uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE m uuid; BEGIN
 IF NOT public.portal_officer(auth.uid()) THEN RAISE EXCEPTION 'Officer access required'; END IF;
 IF NOT public.portal_active(_student) THEN RAISE EXCEPTION 'Member must be active and approved'; END IF;
 SELECT mentor_id INTO m FROM courses WHERE id=_course;
 IF NOT FOUND THEN RAISE EXCEPTION 'Course not found'; END IF;
 IF _from=_course THEN RAISE EXCEPTION 'Choose a different destination'; END IF;
 IF _from IS NOT NULL THEN DELETE FROM course_enrollments WHERE student_id=_student AND course_id=_from; END IF;
 INSERT INTO course_enrollments(course_id,student_id) VALUES(_course,_student) ON CONFLICT DO NOTHING;
 INSERT INTO mentor_students(mentor_id,student_id) VALUES(m,_student) ON CONFLICT DO NOTHING;
 IF _from IS NOT NULL THEN DELETE FROM mentor_students ms WHERE ms.student_id=_student AND NOT EXISTS(SELECT 1 FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=_student AND c.mentor_id=ms.mentor_id); END IF;
END $$;
CREATE OR REPLACE FUNCTION public.portal_reviewers()
RETURNS TABLE(id uuid,full_name text,is_mentor boolean,is_officer boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.full_name,public.has_role(p.id,'mentor'),public.portal_officer(p.id) FROM profiles p
 WHERE public.portal_active(auth.uid()) AND (public.portal_officer(auth.uid()) OR public.has_role(auth.uid(),'mentor'))
 AND public.portal_active(p.id) AND (public.has_role(p.id,'mentor') OR public.portal_officer(p.id));
$$;

CREATE OR REPLACE FUNCTION public.portal_guard_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.portal_officer(auth.uid()) AND
 (NEW.status IS DISTINCT FROM OLD.status OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at OR NEW.verification_status IS DISTINCT FROM OLD.verification_status OR (NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS DISTINCT FROM (SELECT email FROM auth.users WHERE id=NEW.id)) OR NEW.id<>OLD.id) THEN
 RAISE EXCEPTION 'Account status and verification require officer approval'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_guard_profile BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.portal_guard_profile();
CREATE OR REPLACE FUNCTION public.portal_sync_auth_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.email IS DISTINCT FROM OLD.email THEN UPDATE profiles SET email=NEW.email WHERE id=NEW.id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_sync_auth_email AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.portal_sync_auth_email();
CREATE POLICY "active role reads" ON public.user_roles AS RESTRICTIVE FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.portal_active(auth.uid()));
CREATE POLICY "active position reads" ON public.user_positions AS RESTRICTIVE FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.portal_active(auth.uid()));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['user_roles','user_positions'] LOOP
 EXECUTE format('CREATE POLICY "officers insert lower accounts" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(public.portal_officer(auth.uid()) AND user_id<>auth.uid() AND public.actor_rank(user_id)<public.actor_rank(auth.uid()))',t);
 EXECUTE format('CREATE POLICY "officers update lower accounts" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(public.portal_officer(auth.uid()) AND user_id<>auth.uid() AND public.actor_rank(user_id)<public.actor_rank(auth.uid())) WITH CHECK(public.portal_officer(auth.uid()) AND user_id<>auth.uid() AND public.actor_rank(user_id)<public.actor_rank(auth.uid()))',t);
 EXECUTE format('CREATE POLICY "officers delete lower accounts" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING(public.portal_officer(auth.uid()) AND user_id<>auth.uid() AND public.actor_rank(user_id)<public.actor_rank(auth.uid()))',t);
 END LOOP; END $$;

-- Legacy custom meetings were visible to everyone; only invitees and their organizer may read them.
DROP POLICY IF EXISTS "approved members read meetings" ON public.meetings;
CREATE POLICY "meetings private audience" ON public.meetings FOR SELECT TO authenticated USING(public.portal_active(auth.uid()) AND (
 public.portal_officer(auth.uid()) OR created_by=auth.uid() OR visibility='all_members'
 OR (visibility='mentors' AND public.has_role(auth.uid(),'mentor'))
 OR (visibility='custom' AND EXISTS(SELECT 1 FROM meeting_attendees a WHERE a.meeting_id=meetings.id AND a.user_id=auth.uid()))));
DROP POLICY IF EXISTS "own rsvp upsert" ON public.meeting_attendees;
CREATE POLICY "rsvp to visible meetings" ON public.meeting_attendees FOR INSERT TO authenticated WITH CHECK(public.portal_officer(auth.uid()) OR (user_id=auth.uid() AND public.portal_active(auth.uid()) AND EXISTS(SELECT 1 FROM meetings m WHERE m.id=meeting_id AND m.visibility<>'custom')));
CREATE OR REPLACE FUNCTION public.portal_guard_attendee()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.meeting_id<>OLD.meeting_id OR NEW.user_id<>OLD.user_id THEN RAISE EXCEPTION 'Attendee identity cannot change'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_guard_attendee BEFORE UPDATE ON public.meeting_attendees FOR EACH ROW EXECUTE FUNCTION public.portal_guard_attendee();
CREATE OR REPLACE FUNCTION public.portal_meeting_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE u uuid; BEGIN
 IF TG_OP='UPDATE' AND NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at AND NEW.ends_at IS NOT DISTINCT FROM OLD.ends_at AND NEW.meeting_link IS NOT DISTINCT FROM OLD.meeting_link AND NEW.location IS NOT DISTINCT FROM OLD.location THEN RETURN NEW; END IF;
 FOR u IN SELECT p.id FROM profiles p WHERE public.portal_active(p.id) AND (NEW.visibility='all_members' OR (NEW.visibility='leadership' AND public.portal_officer(p.id)) OR (NEW.visibility='mentors' AND public.has_role(p.id,'mentor')) OR EXISTS(SELECT 1 FROM meeting_attendees a WHERE a.meeting_id=NEW.id AND a.user_id=p.id AND a.rsvp<>'no')) LOOP
 PERFORM portal_notify(u,'events',CASE WHEN TG_OP='INSERT' THEN 'Meeting scheduled' ELSE 'Meeting schedule updated' END,NEW.title,'/portal/calendar','meeting:'||NEW.id||':'||u||':'||NEW.updated_at);
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER notify_meeting_schedule AFTER INSERT OR UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.portal_meeting_notification();

CREATE OR REPLACE FUNCTION public.portal_admissions_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE u uuid; a admissions_assignments; BEGIN
 IF TG_TABLE_NAME='admissions_assignment_submissions' THEN
   IF NEW.feedback IS DISTINCT FROM OLD.feedback OR NEW.score IS DISTINCT FROM OLD.score THEN
     PERFORM portal_notify(NEW.user_id,'assignments','Admissions feedback available','Your assignment has new feedback.','/portal/admissions','admissions-feedback:'||NEW.id||':'||clock_timestamp());
   END IF;
 ELSE
   IF NEW.status='published' AND (TG_OP='INSERT' OR OLD.status<>'published' OR NEW.due_at IS DISTINCT FROM OLD.due_at) THEN
     FOR u IN SELECT p.id FROM profiles p WHERE public.can_view_admissions_assignment(p.id,NEW.id) AND NOT public.can_manage_admissions_assignments(p.id) LOOP
       PERFORM portal_notify(u,'assignments','Admissions assignment update',NEW.title,'/portal/admissions','admissions-assignment:'||NEW.id||':'||u||':'||clock_timestamp());
     END LOOP;
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER notify_admissions_assignment AFTER INSERT OR UPDATE ON public.admissions_assignments FOR EACH ROW EXECUTE FUNCTION public.portal_admissions_notification();
CREATE TRIGGER notify_admissions_feedback AFTER UPDATE ON public.admissions_assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.portal_admissions_notification();

-- Messaging RPCs retain the existing interface; table triggers also cover direct API calls.
CREATE OR REPLACE FUNCTION public.portal_guard_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NOT NULL AND (NOT public.portal_active(auth.uid()) OR NOT public.in_conversation(auth.uid(),NEW.conversation_id) OR NEW.sender_id<>auth.uid()) THEN RAISE EXCEPTION 'Approved conversation membership required'; END IF;
 IF length(trim(NEW.body)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Message must contain between 1 and 10000 characters'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_guard_message BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.portal_guard_message();
CREATE OR REPLACE FUNCTION public.portal_guard_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.portal_active(auth.uid()) THEN RAISE EXCEPTION 'Approved membership required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_guard_conversation BEFORE INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.portal_guard_conversation();
CREATE OR REPLACE FUNCTION public.portal_guard_conversation_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.portal_active(NEW.user_id) THEN RAISE EXCEPTION 'Only approved active members may join conversations'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_guard_conversation_member BEFORE INSERT ON public.conversation_members FOR EACH ROW EXECUTE FUNCTION public.portal_guard_conversation_member();
CREATE POLICY "active members read messages" ON public.messages AS RESTRICTIVE FOR SELECT TO authenticated USING(public.portal_active(auth.uid()));
CREATE POLICY "active members read conversations" ON public.conversations AS RESTRICTIVE FOR SELECT TO authenticated USING(public.portal_active(auth.uid()));
CREATE POLICY "active members read memberships" ON public.conversation_members AS RESTRICTIVE FOR SELECT TO authenticated USING(public.portal_active(auth.uid()));
CREATE OR REPLACE FUNCTION public.search_members(_query text,_limit integer DEFAULT 8)
RETURNS TABLE(id uuid,username text,full_name text,avatar_url text,primary_position public.position_title)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.id,p.username,p.full_name,p.avatar_url,pos.position FROM profiles p
 LEFT JOIN LATERAL(SELECT up.position FROM user_positions up WHERE up.user_id=p.id ORDER BY up.assigned_at LIMIT 1) pos ON true
 WHERE public.portal_active(auth.uid()) AND public.portal_active(p.id) AND p.id<>auth.uid() AND length(trim(_query))>=2
 AND (lower(p.username) LIKE lower(trim(_query))||'%' OR lower(coalesce(p.full_name,'')) LIKE '%'||lower(trim(_query))||'%')
 ORDER BY CASE WHEN lower(p.username)=lower(trim(_query)) THEN 0 ELSE 1 END,p.full_name NULLS LAST,p.username LIMIT LEAST(GREATEST(coalesce(_limit,8),1),20);
$$;
-- Realtime is an enhancement; the inbox also polls so it works without a websocket.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
 END IF;
END $$;

-- Explicitly restrict all public RPCs introduced here.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('portal_active','portal_officer','portal_course_manager','portal_course_member','portal_directory','register_portal_event','save_cohort_portfolio','book_cohort_interview','review_cohort_application','portal_event_counts','available_interview_slots','portal_reviewers','move_course_enrollment','portal_owns_cohort','portal_interview_reviewer','portal_slot_visible','portal_unread_message_count') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',r.signature);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated,service_role',r.signature);
 END LOOP;
END $$;
-- Supabase installations may have default table grants. Revoke them before applying
-- column-level privileges (especially notification read markers and ticket triage).
REVOKE ALL ON public.notification_preferences,public.notifications,public.notification_deliveries,public.course_posts,public.course_replies,public.help_tickets,public.help_replies,public.portal_events,public.event_registrations,public.cohort_applications,public.interview_slots,public.interview_bookings FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE(read_at) ON public.notifications TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.course_posts,public.course_replies TO authenticated;
GRANT SELECT,INSERT ON public.help_tickets,public.help_replies TO authenticated;
GRANT UPDATE(status,assigned_to) ON public.help_tickets TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.portal_events TO authenticated;
GRANT SELECT ON public.event_registrations,public.cohort_applications,public.interview_bookings TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.interview_slots TO authenticated;
$member_portal_body$;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('beyond-medicine-member-portal-deploy'));
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=$1)'
      INTO applied USING '20261019000000';
  END IF;
  SELECT array_agg(t) INTO missing FROM unnest(expected_tables) t WHERE to_regclass(t) IS NULL;
  IF applied THEN
    IF missing IS NOT NULL THEN
      RAISE EXCEPTION 'Migration 20261019000000 is recorded, but portal tables are missing: %', array_to_string(missing, ', ')
        USING HINT='Inspect database drift and migration history before changing production.';
    END IF;
    RAISE NOTICE 'Member portal migration 20261019000000 is already recorded. No schema changes made.';
    RETURN;
  END IF;
  SELECT array_agg(t) INTO present FROM unnest(expected_tables) t WHERE to_regclass(t) IS NOT NULL;
  IF present IS NOT NULL THEN
    RAISE EXCEPTION 'Portal objects already exist but migration 20261019000000 is not recorded: %', array_to_string(present, ', ')
      USING HINT='Do not rerun the raw migration. Follow the migration-history section in docs/member-portal-setup.md.';
  END IF;

  SELECT array_agg(t) INTO missing FROM unnest(ARRAY[
    'auth.users','storage.buckets','storage.objects','public.profiles','public.applications',
    'public.user_roles','public.user_positions','public.mentor_students','public.research_groups',
    'public.research_group_members','public.courses','public.course_enrollments','public.assignments',
    'public.submissions','public.conversations','public.conversation_members','public.messages',
    'public.meetings','public.meeting_attendees','public.tasks','public.admin_audit_log',
    'public.admissions_assignments','public.admissions_assignment_targets','public.admissions_assignment_submissions'
  ]) t WHERE to_regclass(t) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Earlier Beyond Medicine database migrations are missing: %', array_to_string(missing, ', ')
      USING HINT='Apply the earlier migrations using supabase db push after reviewing supabase db push --dry-run. This file is an upgrade, not a blank-database installer.';
  END IF;
  SELECT array_agg(f) INTO missing FROM unnest(ARRAY[
    'public.has_role(uuid,public.app_role)','public.has_position(uuid,public.position_title)',
    'public.is_super_admin(uuid)','public.is_officer_or_above(uuid)',
    'public.in_research_group(uuid,uuid)','public.is_enrolled(uuid,uuid)',
    'public.owns_course(uuid,uuid)','public.mentor_of_assignment(uuid,uuid)',
    'public.in_conversation(uuid,uuid)','public.has_full_access(uuid)',
    'public.can_manage_applications(uuid)','public.actor_rank(uuid)',
    'public.update_updated_at_column()','public.can_submit_admissions_assignment(uuid,uuid)'
  ]) f WHERE to_regprocedure(f) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Earlier database helper functions are missing: %', array_to_string(missing, ', ');
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='username')
     OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='verification_status')
     OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assignments' AND column_name='status') THEN
    RAISE EXCEPTION 'Earlier profile/messaging/assignment migrations are missing. Apply those before this upgrade.';
  END IF;

  EXECUTE migration_sql;
  CREATE SCHEMA IF NOT EXISTS supabase_migrations;
  CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations(version text NOT NULL PRIMARY KEY);
  ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS name text;
  ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS statements text[];
  REVOKE ALL ON supabase_migrations.schema_migrations FROM anon,authenticated;
  INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
    VALUES('20261019000000','member_portal',ARRAY[migration_sql]);
  RAISE NOTICE 'Member portal upgrade applied and recorded. Next deploy the app, configure Vault, then run member_portal_notifications_setup.sql.';
END
$portal_deploy$;
NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT version,name FROM supabase_migrations.schema_migrations WHERE version='20261019000000';
