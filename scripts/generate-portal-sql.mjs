import { readFile, writeFile, mkdir } from "node:fs/promises";

const version = "20261019000000";
const migrationPath = `supabase/migrations/${version}_member_portal.sql`;
const outputPath = "supabase/manual/member_portal_setup.sql";
const source = (await readFile(migrationPath, "utf8")).replace(/\r\n/g, "\n");
if (!/^BEGIN;$/m.test(source) || !/^COMMIT;\s*$/m.test(source)) {
  throw new Error("Expected a transaction-wrapped member portal migration.");
}
const body = source
  .replace(/^BEGIN;\n/m, "")
  .replace(/^COMMIT;\s*$/m, "")
  .trim();
if (body.includes("$member_portal_body$")) throw new Error("SQL delimiter collision.");
const sql = `-- GENERATED from ${migrationPath}; do not edit this copy.
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
${body}
$member_portal_body$;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('beyond-medicine-member-portal-deploy'));
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=$1)'
      INTO applied USING '${version}';
  END IF;
  SELECT array_agg(t) INTO missing FROM unnest(expected_tables) t WHERE to_regclass(t) IS NULL;
  IF applied THEN
    IF missing IS NOT NULL THEN
      RAISE EXCEPTION 'Migration ${version} is recorded, but portal tables are missing: %', array_to_string(missing, ', ')
        USING HINT='Inspect database drift and migration history before changing production.';
    END IF;
    RAISE NOTICE 'Member portal migration ${version} is already recorded. No schema changes made.';
    RETURN;
  END IF;
  SELECT array_agg(t) INTO present FROM unnest(expected_tables) t WHERE to_regclass(t) IS NOT NULL;
  IF present IS NOT NULL THEN
    RAISE EXCEPTION 'Portal objects already exist but migration ${version} is not recorded: %', array_to_string(present, ', ')
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
    VALUES('${version}','member_portal',ARRAY[migration_sql]);
  RAISE NOTICE 'Member portal upgrade applied and recorded. Next deploy the app, configure Vault, then run member_portal_notifications_setup.sql.';
END
$portal_deploy$;
NOTIFY pgrst, 'reload schema';
COMMIT;

SELECT version,name FROM supabase_migrations.schema_migrations WHERE version='${version}';
`;
await mkdir("supabase/manual", { recursive: true });
if (process.argv.includes("--check")) {
  const existing = await readFile(outputPath, "utf8").catch(() => "");
  if (existing.replace(/\r\n/g, "\n") !== sql) {
    throw new Error(`${outputPath} is out of date. Run npm run sql:portal.`);
  }
  console.log("Portal SQL Editor bundle matches the source migration.");
} else {
  await writeFile(outputPath, sql);
  console.log(`Generated ${outputPath}`);
}
