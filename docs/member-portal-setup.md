# Member portal deployment

The portal changes are implemented in source. The scripts below have not been run on the hosted database. Pushing the website to GitHub/Vercel does **not** automatically run SQL against Supabase.

## Where to put the SQL

Keep these files in this repository. To run a manual script, open the Supabase project used by your app's `VITE_SUPABASE_URL`, choose **SQL Editor → New query**, paste the **entire file**, select the `postgres` role, and click **Run**. Run each file as a separate query. These scripts run in Supabase, not in Namecheap, Vercel's environment variable editor, or your `.env` file.

| Order | File                                                                                              | What it does                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [member_portal_setup.sql](../supabase/manual/member_portal_setup.sql)                             | Upgrades the existing Beyond Medicine database: tables, roles/access policies, triggers, RPCs, private file buckets, and migration tracking. |
| 2     | [member_portal_notifications_setup.sql](../supabase/manual/member_portal_notifications_setup.sql) | Enables the one-minute notification scheduler **after** the website, provider, extensions, and secrets are ready.                            |
| 3     | [member_portal_readiness.sql](../supabase/manual/member_portal_readiness.sql)                     | Reports table/RLS, bucket, function, extension, migration, scheduler, and queue status without sending messages or changing data.            |

Step 1 is an upgrade for an **existing Beyond Medicine database** with the earlier migrations installed. It is not an installer for a blank database. It checks prerequisites, applies the original portal migration in one transaction, and records version `20261019000000` only when successful. Rerunning it skips a recorded upgrade and preserves existing member records. Missing prerequisites or an ambiguous partial/untracked deployment cause an explanatory error and rollback. Do not run both the raw migration and the SQL Editor upgrade on the same database.

The SQL Editor upgrade is generated from the migration to avoid maintaining two different schemas. If the source migration changes, run `npm run sql:portal` and commit the updated generated file. `npm run test:portal` checks that they match.

### If the upgrade says portal objects already exist

This usually means the raw migration was pasted into SQL Editor earlier, without recording its version. Run the readiness report and inspect the actual schema first. If the full migration was successfully applied, link the CLI to the same project and record it using:

```sh
npx supabase migration list
npx supabase migration repair 20261019000000 --status applied
```

