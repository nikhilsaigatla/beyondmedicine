# Member portal deployment

The portal changes are implemented in source. This task does **not** apply migrations to a hosted database, deploy the app, configure a sender, or send test messages to members.

## Apply and deploy

1. Back up the hosted database and apply the existing migration chain plus `supabase/migrations/20261019000000_member_portal.sql` using your normal Supabase migration workflow. The migration creates private storage buckets, application stages, notifications, and database access policies. Existing approved members who selected Intermediate or Advanced receive an application automatically. It does not email every existing member retroactively.
2. Deploy the app with the server environment variables in `.env.example`. Keep all non-`VITE_` values server-only. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for server actions.
3. Set `PORTAL_BASE_URL` to the canonical HTTPS origin. Add `/auth` on that origin to Supabase Auth's redirect allowlist for officer account invitations.
4. Configure a verified official Beyond Medicine sender in Brevo and set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, and `BREVO_SMS_SENDER`. Enable transactional SMS and fund the SMS account. Sender requirements depend on the recipient country; configure the provider's registrations and suppression rules before enabling SMS in production. [Brevo transactional SMS documentation](https://developers.brevo.com/docs/transactional-sms-endpoints).
5. Generate **two different** long random secrets for `NOTIFICATION_SECRET` (signs unsubscribe links) and `NOTIFICATION_CRON_SECRET` (authenticates the scheduler). Keep the signing secret stable so existing unsubscribe links continue to work.

## Automatic delivery

Schedule an HTTPS **POST** to `/api/notifications/dispatch` every minute, with `Authorization: Bearer <NOTIFICATION_CRON_SECRET>`. Use your hosting scheduler or the optional SQL below. The worker queues reminders, claims a batch with `FOR UPDATE SKIP LOCKED`, and sends up to 40 deliveries in groups of five. New portal activity writes an in-app notification and both channel jobs in the same database transaction. Typical delivery latency is one scheduler interval, plus provider latency.

For Supabase Cron, enable `pg_cron`, `pg_net`, and Vault. Store secrets named `portal_base_url` and `portal_notification_cron_secret` in Vault, then run:

```sql
select cron.schedule('beyond-medicine-notifications', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='portal_base_url') || '/api/notifications/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='portal_notification_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
```

This follows [Supabase's Cron and Vault pattern](https://supabase.com/docs/guides/functions/schedule-functions). Do not put real secrets into repository SQL. Run one scheduler; database leases also protect against overlapping invocations. Check scheduler HTTP results and server logs during rollout.

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

Run `npm ci`, `npm run test:portal`, `npx tsc --noEmit`, and `npm run build`. Database tests apply **all** migrations to an isolated PostgreSQL WASM runtime, then check learner/mentor/officer access, private tickets, consent, event limits, interview conflicts, queue leases, and reminders. Utility tests cover calendar formats, signed unsubscribe tokens, and mocked provider delivery/retry behavior. No live provider calls are made by these tests.

Before rollout, verify a real approved mentor/mentee/officer trio against a staging Supabase project, including Storage uploads/downloads, Realtime, invitation redirects, and one email/SMS to consented test recipients. Local tests do not validate provider account approval or the hosted environment.
