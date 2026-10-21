import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const setup = await readFile("supabase/manual/member_portal_setup.sql", "utf8");
const scheduler = await readFile("supabase/manual/member_portal_notifications_setup.sql", "utf8");
const report = await readFile("supabase/manual/member_portal_readiness.sql", "utf8");
const migrationName = "20261019000000_member_portal.sql";

async function database(withBase = true) {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text,raw_user_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),current_user) $$;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
    CREATE PUBLICATION supabase_realtime;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
  `);
  if (withBase) {
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql") && n < migrationName)
      .sort()) {
      await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
    }
  }
  return db;
}
async function rejectsScript(db, sql, pattern) {
  await assert.rejects(db.exec(sql), pattern);
  await db.exec("ROLLBACK");
}

test("SQL Editor upgrade rejects a missing baseline without leaving schema changes", async () => {
  const db = await database(false);
  try {
    await rejectsScript(db, setup, /Earlier Beyond Medicine database migrations are missing/);
    assert.equal(
      (await db.query("select to_regclass('public.notifications') value")).rows[0].value,
      null,
    );
    assert.equal(
      (await db.query("select to_regclass('supabase_migrations.schema_migrations') value")).rows[0]
        .value,
      null,
    );
  } finally {
    await db.close();
  }
});
test("SQL Editor upgrade applies source SQL atomically, records history, and can be rerun", async () => {
  const db = await database();
  try {
    await db.exec(setup);
    assert.equal(
      (await db.query("select version,name from supabase_migrations.schema_migrations")).rows[0]
        .version,
      "20261019000000",
    );
    await db.exec("insert into auth.users(email) values ('deploy-test@example.org')");
    const before = (await db.query("select count(*)::int n from profiles")).rows[0].n;
    await db.exec(setup);
    assert.equal((await db.query("select count(*)::int n from profiles")).rows[0].n, before);
    assert.equal(
      (await db.query("select count(*)::int n from supabase_migrations.schema_migrations")).rows[0]
        .n,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select public.has_role('00000000-0000-0000-0000-000000000000'::uuid,'mentor') value",
        )
      ).rows[0].value,
      false,
    );
    await db.exec(report);
  } finally {
    await db.close();
  }
});
test("Upgrade refuses to guess when schema was applied without migration history", async () => {
  const db = await database();
  try {
    await db.exec(await readFile(`supabase/migrations/${migrationName}`, "utf8"));
    await rejectsScript(db, setup, /Portal objects already exist but migration/);
    assert.equal(
      (await db.query("select to_regclass('supabase_migrations.schema_migrations') value")).rows[0]
        .value,
      null,
    );
  } finally {
    await db.close();
  }
});
test("An error after schema changes rolls the entire manual upgrade back", async () => {
  const db = await database();
  try {
    await db.exec(`
      INSERT INTO auth.users(email) VALUES('existing-member@example.org');
      CREATE SCHEMA supabase_migrations;
      -- Simulate an incompatible existing history table so recording fails AFTER DDL.
      CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements integer);
    `);
    await rejectsScript(db, setup, /statements/);
    assert.equal(
      (await db.query("SELECT to_regclass('public.notifications') value")).rows[0].value,
      null,
    );
    assert.equal((await db.query("SELECT count(*)::int n FROM profiles")).rows[0].n, 1);
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM supabase_migrations.schema_migrations")).rows[0]
        .n,
      0,
    );
    assert.equal(
      (
        await db.query(
          "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='courses' AND column_name='cohort') value",
        )
      ).rows[0].value,
      false,
    );
  } finally {
    await db.close();
  }
});
test("Scheduler validates setup, uses secret references, updates one job, and reactivates it", async () => {
  const db = await database();
  try {
    await db.exec(setup);
    await rejectsScript(db, scheduler, /Enable pg_cron/);
    // Supabase-only integrations are mocked. No HTTP or real scheduler is used.
    await db.exec(`
      CREATE SCHEMA cron; CREATE SCHEMA net; CREATE SCHEMA vault;
      CREATE TABLE cron.job(jobid bigserial PRIMARY KEY,jobname text UNIQUE,schedule text,command text,active boolean DEFAULT true);
      CREATE FUNCTION cron.schedule(job_name text,job_schedule text,job_command text) RETURNS bigint LANGUAGE sql AS $$
       INSERT INTO cron.job(jobname,schedule,command) VALUES(job_name,job_schedule,job_command)
       ON CONFLICT(jobname) DO UPDATE SET schedule=excluded.schedule,command=excluded.command RETURNING jobid;
      $$;
      CREATE TABLE vault.test_secrets(name text PRIMARY KEY,value text);
      CREATE VIEW vault.decrypted_secrets AS SELECT name,value decrypted_secret FROM vault.test_secrets;
      CREATE TABLE net.test_requests(url text,body jsonb,headers jsonb);
      CREATE FUNCTION net.http_post(url text,body jsonb DEFAULT '{}',params jsonb DEFAULT '{}',headers jsonb DEFAULT '{}',timeout_milliseconds integer DEFAULT 5000) RETURNS bigint LANGUAGE plpgsql AS $$
       BEGIN INSERT INTO net.test_requests VALUES(url,body,headers); RETURN 1; END;
      $$;
    `);
    await rejectsScript(db, scheduler, /Create exactly one Vault secret/);
    await db.query(
      "insert into vault.test_secrets values ('portal_base_url',$1),('portal_notification_cron_secret',$2)",
      ["https://portal.example.org/path", "test-secret-that-is-long-enough-for-validation"],
    );
    await rejectsScript(db, scheduler, /HTTPS website origin/);
    await db.exec(
      "update vault.test_secrets set value='https://portal.example.org/' where name='portal_base_url'",
    );
    await db.exec(
      "update vault.test_secrets set value='short' where name='portal_notification_cron_secret'",
    );
    await rejectsScript(db, scheduler, /at least 32 characters/);
    const secret = "test-secret-that-is-long-enough-for-validation";
    await db.query(
      "update vault.test_secrets set value=$1 where name='portal_notification_cron_secret'",
      [secret],
    );
    await db.exec(scheduler);
    let job = (await db.query("select * from cron.job")).rows[0];
    assert.equal(job.schedule, "* * * * *");
    assert(!job.command.includes(secret));
    await db.exec("update cron.job set active=false");
    await db.exec(scheduler);
    const jobs = (await db.query("select * from cron.job")).rows;
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].active, true);
    // Execute against the local HTTP stub to verify URL and bearer header construction.
    await db.exec(jobs[0].command);
    const request = (await db.query("select * from net.test_requests")).rows[0];
    assert.equal(request.url, "https://portal.example.org/api/notifications/dispatch");
    assert.equal(request.headers.Authorization, `Bearer ${secret}`);
    await db.exec(report);
  } finally {
    await db.close();
  }
});