`migration repair` updates history only; it does not install missing objects. Do not use it to bypass an incomplete migration. The manual upgrade records only this portal version; reconcile any older manually applied migrations separately before using CLI deployment. [Supabase migration history guidance](https://supabase.com/docs/guides/deployment/database-migrations).

### CLI deployment alternative

If you already use Supabase migrations, keep using that workflow instead of manually pasting the upgrade:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Use the project ref from the Supabase project matching your app's URL. Review the dry run before applying; it lists the pending migrations. This applies the original files in `supabase/migrations` in order, including the portal migration. Run the manual scheduler separately after deployment. Avoid `db reset` against a hosted database.

## Apply and deploy

1. Back up the hosted database and apply the portal upgrade using **one** of the workflows above. Existing approved members who selected Intermediate or Advanced receive an application automatically. The upgrade does not email every existing member retroactively.
2. Deploy the app with the server environment variables in `.env.example`. Keep all non-`VITE_` values server-only. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for server actions.
3. Set `PORTAL_BASE_URL` to the canonical HTTPS origin. Add `/auth` and `/auth?redirect=/portal/settings` on that origin to Supabase Auth's redirect allowlist for officer account invitations.
4. Configure a verified official Beyond Medicine sender in Brevo and set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, and `BREVO_SMS_SENDER`. Enable transactional SMS and fund the SMS account. Sender requirements depend on the recipient country; configure the provider's registrations and suppression rules before enabling SMS in production. [Brevo transactional SMS documentation](https://developers.brevo.com/docs/transactional-sms-endpoints).
5. Generate **two different** long random secrets for `NOTIFICATION_SECRET` (signs unsubscribe links) and `NOTIFICATION_CRON_SECRET` (authenticates the scheduler). Keep the signing secret stable so existing unsubscribe links continue to work.

## Automatic delivery

The worker queues reminders, claims a batch with `FOR UPDATE SKIP LOCKED`, and sends up to 40 deliveries in groups of five. New portal activity writes an in-app notification and both channel jobs in the same database transaction. Typical delivery latency is one scheduler interval, plus provider latency.

After the deployed website has its server environment variables configured:

1. In Supabase, enable `pg_cron` under **Integrations → Cron**. Enable `pg_net` under Database Extensions and make sure **Vault** is available.
2. Open **Vault** in the Supabase dashboard and create the entries below. Use Vault's UI to keep real secrets out of saved repository SQL.

| Vault entry name                  | Value                                                                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `portal_base_url`                 | Your deployed HTTPS origin, matching Vercel's `PORTAL_BASE_URL` (for example `https://beyond-medicine.org`). This is the website URL, not the `.supabase.co` project URL.                        |
| `portal_notification_cron_secret` | Exactly the same random value as `NOTIFICATION_CRON_SECRET` in Vercel's server environment. Use at least 32 random characters. This is different from `NOTIFICATION_SECRET` and `BREVO_API_KEY`. |

3. Run the entire [notification scheduler script](../supabase/manual/member_portal_notifications_setup.sql) in **SQL Editor → New query** as `postgres`. This step **activates** processing of queued notifications and can send email/SMS. It validates prerequisites and updates the same named job on rerun. The database keeps secret references in the job, not literal credentials.
4. Wait for the next minute, then inspect **Integrations → Cron → beyond-medicine-notifications → History**. A successful Cron run means the HTTP request was queued; check the HTTP response and worker result too.

```sql
-- Recent HTTP responses (typically retained for a limited period by pg_net).
select id, status_code, timed_out, error_msg, created
from net._http_response
order by created desc limit 10;
```

Expect HTTP `200` from the worker. `401` means the cron secret does not match the deployed server. `404` means the route/URL is not deployed correctly. `500` needs investigation in Vercel's server logs. Also inspect the `sent`, `skipped`, and `failed` counters in the response: HTTP `200` alone does not mean every provider send succeeded. Deployment protection or a redirect to a login page must be resolved before Cron can reach the endpoint.

To pause processing, toggle the named Cron job inactive in Supabase, or run:

```sql
update cron.job set active=false where jobname='beyond-medicine-notifications';
```

An alternative hosting scheduler can send the same authenticated HTTPS POST every minute. Use only one scheduler. This follows [Supabase's Cron and Vault pattern](https://supabase.com/docs/guides/functions/schedule-functions). The hosted Cron, Vault, and HTTP extension behavior still needs a staging check; local tests use stubs and do not send real requests.

## Preferences and delivery behavior

- Email defaults on; SMS defaults off. Signup and registration explicitly request optional SMS consent, with an international phone number. Settings record consent time and allow channel/category changes. The worker checks the latest preferences and account status before each delivery, including retries.
- Every delivered email includes a signed unsubscribe URL, one-click unsubscribe headers, and a settings link. SMS includes a signed opt-out URL. GET displays confirmation; POST performs the unsubscribe. Retain provider suppression lists and honor direct opt-out requests through member settings.
- Portal links contain resource IDs, never access tokens or message text. The user must authenticate; database policies enforce access. Notification email/SMS for private conversations does not include message contents.
- Retries use exponential backoff, with six attempts before `failed`. Leases expire after ten minutes if a worker crashes. Delivery is at least once: a provider may accept a send immediately before a network failure or before the result can be recorded, so duplicate delivery remains possible in that failure window.
- Reminders run once per recipient, scheduled time, and interval. Default reminders start one day before a deadline or event. Events support an additional configurable interval. Registration confirmations and schedule/cancellation updates are independent of calendar exports. Times display locally in the portal; stored times and exports use UTC.
- Event capacity and interview booking are enforced transactionally. Reviewers enter confirmed joint availability; overlapping reviewer slots are rejected. The app does not read private external calendars. Google/Outlook links and Apple `.ics` downloads require member action; exported files do not subscribe to future changes.

Monitor queue health through a trusted SQL session:

```sql
select channel, status, count(*) from public.notification_deliveries group by channel, status;
select id, channel, attempts, last_error from public.notification_deliveries where status='failed';
```

After fixing a provider problem, retry specific failed delivery IDs by updating their status to `pending`, attempts to `0`, and available_at to `now()`. Avoid resetting successful deliveries.

## Program operation

- Officers use Administration to invite/edit/deactivate members and assign roles. Courses includes course/cohort editing, mentor assignment, enrollment, and atomic moves. Existing member role hierarchy remains enforced.
- Mentors use their course workspace to create drafts, publish/hide/remove assignments, edit instructions/deadlines/resources/submission requirements, review files, and grade work. Course discussions, announcements, and resources are restricted to course participants. Mentors schedule course sessions through Events.
- Members use Courses for work and feedback, Messages for direct/group chats, and Beyond Medicine Help Desk for private officer questions. Officers can resolve, escalate, or assign tickets to other authorized officers. Ticket contents are not exposed to ordinary mentors or other members.
- Approved Intermediate/Advanced applicants receive a dashboard card. They save and submit a portfolio; officers invite them to schedule an interview. Booking requires a real available slot. Assigned interview reviewers can view that applicant's portfolio; final decisions and course placement remain with officers.

## Validation

Run `npm ci`, `npm run test:portal`, `npx tsc --noEmit`, and `npm run build`. Database tests apply **all** migrations to an isolated PostgreSQL WASM runtime, then check learner/mentor/officer access, private tickets, consent, event limits, interview conflicts, queue leases, and reminders. Deployment tests also exercise the generated SQL Editor upgrade, rollback/idempotency/history checks, and scheduler setup with local integration stubs. Utility tests cover calendar formats, signed unsubscribe tokens, and mocked provider delivery/retry behavior. No live provider calls are made by these tests.

Before rollout, verify a real approved mentor/mentee/officer trio against a staging Supabase project, including Storage uploads/downloads, Realtime, invitation redirects, and one email/SMS to consented test recipients. Local tests do not validate provider account approval or the hosted environment.
