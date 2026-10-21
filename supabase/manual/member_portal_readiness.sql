-- READ ONLY. Run in Supabase SQL Editor as postgres before/after rollout.
-- This does not trigger delivery, expose secrets, or modify member data.
-- A false value identifies something still needing setup; it is not permission to
-- rerun old migrations against a populated database.
WITH required_tables(name) AS (
 VALUES ('notification_preferences'),('notifications'),('notification_deliveries'),
 ('course_posts'),('course_replies'),('help_tickets'),('help_replies'),('portal_events'),
 ('event_registrations'),('cohort_applications'),('interview_slots'),('interview_bookings')
)
SELECT 'table_and_rls' AS check_group,r.name AS item,
       coalesce(c.relrowsecurity,false) AS ready
FROM required_tables r LEFT JOIN pg_namespace n ON n.nspname='public'
LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=r.name AND c.relkind='r'
UNION ALL
SELECT 'private_storage_bucket', b.name,
       EXISTS(SELECT 1 FROM storage.buckets s WHERE s.id=b.name AND NOT s.public)
FROM (VALUES ('course-submissions'),('course-resources'),('cohort-portfolios')) b(name)
UNION ALL
SELECT 'function', f.name,to_regprocedure(f.name) IS NOT NULL
FROM (VALUES ('public.queue_portal_reminders()'),('public.claim_notification_deliveries(integer)'),
 ('public.portal_unread_message_count()'),('public.register_portal_event(uuid,boolean)'),
 ('public.save_cohort_portfolio(text,text,text,text,text,boolean)'),('public.book_cohort_interview(uuid)'),
 ('public.review_cohort_application(uuid,text,text,uuid)'),('public.move_course_enrollment(uuid,uuid,uuid)')) f(name)
UNION ALL
SELECT 'integration', 'Cron enabled',to_regnamespace('cron') IS NOT NULL
UNION ALL
SELECT 'integration', 'pg_net available',to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL
UNION ALL
SELECT 'integration', 'Vault available',to_regclass('vault.decrypted_secrets') IS NOT NULL
ORDER BY check_group,item;

-- Optional integrations are inspected dynamically so this report also runs BEFORE
-- they are installed. Notices never print decrypted secrets or private message text.
DO $report$
DECLARE r record; secrets_ok boolean; migration_recorded boolean;
BEGIN
 IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
   EXECUTE 'SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=$1)'
     INTO migration_recorded USING '20261019000000';
   RAISE NOTICE 'Member portal migration recorded: %',migration_recorded;
 ELSE
   RAISE NOTICE 'No CLI migration history table exists yet.';
 END IF;
 IF to_regclass('vault.decrypted_secrets') IS NOT NULL THEN
   EXECUTE $sql$SELECT count(*)=2 FROM vault.decrypted_secrets WHERE name IN ('portal_base_url','portal_notification_cron_secret')$sql$ INTO secrets_ok;
   RAISE NOTICE 'Both notification Vault entries exist: %',secrets_ok;
 END IF;
 IF to_regclass('cron.job') IS NOT NULL THEN
   FOR r IN EXECUTE $sql$SELECT jobname,schedule,active FROM cron.job WHERE jobname='beyond-medicine-notifications'$sql$ LOOP
     RAISE NOTICE 'Scheduler: %, schedule: %, active: %',r.jobname,r.schedule,r.active;
   END LOOP;
   IF NOT FOUND THEN RAISE NOTICE 'Notification scheduler is not installed.'; END IF;
 END IF;
 IF to_regclass('public.notification_deliveries') IS NOT NULL THEN
   FOR r IN EXECUTE 'SELECT channel,status,count(*) total FROM public.notification_deliveries GROUP BY channel,status ORDER BY channel,status' LOOP
     RAISE NOTICE 'Delivery queue: channel %, status %, count %',r.channel,r.status,r.total;
   END LOOP;
 END IF;
END
$report$;
