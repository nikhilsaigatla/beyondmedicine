-- Run AFTER the portal schema and deployed website are ready.
-- Supabase Dashboard > SQL Editor > New query. Run the entire file as postgres.
-- Requires pg_cron, pg_net, and Vault enabled in Supabase.
-- Create these TWO entries in Supabase Vault before running:
--   portal_base_url: your deployed HTTPS origin, e.g. https://beyond-medicine.org
--   portal_notification_cron_secret: EXACTLY the server's NOTIFICATION_CRON_SECRET
-- Do not paste real secrets into this repository. BREVO_API_KEY stays on the web server.
-- Running this script ACTIVATES external email/SMS processing every minute.
-- Rerunning updates the same named job; it does not create another schedule.

BEGIN;
DO $setup$
DECLARE
  portal_url text;
  cron_secret text;
  job_id bigint;
BEGIN
  IF to_regclass('public.notification_deliveries') IS NULL
     OR to_regprocedure('public.queue_portal_reminders()') IS NULL
     OR to_regprocedure('public.claim_notification_deliveries(integer)') IS NULL THEN
    RAISE EXCEPTION 'Apply the member portal database upgrade first.';
  END IF;
  IF to_regnamespace('cron') IS NULL THEN
    RAISE EXCEPTION 'Enable pg_cron in Supabase Integrations > Cron first.';
  END IF;
  IF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN
    RAISE EXCEPTION 'Enable the pg_net extension in Supabase first.';
  END IF;
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE EXCEPTION 'Enable Supabase Vault first, then create the two named secrets.';
  END IF;
  IF (SELECT count(*) FROM vault.decrypted_secrets WHERE name='portal_base_url')<>1
     OR (SELECT count(*) FROM vault.decrypted_secrets WHERE name='portal_notification_cron_secret')<>1 THEN
    RAISE EXCEPTION 'Create exactly one Vault secret named portal_base_url and one named portal_notification_cron_secret.';
  END IF;
  SELECT decrypted_secret INTO portal_url FROM vault.decrypted_secrets WHERE name='portal_base_url';
  SELECT decrypted_secret INTO cron_secret FROM vault.decrypted_secrets WHERE name='portal_notification_cron_secret';
  -- Only an HTTPS origin is accepted: no path, query, credentials, or whitespace.
  IF coalesce(portal_url,'') !~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]+)?/?$' THEN
    RAISE EXCEPTION 'portal_base_url must be your HTTPS website origin, without a page path.';
  END IF;
  IF length(coalesce(cron_secret,''))<32 OR cron_secret<>btrim(cron_secret) OR cron_secret ~ '[[:cntrl:]]'
     OR cron_secret ~* '(replace[_ -]?me|your[_ -]?secret|paste[_ -]?here)' THEN
    RAISE EXCEPTION 'Use a random NOTIFICATION_CRON_SECRET of at least 32 characters; copy the exact same value into Vault and your web server environment.';
  END IF;
  SELECT cron.schedule('beyond-medicine-notifications','* * * * *', $job$
    SELECT net.http_post(
      url := rtrim((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='portal_base_url'),'/') || '/api/notifications/dispatch',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='portal_notification_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $job$) INTO job_id;
  -- cron.schedule updates the command/schedule of a named job; explicitly reactivate it too.
  UPDATE cron.job SET active=true WHERE jobid=job_id;
  RAISE NOTICE 'Notification scheduler enabled. Inspect HTTP results and Cron history after the next minute.';
END
$setup$;
COMMIT;

-- Contains only secret REFERENCES, never the secret values.
SELECT jobid,jobname,schedule,active FROM cron.job WHERE jobname='beyond-medicine-notifications';

-- To pause delivery later, run this separately in SQL Editor:
-- UPDATE cron.job SET active=false WHERE jobname='beyond-medicine-notifications';
